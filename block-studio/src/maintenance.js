/* Authoring-only safeguards for maintaining already exported modules. */
(function (root) {
  'use strict';
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function baseline(module) {
    return copy({
      id: module.id,
      slug: module.slug,
      release: module.release,
      fields: module.fields,
    });
  }
  function recordExport(project, definitions) {
    for (const definition of definitions) {
      const module = project.modules.find((m) => m.id === definition.id);
      if (!module) continue;
      module.published = baseline(definition);
      module.exportedDefinition = copy(definition);
    }
  }
  function png(value) {
    return (
      typeof value === 'string' &&
      value.length <= 2800000 &&
      value.startsWith('iVBORw0KGgo') &&
      value.length % 4 === 0 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(value)
    );
  }
  function issues(module) {
    const errors = [],
      add = (message, target, fieldId) => errors.push({ message, target, fieldId });
    if (module.iconAssets && (!png(module.iconAssets.icon) || !png(module.iconAssets.dragIcon)))
      add(
        'The saved icon pair is invalid. Reopen the repository or choose a generated icon.',
        'icon',
      );
    const old = module.published;
    if (!old) return errors;
    if (
      !Array.isArray(old.fields) ||
      typeof old.id !== 'string' ||
      typeof old.slug !== 'string' ||
      typeof old.release !== 'string'
    ) {
      add('The saved publishing reference is invalid. Reopen the repository.', 'repository');
      return errors;
    }
    if (old.id !== module.id || old.slug !== module.slug || old.release !== module.release)
      add(
        'Keep the registered module identity, folder and version for maintenance. Use Module actions → Duplicate for a new version.',
        old.release !== module.release ? 'version' : 'folder',
      );
    function compare(before, after, parentId) {
      for (const f of before.filter((f) => f.enabled !== false)) {
        const n = after.find(
          (n) => (parentId ? n.key === f.key : n.id === f.id) && n.enabled !== false,
        );
        const fieldId = parentId || f.id;
        const problem = (message) => add(message, parentId || n ? 'field' : 'fields', fieldId);
        if (!n || n.type !== f.type) {
          problem(
            'Existing saved values for “' + f.label + '” would lose their field or change type.',
          );
          continue;
        }
        if (
          (!f.required && n.required) ||
          (n.maxLength > 0 && (!(f.maxLength > 0) || n.maxLength < f.maxLength))
        )
          problem('Tighter validation for “' + f.label + '” could reject saved content.');
        if (
          f.type === 'select' &&
          (f.options || []).some((o) => !(n.options || []).some((v) => v.value === o.value))
        )
          problem('Removing an option from “' + f.label + '” could reject a saved choice.');
        if (f.type === 'list') {
          if ((n.minItems ?? 0) > (f.minItems ?? 0) || (n.maxItems ?? 50) < (f.maxItems ?? 50))
            problem('Tighter item limits for “' + f.label + '” could reject saved items.');
          compare(f.itemFields || [], n.itemFields || [], fieldId);
        }
      }
    }
    compare(old.fields, module.fields);
    if (errors.some((e) => e.target === 'field' || e.target === 'fields'))
      add(
        'Duplicate this module into a new endpoint for incompatible field changes. HTML/CSS fixes, labels and starting content can be updated in place.',
        'fields',
      );
    return errors;
  }
  function problems(module) {
    return issues(module).map((issue) => issue.message);
  }
  // Prepare all replacements on a copy so one invalid/conflicting project cannot partially import a repository.
  function importBatch(workspace, projects, W) {
    const next = copy(workspace),
      seen = new Set();
    for (const input of projects) {
      const p = W.normalise(copy(input)),
        path = W.path(p);
      if (!path || seen.has(path))
        throw Error('The repository contains duplicate or invalid template folders.');
      seen.add(path);
      const conflict = W.importConflict(next, p);
      W.importProject(next, p, conflict?.projectId);
    }
    const urls = [
      ...new Set(
        projects
          .map((p) => p.settings?.baseUrl)
          .filter(Boolean)
          .map(W.repositoryURL),
      ),
    ];
    if (!next.repository.baseUrl && urls.length === 1) next.repository.baseUrl = urls[0];
    return W.validate(next);
  }
  // Only parse embedded JSON. Imported module pages are never executed.
  async function readRepository(files, W) {
    const entries = [...files].filter(
      (f) => !f.webkitRelativePath?.split('/').some((p) => p.startsWith('.')),
    );
    const names = entries.map((f) => [f.webkitRelativePath || f.name, f]);
    const projects = [];
    for (const [name, file] of names) {
      const match = name.match(/^(.*\/)projects\/([a-z0-9-]+)\/([a-z0-9-]+)\.jarrang\.json$/);
      if (!match) continue;
      if (file.size > 20000000) throw Error('A template file is larger than 20 MB.');
      const p = W.normalise(JSON.parse(await file.text()));
      if (p.settings.clientSlug !== match[2] || p.settings.templateSlug !== match[3])
        throw Error('Template folders do not match ' + name + '.');
      for (const m of p.modules) {
        const expected = m.exportedDefinition || m;
        const publishedSlug = m.exportedDefinition?.slug || m.published?.slug || m.slug;
        if (![m.slug, publishedSlug].every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))
          throw Error('Invalid module folder.');
        const base = match[1] + 'docs/' + W.path(p) + '/modules/' + publishedSlug + '/';
        const page = names.find(([n]) => n === base + 'index.html')?.[1];
        if (!page) {
          if (m.exportedDefinition || m.published)
            throw Error(
              m.name +
                ': missing exported page. Restore the published files before reopening the repository.',
            );
          continue; // New draft modules need not have an exported page yet.
        }
        if (page.size > 4000000) throw Error('The exported module page is too large.');
        const definition = (await page.text()).match(
          /<script\b[^>]*\bid=["']block-definition["'][^>]*>([\s\S]*?)<\/script>/i,
        );
        if (!definition) throw Error(m.name + ': no editable definition in its exported page.');
        const d = JSON.parse(definition[1]);
        if (expected.id !== m.id)
          throw Error(m.name + ': the exported reference has a different module identity.');
        for (const key of ['id', 'name', 'slug', 'release', 'source', 'fields'])
          if (JSON.stringify(d[key]) !== JSON.stringify(expected[key]))
            throw Error(
              m.name +
                ': the project and exported page differ (' +
                key +
                '). Reconcile them before importing.',
            );
        if (
          !!d.templateMode !== !!expected.templateMode ||
          (d.contextCss || '') !== (expected.contextCss || '')
        )
          throw Error(m.name + ': preview or template settings differ from its exported page.');
        const expectedTheme = m.exportedDefinition
          ? expected.editorTheme
          : Object.hasOwn(p.settings, 'editorTheme')
            ? p.settings.editorTheme
            : m.editorTheme;
        if (JSON.stringify(d.editorTheme || null) !== JSON.stringify(expectedTheme || null))
          throw Error(m.name + ': editor colours differ from its exported page.');
        const expectedHeader = m.exportedDefinition
          ? expected.showEditorHeader !== false
          : p.settings.showEditorHeader !== false;
        if ((d.showEditorHeader !== false) !== expectedHeader)
          throw Error(m.name + ': editor header setting differs from its exported page.');
        const pair = {};
        for (const [key, filename] of [
          ['icon', 'icon.png'],
          ['dragIcon', 'dragIcon.png'],
        ]) {
          const image = names.find(([n]) => n === base + filename)?.[1];
          if (!image || image.size > 2000000)
            throw Error(m.name + ': missing or oversized ' + filename + '.');
          const bytes = new Uint8Array(await image.arrayBuffer());
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192)
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          pair[key] = btoa(binary);
          if (!png(pair[key])) throw Error(m.name + ': invalid ' + filename + '.');
        }
        if (!m.exportedDefinition) m.iconAssets = pair;
        m.published = baseline(d);
        m.exportedDefinition = copy(d);
      }
      projects.push(p);
    }
    if (!projects.length)
      throw Error('Choose the repository folder containing projects/ and docs/.');
    return projects;
  }
  root.BlockMaintenance = {
    baseline,
    recordExport,
    png,
    issues,
    problems,
    importBatch,
    readRepository,
  };
})(typeof window === 'object' ? window : globalThis);
