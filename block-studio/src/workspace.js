(function () {
  'use strict';
  const C = window.BlockCore,
    FORMAT = 'jarrang-block-studio-workspace',
    KEY = 'jarrang-block-studio-workspace-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = () =>
    globalThis.crypto?.randomUUID?.() ||
    'p' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const validSlug = (value) =>
    typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
  function normalise(project) {
    C.assertProject(project);
    for (const m of project.modules) {
      if (m.draftSource === undefined) m.draftSource = m.source;
      if (typeof m.draftSource !== 'string' || m.draftSource.length > 2000000)
        throw Error('Invalid draft HTML in ' + m.name + '.');
    }
    project.settings ||= {};
    if (typeof project.settings !== 'object' || Array.isArray(project.settings))
      throw Error('Invalid template settings.');
    for (const key of ['name', 'clientName', 'clientSlug', 'templateSlug', 'baseUrl'])
      if (project.settings[key] !== undefined && typeof project.settings[key] !== 'string')
        throw Error('Invalid template ' + key + '.');
    if (
      (project.settings.clientSlug !== undefined || project.settings.templateSlug !== undefined) &&
      (!validSlug(project.settings.clientSlug) || !validSlug(project.settings.templateSlug))
    )
      throw Error('The imported template has invalid publishing folders.');
    project.projectId =
      typeof project.projectId === 'string' && project.projectId ? project.projectId : id();
    return project;
  }
  function path(project) {
    const s = project.settings || {};
    return validSlug(s.clientSlug) && validSlug(s.templateSlug)
      ? 'clients/' + s.clientSlug + '/' + s.templateSlug
      : null;
  }
  function create(initial) {
    const project = normalise(clone(initial));
    return {
      format: FORMAT,
      version: 1,
      activeId: project.projectId,
      repository: { baseUrl: '' },
      projects: [project],
    };
  }
  function validate(workspace) {
    if (
      workspace?.format !== FORMAT ||
      workspace.version !== 1 ||
      !Array.isArray(workspace.projects) ||
      !workspace.projects.length
    )
      throw Error('Invalid workspace. Import a saved template to recover your work.');
    const ids = new Set(),
      paths = new Set();
    workspace.projects.forEach((p) => {
      normalise(p);
      if (ids.has(p.projectId)) throw Error('Duplicate template identity.');
      ids.add(p.projectId);
      const target = path(p);
      if (target && paths.has(target)) throw Error('Two templates use the same publishing folder.');
      if (target) paths.add(target);
    });
    if (!ids.has(workspace.activeId)) workspace.activeId = workspace.projects[0].projectId;
    if (
      !workspace.repository ||
      typeof workspace.repository !== 'object' ||
      Array.isArray(workspace.repository)
    )
      workspace.repository = { baseUrl: '' };
    workspace.repository.baseUrl = repositoryURL(
      typeof workspace.repository.baseUrl === 'string' ? workspace.repository.baseUrl : '',
    );
    return workspace;
  }
  function naming(workspace, project, clientName, name) {
    clientName = clientName.trim();
    name = name.trim();
    if (!clientName || !name) throw Error('Enter a client and template name.');
    if (clientName.length > 100 || name.length > 100)
      throw Error('Keep names to 100 characters or fewer.');
    const existing = workspace.projects.find(
      (p) =>
        p.projectId !== project.projectId &&
        p.settings.clientName?.toLowerCase() === clientName.toLowerCase() &&
        path(p),
    );
    if (existing) clientName = existing.settings.clientName;
    const clientSlug =
      project.settings.clientSlug ||
      existing?.settings.clientSlug ||
      C.slug(clientName).slice(0, 80).replace(/-$/, '');
    const templateSlug =
      project.settings.templateSlug || C.slug(name).slice(0, 80).replace(/-$/, '');
    if (!validSlug(clientSlug) || !validSlug(templateSlug))
      throw Error('Use a name containing letters or numbers.');
    if (
      workspace.projects.some(
        (p) =>
          p.projectId !== project.projectId &&
          p.settings.clientSlug === clientSlug &&
          p.settings.clientName?.toLowerCase() !== clientName.toLowerCase(),
      )
    )
      throw Error(
        'This client name uses an existing client folder. Choose that client’s existing name.',
      );
    if (
      workspace.projects.some(
        (p) =>
          p.projectId !== project.projectId &&
          path(p) === 'clients/' + clientSlug + '/' + templateSlug,
      )
    )
      throw Error(
        'That client already has a template with this folder name. Choose a different template name.',
      );
    return {
      ...project.settings,
      name,
      clientName,
      clientSlug,
      templateSlug,
      location: 'docs',
    };
  }
  function importConflict(workspace, project) {
    const matches = workspace.projects.filter(
      (p) => p.projectId === project.projectId || (path(project) && path(p) === path(project)),
    );
    if (matches.length > 1)
      throw Error(
        'This file’s identity and publishing folder match different templates. Import cancelled to protect both drafts.',
      );
    return matches[0];
  }
  function importProject(workspace, project, replaceId) {
    project = normalise(clone(project));
    const conflict = importConflict(workspace, project);
    if (conflict && conflict.projectId !== replaceId)
      throw Error('Confirm replacement before importing this template.');
    if (
      workspace.projects.some((p) => p !== conflict && path(project) && path(p) === path(project))
    )
      throw Error('The imported template would overwrite another template’s publishing folder.');
    if (conflict) {
      project.projectId = conflict.projectId;
      workspace.projects[workspace.projects.indexOf(conflict)] = project;
    } else workspace.projects.push(project);
    workspace.activeId = project.projectId;
    return project;
  }
  function repositoryURL(value) {
    value = value.trim().replace(/\/+$/, '');
    if (!value) return '';
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password)
      throw Error('Enter an https Pages site URL without a query, fragment or credentials.');
    return url.href.replace(/\/+$/, '');
  }
  function save(storage, workspace, expected) {
    if (storage.getItem(KEY) !== expected)
      throw Error(
        'Another tab has changed the saved workspace. Save your current template file, then reload before continuing.',
      );
    const value = JSON.stringify(workspace);
    storage.setItem(KEY, value);
    return value;
  }
  window.BlockWorkspace = {
    KEY,
    save,
    create,
    validate,
    normalise,
    path,
    naming,
    importConflict,
    importProject,
    repositoryURL,
    id,
  };
})();
