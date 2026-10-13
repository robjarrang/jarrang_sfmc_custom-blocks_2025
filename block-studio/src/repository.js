/* Authoring-only local repository access. No Git operations or SFMC runtime dependency. */
(function (root) {
  'use strict';
  const equal = (a, b) =>
    a === b || (!!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]));
  function parts(path) {
    const names = path.split('/');
    if (names.some((n) => !n || n === '.' || n === '..' || /[\\\u0000-\u001f]/.test(n)))
      throw Error('Invalid repository path.');
    if (!(
      path.startsWith('projects/') ||
      path.startsWith('docs/clients/') ||
      path.startsWith('docs/shared-assets/') ||
      path === 'docs/.nojekyll' ||
      path === 'BOOTSTRAP-ICONS-LICENSE.txt'
    ))
      throw Error('Studio cannot write outside its project and block folders.');
    return names;
  }
  async function parent(handle, path, create = false) {
    const names = parts(path),
      name = names.pop();
    for (const part of names) handle = await handle.getDirectoryHandle(part, { create });
    return { handle, name };
  }
  async function read(handle, path) {
    try {
      const p = await parent(handle, path);
      return new Uint8Array(
        await (await (await p.handle.getFileHandle(p.name)).getFile()).arrayBuffer(),
      );
    } catch (e) {
      if (e.name === 'NotFoundError') return null;
      throw e;
    }
  }
  async function write(handle, path, bytes) {
    const p = await parent(handle, path, true);
    const file = await p.handle.getFileHandle(p.name, { create: true });
    const stream = await file.createWritable();
    try {
      await stream.write(bytes);
      await stream.close();
    } catch (error) {
      try {
        await stream.abort();
      } catch {}
      throw error;
    }
  }
  async function scan(handle) {
    const files = [],
      snapshot = new Map();
    let total = 0;
    async function walk(dir, prefix) {
      for await (const [name, child] of dir.entries()) {
        const path = prefix + name;
        if (child.kind === 'directory') {
          if (name.startsWith('.') || path === 'docs/studio') continue;
          await walk(child, path + '/');
        } else {
          if (!(
            path.startsWith('projects/') ||
            path.startsWith('docs/clients/') ||
            path.startsWith('docs/shared-assets/') ||
            path === 'docs/.nojekyll'
          ))
            continue;
          const f = await child.getFile();
          total += f.size;
          if (total > 150000000 || files.length > 10000)
            throw Error('This repository is too large to open in Studio.');
          const bytes = new Uint8Array(await f.arrayBuffer());
          snapshot.set(path, bytes);
          files.push({
            name,
            webkitRelativePath: 'repository/' + path,
            size: bytes.length,
            text: async () => new TextDecoder().decode(bytes),
            arrayBuffer: async () => bytes.slice().buffer,
          });
        }
      }
    }
    for (const name of ['projects', 'docs'])
      await walk(await handle.getDirectoryHandle(name), name + '/');
    snapshot.set('BOOTSTRAP-ICONS-LICENSE.txt', await read(handle, 'BOOTSTRAP-ICONS-LICENSE.txt'));
    return { files, snapshot };
  }
  async function connect(handle) {
    const scanned = await scan(handle);
    let busy = false,
      blocked = false;
    const baseline = scanned.snapshot;
    return {
      handle,
      name: handle.name,
      files: scanned.files,
      async save(entries, scope) {
        if (busy) throw Error('A repository save is already running.');
        if (blocked) throw Error('Reopen the repository before saving again.');
        busy = true;
        const written = [],
          originals = new Map();
        try {
          if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted')
            throw Error('Write access was not granted. No files were saved.');
          const projectPath =
            'projects/' + scope.clientSlug + '/' + scope.templateSlug + '.jarrang.json';
          const prefix = 'docs/clients/' + scope.clientSlug + '/' + scope.templateSlug + '/';
          const current = (await scan(handle)).snapshot;
          // Compare every file of this template, including additions and deletions after a pull.
          const checked = new Set(
            [...baseline.keys(), ...current.keys()].filter(
              (p) => p === projectPath || p.startsWith(prefix),
            ),
          );
          for (const [path, bytes] of entries) {
            parts(path);
            if (!(bytes instanceof Uint8Array)) throw Error('Invalid file content.');
            if (!(
              path.startsWith(prefix) ||
              path === projectPath ||
              path === projectPath.replace('.jarrang.json', '-PUBLISHING.md') ||
              path.startsWith('docs/shared-assets/') ||
              path === 'docs/.nojekyll' ||
              path === 'BOOTSTRAP-ICONS-LICENSE.txt'
            ))
              throw Error('The save contains a different template.');
            checked.add(path);
            if (
              path.startsWith('docs/shared-assets/') &&
              current.get(path) &&
              !equal(current.get(path), bytes)
            )
              throw Error(
                'An existing runtime asset differs. Studio will not overwrite it: ' + path,
              );
          }
          for (const path of checked) {
            if (!equal(baseline.get(path) || null, current.get(path) || null))
              throw Error(
                'Files changed outside Studio: ' +
                  path +
                  '. Reopen the repository to load the latest version. Your browser draft has been kept.',
              );
          }
          for (const [path, bytes] of entries) {
            const original = current.get(path) || null;
            originals.set(path, original);
            if (equal(original, bytes)) continue;
            if (!equal(await read(handle, path), original))
              throw Error('File changed during save: ' + path);
            // Include the attempted write: creating a new file may succeed before writing fails.
            const attempt = { path, bytes, completed: false };
            written.push(attempt);
            await write(handle, path, bytes);
            attempt.completed = true;
          }
          for (const [path, bytes] of entries) {
            if (!equal(await read(handle, path), bytes))
              throw Error('File verification failed: ' + path);
          }
          for (const [path, bytes] of entries) baseline.set(path, bytes.slice());
          return written.length;
        } catch (error) {
          if (written.length) {
            blocked = true;
            let restored = true;
            for (const { path, bytes: attempted, completed } of written.reverse()) {
              try {
                const existing = await read(handle, path),
                  original = originals.get(path);
                if (equal(existing, original)) continue;
                // Do not undo another application's intervening edit.
                // Only a failed first write can leave an empty file created by Studio.
                // Empty edits or deletions after a completed write belong to someone else.
                const emptyCreation = original === null && !completed && existing?.length === 0;
                if (!equal(existing, attempted) && !emptyCreation) {
                  restored = false;
                  continue;
                }
                if (original) await write(handle, path, original);
                else {
                  const p = await parent(handle, path);
                  await p.handle.removeEntry(p.name);
                }
              } catch {
                restored = false;
              }
            }
            throw Error(
              error.message +
                (restored
                  ? ' Previous file contents restored. Reopen the repository before retrying.'
                  : ' Some files could not be restored. Check changes in Tower before committing; reopen the repository after recovery.'),
            );
          }
          throw error;
        } finally {
          busy = false;
        }
      },
    };
  }
  // Folder handles can be remembered; permission is still checked on each connection.
  async function remembered(value) {
    if (!root.indexedDB) return null;
    return new Promise((resolve) => {
      const request = root.indexedDB.open('jarrang-studio-repository', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('handles');
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction('handles', value ? 'readwrite' : 'readonly');
          const op = value
            ? tx.objectStore('handles').put(value, 'repository')
            : tx.objectStore('handles').get('repository');
          let result = null;
          op.onsuccess = () => {
            result = value || op.result || null;
          };
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
    });
  }
  root.BlockRepository = { connect, remembered };
})(typeof window === 'object' ? window : globalThis);
