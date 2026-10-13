const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/repository.js');
const R = globalThis.BlockRepository;
const bytes = (s) => new TextEncoder().encode(s);
const scope = { clientSlug: 'esc', templateSlug: 'newsletter' };
const project = 'projects/esc/newsletter.jarrang.json';
const page = 'docs/clients/esc/newsletter/modules/hero/index.html';
function filesystem(seed = {}) {
  const data = new Map(Object.entries(seed).map(([p, s]) => [p, bytes(s)]));
  const dirs = new Set(['projects', 'docs']);
  for (const p of data.keys()) {
    const names = p.split('/');
    names.pop();
    while (names.length) {
      dirs.add(names.join('/'));
      names.pop();
    }
  }
  const state = { denied: false, fail: null, writes: [], data };
  const missing = () => Object.assign(Error('Missing'), { name: 'NotFoundError' });
  function dir(path = '') {
    return {
      kind: 'directory',
      name: path.split('/').pop() || 'blocks',
      async requestPermission() {
        return state.denied ? 'denied' : 'granted';
      },
      async getDirectoryHandle(name, { create = false } = {}) {
        const p = path ? path + '/' + name : name;
        if (!dirs.has(p) && !create) throw missing();
        dirs.add(p);
        return dir(p);
      },
      async getFileHandle(name, { create = false } = {}) {
        const p = path ? path + '/' + name : name;
        if (!data.has(p)) {
          if (!create) throw missing();
          data.set(p, new Uint8Array());
        }
        return file(p);
      },
      async removeEntry(name) {
        data.delete(path ? path + '/' + name : name);
      },
      async *entries() {
        const prefix = path ? path + '/' : '';
        for (const p of [...dirs])
          if (
            p.startsWith(prefix) &&
            p.slice(prefix.length) &&
            !p.slice(prefix.length).includes('/')
          )
            yield [p.slice(prefix.length), dir(p)];
        for (const p of [...data.keys()])
          if (p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
            yield [p.slice(prefix.length), file(p)];
      },
    };
  }
  function file(path) {
    return {
      kind: 'file',
      name: path.split('/').pop(),
      async getFile() {
        const b = data.get(path).slice();
        return { size: b.length, arrayBuffer: async () => b.buffer };
      },
      async createWritable() {
        let pending;
        return {
          async write(b) {
            if (state.fail === path) {
              state.fail = null;
              state.onFailure?.();
              throw Error('Disk full');
            }
            pending = b.slice();
          },
          async close() {
            data.set(path, pending);
            state.writes.push(path);
          },
          async abort() {},
        };
      },
    };
  }
  return { handle: dir(), state };
}
const entries = () =>
  new Map([
    [page, bytes('new page')],
    [project, bytes('new project')],
  ]);
test('repository save updates intended files, skips identical bytes and can save again', async () => {
  const { handle, state } = filesystem({
    [page]: 'old page',
    [project]: 'old project',
    'docs/clients/other/template/index.html': 'keep',
  });
  const connection = await R.connect(handle);
  assert.equal(await connection.save(entries(), scope), 2);
  assert.equal(await connection.save(entries(), scope), 0);
  assert.equal(state.writes.length, 2);
  assert.equal(
    new TextDecoder().decode(state.data.get('docs/clients/other/template/index.html')),
    'keep',
  );
});
test('external modifications, deletions and new module files block every write', async () => {
  for (const change of ['modify', 'delete', 'add']) {
    const { handle, state } = filesystem({ [page]: 'old', [project]: 'old' });
    const connection = await R.connect(handle);
    if (change === 'modify') state.data.set(project, bytes('from Tower'));
    if (change === 'delete') state.data.delete(page);
    if (change === 'add') state.data.set(page.replace('index.html', 'extra.html'), bytes('added'));
    await assert.rejects(connection.save(entries(), scope), /changed outside Studio/);
    assert.equal(state.writes.length, 0);
  }
});
test('permission refusal leaves files untouched', async () => {
  const { handle, state } = filesystem({ [project]: 'old' });
  const connection = await R.connect(handle);
  state.denied = true;
  await assert.rejects(connection.save(entries(), scope), /not granted/);
  assert.equal(state.writes.length, 0);
});
test('failed multi-file save restores old files and removes newly created files', async () => {
  const { handle, state } = filesystem({ [project]: 'old project' });
  const connection = await R.connect(handle);
  state.fail = project;
  await assert.rejects(connection.save(entries(), scope), /Previous file contents restored/);
  assert.equal(state.data.has(page), false);
  assert.equal(new TextDecoder().decode(state.data.get(project)), 'old project');
  await assert.rejects(connection.save(entries(), scope), /Reopen/);
});
test('runtime collisions and path traversal are rejected before writing', async () => {
  const asset = 'docs/shared-assets/runtime-old/runtime.bundle.js';
  const { handle, state } = filesystem({ [asset]: 'original' });
  const connection = await R.connect(handle);
  for (const path of [
    asset,
    'docs/clients/esc/../other/file',
    'block-studio/app.js',
    'docs/clients/other/template/index.html',
  ]) {
    await assert.rejects(connection.save(new Map([[path, bytes('different')]]), scope));
  }
  assert.equal(state.writes.length, 0);
});
test('simultaneous saves cannot interleave writes', async () => {
  const { handle } = filesystem({ [page]: 'old', [project]: 'old' });
  const connection = await R.connect(handle);
  const first = connection.save(entries(), scope);
  await assert.rejects(connection.save(entries(), scope), /already running/);
  await first;
});

test('rollback preserves an external empty edit or deletion after an earlier write', async () => {
  for (const change of ['empty', 'delete']) {
    const { handle, state } = filesystem({ [page]: 'old page', [project]: 'old project' });
    const connection = await R.connect(handle);
    state.fail = project;
    state.onFailure = () => {
      if (change === 'empty') state.data.set(page, bytes(''));
      else state.data.delete(page);
    };
    await assert.rejects(connection.save(entries(), scope), /Some files could not be restored/);
    assert.equal(state.data.has(page), change === 'empty');
    if (change === 'empty') assert.equal(state.data.get(page).length, 0);
    assert.equal(new TextDecoder().decode(state.data.get(project)), 'old project');
    await assert.rejects(connection.save(entries(), scope), /Reopen/);
  }
});

test('a newly created empty file is removed when its first write fails', async () => {
  const { handle, state } = filesystem({ [project]: 'old project' });
  const connection = await R.connect(handle);
  state.fail = page;
  await assert.rejects(connection.save(entries(), scope), /Previous file contents restored/);
  assert.equal(state.data.has(page), false);
  assert.equal(new TextDecoder().decode(state.data.get(project)), 'old project');
});
