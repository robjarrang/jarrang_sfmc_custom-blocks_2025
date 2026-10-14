(function () {
  'use strict';
  const C = window.BlockCore,
    E = window.BlockExport,
    $ = (id) => document.getElementById(id),
    key = 'jarrang-block-studio-v1';
  const sample = `<!-- Product story: paste one email module, including its own styles. -->
<style>
@media screen and (max-width: 620px) {
  .story-shell { width: 100% !important; }
  .story-pad { padding: 32px 24px !important; }
  .story-title { font-size: 32px !important; }
}
</style>
<table role="presentation" class="story-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;background-color:#203e33;">
  <tr>
    <td class="story-pad" style="padding:48px 42px;">
      <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:2px;color:#d2ef8c;">THE NEXT CHAPTER</p>
      <h1 class="story-title" style="margin:0 0 24px;font-family:Georgia,serif;font-weight:normal;font-size:42px;line-height:1.15;color:#ffffff;">Good things start<br>with a fresh perspective.</h1>
      <p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#dbe6de;">Discover a collection designed to bring a little more possibility to your everyday.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td bgcolor="#d2ef8c" style="padding:15px 24px;">
          <a href="https://example.com/collection" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;line-height:20px;color:#203e33;text-decoration:none;">Explore the collection</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;
  const newModule = (name = 'Untitled module', source = '') => ({
    id: crypto.randomUUID?.() || 'm' + Date.now(),
    name,
    slug: C.slug(name),
    release: '1.0.0',
    source: '',
    draftSource: source,
    contextCss: '',
    width: 600,
    fields: [],
    analysed: false,
    reviewed: false,
    acknowledged: false,
    iconColour: '#080043',
    iconSymbol: 'grid',
  });
  let project = {
    format: 'jarrang-block-studio',
    version: 1,
    modules: [newModule('Product story', sample)],
    settings: { name: '', baseUrl: '', location: 'root' },
  };
  const W = window.BlockWorkspace;
  let workspace,
    storageWarning = '',
    savedWorkspace = null,
    unsavedDraft = false;
  try {
    const saved = localStorage.getItem(W.KEY);
    savedWorkspace = saved;
    if (saved) workspace = W.validate(JSON.parse(saved));
    else {
      const previous = localStorage.getItem(key);
      workspace = W.create(previous ? C.assertProject(JSON.parse(previous)) : project);
      if (!previous && window.REPOSITORY_PROJECTS?.projects.length) {
        workspace = window.BlockMaintenance.importBatch(
          workspace,
          window.REPOSITORY_PROJECTS.projects,
          W,
        );
        workspace.projects = workspace.projects.filter((p) => W.path(p));
      }
    }
  } catch {
    storageWarning =
      'Saved drafts could not be loaded. The original browser data has been retained. Import a saved template file to recover it.';
    workspace = W.create(project);
  }
  project = workspace.projects.find((p) => p.projectId === workspace.activeId);
  let storageBlocked = !!storageWarning;
  let currentId = project.modules[0]?.id,
    step = project.modules[0]?.analysed ? 1 : 0,
    selectedField = null,
    viewport = 'desktop',
    trialValues = {},
    currentHtml = '',
    noticeTimer;
  if (!project.modules.length) {
    project.modules.push(newModule());
    currentId = project.modules[0].id;
  }
  project.settings ||= {};
  const current = () => project.modules.find((m) => m.id === currentId);
  const H = window.BlockHistory,
    history = H.create();
  history.track(current());
  function tell(message, error = false) {
    clearTimeout(noticeTimer);
    $('notice').hidden = false;
    $('notice').textContent = message;
    $('notice').className = 'notice' + (error ? ' error' : '');
    noticeTimer = setTimeout(() => ($('notice').hidden = true), 10000);
  }
  function persist(label, group = null) {
    const liveModules = workspace.projects.flatMap((p) => p.modules);
    history.prune(liveModules);
    const live = new Set(liveModules);
    for (const module of codeDrafts.keys()) if (!live.has(module)) codeDrafts.delete(module);
    history.capture(current(), label, group);
    renderHistory();
    unsavedDraft = true;
    if (storageBlocked) {
      $('save-state').textContent = 'Draft not saved: download an editable project before closing';
      return false;
    }
    try {
      workspace.activeId = project.projectId;
      savedWorkspace = W.save(localStorage, workspace, savedWorkspace);
      unsavedDraft = false;
      $('save-state').textContent = 'Recovery draft saved in this browser';
      renderRepositoryState();
      return true;
    } catch (error) {
      $('save-state').textContent = 'Draft not saved: download an editable project before closing';
      tell(
        error.message ||
          'Browser storage is unavailable. Download an editable project before closing.',
        true,
      );
      return false;
    }
  }
  window.addEventListener('beforeunload', (event) => {
    if (
      savingRepository ||
      unsavedDraft ||
      [...codeDrafts.values()].some((state) => state.draft.source !== state.original.source)
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  function confirmAction(title, message, action) {
    $('dialog-title').textContent = title;
    $('dialog-message').textContent = message;
    $('dialog-confirm').onclick = () => {
      $('confirm-dialog').close();
      action();
    };
    $('confirm-dialog').showModal();
  }
  $('dialog-cancel').onclick = () => $('confirm-dialog').close();
  function showDownloadReceipt(filename, kind) {
    $('download-receipt').hidden = false;
    $('download-result').textContent = 'Download started: ' + filename;
    $('download-next-step').textContent =
      kind === 'project'
        ? 'Editable project JSON: starting content and field settings only. Keep it as a backup, or add it under projects/ in your repository, then review, commit and push through Tower.'
        : 'Publishing ZIP: uses starting content, not test values. Once downloaded, merge its docs/ and projects/ folders into your repository, then review, commit and push through Tower. Studio has not published or installed this package.';
  }
  $('dismiss-download').onclick = () => {
    $('download-receipt').hidden = true;
  };
  function download(blob, name) {
    const a = document.createElement('a'),
      url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function projectFileSlug() {
    return (
      (project.settings.clientSlug ? project.settings.clientSlug + '-' : '') +
      (project.settings.templateSlug || C.slug(project.settings.name || 'untitled-template'))
    );
  }
  function activateTemplate(next) {
    history.endGroup();
    project = next;
    if (!project.modules.length) project.modules.push(newModule());
    project.settings ||= {};
    workspace.activeId = project.projectId;
    currentId = project.modules[0].id;
    step = project.modules[0].analysed ? 1 : 0;
    selectedField = null;
    trialValues = {};
    persist();
    render();
  }
  function showProjects() {
    renderProjects();
    $('projects-dialog').showModal();
  }
  function renderProjects() {
    const search = $('project-search').value.trim().toLowerCase(),
      groups = new Map();
    $('project-cards').replaceChildren();
    for (const p of workspace.projects) {
      const client = p.settings.clientName || 'Unassigned';
      if (!(client + ' ' + (p.settings.name || 'Untitled template')).toLowerCase().includes(search))
        continue;
      if (!groups.has(client)) groups.set(client, []);
      groups.get(client).push(p);
    }
    for (const [client, projects] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      const section = document.createElement('section');
      section.className = 'client-group';
      const h = document.createElement('h3');
      h.textContent = client;
      const cards = document.createElement('div');
      cards.className = 'template-cards';
      for (const p of projects) {
        const button = document.createElement('button');
        button.className = 'template-card';
        button.setAttribute('aria-current', String(p.projectId === project.projectId));
        const title = document.createElement('strong');
        title.textContent = p.settings.name || 'Untitled template';
        const meta = document.createElement('span');
        meta.textContent = p.modules.length + (p.modules.length === 1 ? ' module' : ' modules');
        button.setAttribute(
          'aria-label',
          title.textContent +
            ', ' +
            meta.textContent +
            (p.projectId === project.projectId ? ', current template' : ''),
        );
        button.append(title, meta);
        button.onclick = () => {
          $('projects-dialog').close();
          activateTemplate(p);
        };
        if (!p.settings.clientName && !W.path(p) && workspace.projects.length > 1) {
          const entry = document.createElement('div');
          entry.className = 'template-entry';
          const remove = document.createElement('button');
          remove.className = 'button quiet danger';
          remove.type = 'button';
          remove.textContent = 'Remove draft';
          remove.setAttribute(
            'aria-label',
            'Remove draft: ' + (p.settings.name || 'Untitled template'),
          );
          remove.onclick = () => {
            if (p.modules.some(hasCodeChanges)) {
              tell('Apply or discard pending HTML changes before removing this draft.', true);
              return;
            }
            confirmAction(
              'Remove ' + (p.settings.name || 'Untitled template') + '?',
              'This removes its ' +
                p.modules.length +
                ' modules from this browser. Download the editable project first if you need a backup. ESC templates and repository files are kept. This cannot be undone.',
              () => {
                if (!workspace.projects.includes(p) || workspace.projects.length < 2) return;
                const next = {
                  ...workspace,
                  projects: workspace.projects.filter((item) => item !== p),
                };
                if (next.activeId === p.projectId) next.activeId = next.projects[0].projectId;
                try {
                  if (storageBlocked)
                    throw Error('Browser storage is unavailable. The draft has been kept.');
                  savedWorkspace = W.save(localStorage, next, savedWorkspace);
                  workspace = next;
                  if (project === p)
                    activateTemplate(
                      next.projects.find((item) => item.projectId === next.activeId),
                    );
                  renderProjects();
                  tell('Unassigned draft removed.');
                } catch (error) {
                  tell(error.message, true);
                }
              },
            );
          };
          entry.append(button, remove);
          cards.append(entry);
        } else cards.append(button);
      }
      section.append(h, cards);
      $('project-cards').append(section);
    }
    if (!groups.size) {
      const empty = document.createElement('p');
      empty.className = 'help';
      empty.textContent = 'No templates match your search.';
      $('project-cards').append(empty);
    }
  }
  let templateDraft = null;
  let templateThemeDraft = {};
  function openTemplateSettings(create = false) {
    if ($('projects-dialog').open) $('projects-dialog').close();
    templateDraft = create
      ? W.normalise({
          format: 'jarrang-block-studio',
          version: 1,
          modules: [newModule()],
          settings: {},
        })
      : project;
    templateThemeDraft = {
      editorTheme: JSON.parse(
        JSON.stringify(
          E.themedModule(templateDraft, templateDraft.modules[0] || {}).editorTheme || null,
        ),
      ),
    };
    $('show-editor-header').checked = templateDraft.settings.showEditorHeader !== false;
    const legacy = templateDraft.modules.filter((m) => m.editorTheme);
    $('theme-existing').replaceChildren();
    for (const m of legacy) {
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name;
      $('theme-existing').append(option);
    }
    $('theme-existing-label').hidden = $('theme-existing').hidden =
      Object.hasOwn(templateDraft.settings, 'editorTheme') || !legacy.length;
    $('theme-migration-note').textContent = Object.hasOwn(templateDraft.settings, 'editorTheme')
      ? 'Changes apply to all modules when you save.'
      : legacy.length
        ? 'Existing module palettes are preserved until you save. Choose one below to apply across the template.'
        : 'Choose colours once for all modules in this template.';
    if (!Object.hasOwn(templateDraft.settings, 'editorTheme') && legacy.length)
      templateThemeDraft.editorTheme = E.editorTheme(legacy[0]);
    renderThemeSettings();
    $('template-dialog-title').textContent = create ? 'New template' : 'Template settings';
    $('template-client').value = templateDraft.settings.clientName || '';
    $('template-name').value = templateDraft.settings.name || '';
    $('template-client').readOnly = !!W.path(templateDraft);
    $('template-folder-note').textContent = W.path(templateDraft)
      ? 'Publishing folder: ' +
        W.path(templateDraft) +
        '. Renaming this template keeps its existing URLs. To use another client, create a new template.'
      : 'Choose an existing client or enter a new name. A publishing folder is created automatically. Previously exported blocks keep their old URLs; this creates new endpoints.';
    $('template-form-error').textContent = '';
    $('known-clients').replaceChildren();
    [...new Set(workspace.projects.map((p) => p.settings.clientName).filter(Boolean))]
      .sort()
      .forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        $('known-clients').append(option);
      });
    $('template-dialog').showModal();
  }
  function openRepositorySettings() {
    $('repository-url').value = workspace.repository.baseUrl || '';
    $('repository-error').textContent = '';
    $('repository-dialog').showModal();
  }
  let repository = null,
    rememberedRepository = null,
    savingRepository = false;
  const repositorySaved = new Map(),
    repositoryBuilt = new Map();
  const moduleSaveKey = (p, m) => W.path(p) + '/' + m.id;
  const moduleSaveContent = (p, m) =>
    JSON.stringify({
      definition: E.definition(E.themedModule(p, m)),
      draftSource: m.draftSource,
      width: m.width,
      iconColour: m.iconColour,
      iconSymbol: m.iconSymbol,
      iconAssets: m.iconAssets,
    });
  const repositorySettings = (p) =>
    JSON.stringify({ ...p.settings, baseUrl: workspace.repository.baseUrl, location: 'docs' });
  function repositoryContent(p) {
    return JSON.stringify({
      ...p,
      settings: { ...p.settings, baseUrl: workspace.repository.baseUrl, location: 'docs' },
    });
  }
  function renderRepositoryState() {
    $('save-repository').disabled = savingRepository;
    $('repository-state').textContent = savingRepository
      ? 'Saving to repository…'
      : repository
        ? repository.name +
          ' · ' +
          (!hasCodeChanges() &&
          repositorySaved.get(W.path(project)) === repositorySettings(project) &&
          repositoryBuilt.get(moduleSaveKey(project, current())) ===
            moduleSaveContent(project, current())
            ? 'Saved to repository'
            : 'Unsaved repository changes')
        : 'No repository connected';
    $('connect-repository').textContent = repository
      ? 'Reload repository'
      : rememberedRepository
        ? 'Reconnect ' + rememberedRepository.name
        : 'Open repository';
  }
  async function openWritableRepository(reconnect = false) {
    if (savingRepository) return;
    if (!window.showDirectoryPicker) {
      $('repository-folder').click();
      tell(
        'Direct saving needs a browser with folder write access, such as desktop Chrome or Edge. You can still import and download ZIPs here.',
      );
      return;
    }
    if (workspace.projects.some((p) => p.modules.some(hasCodeChanges))) {
      tell('Apply or discard pending HTML changes before opening a repository.', true);
      return;
    }
    try {
      const handle =
        reconnect && rememberedRepository
          ? rememberedRepository
          : await window.showDirectoryPicker({ mode: 'readwrite', id: 'block-studio-repository' });
      if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted')
        throw Error('Folder access was not granted.');
      const connection = await window.BlockRepository.connect(handle);
      const projects = await window.BlockMaintenance.readRepository(connection.files, W);
      importTemplates(projects, () => {
        repository = connection;
        rememberedRepository = handle;
        repositorySaved.clear();
        repositoryBuilt.clear();
        for (const input of projects) {
          const loaded = workspace.projects.find((p) => W.path(p) === W.path(input));
          repositorySaved.set(W.path(loaded), repositorySettings(loaded));
          for (const m of loaded.modules) {
            if (
              m.exportedDefinition &&
              JSON.stringify(E.definition(E.themedModule(loaded, m))) ===
                JSON.stringify(m.exportedDefinition)
            )
              repositoryBuilt.set(moduleSaveKey(loaded, m), moduleSaveContent(loaded, m));
          }
        }
        window.BlockRepository.remembered(handle).catch(() => {});
        renderRepositoryState();
      });
    } catch (error) {
      if (error.name !== 'AbortError') tell('Repository not opened: ' + error.message, true);
    }
  }
  async function saveRepository(all = false) {
    if (savingRepository) return;
    if (!repository) {
      showProjects();
      tell(
        'Open your repository before saving. ZIP downloads are available under Manage templates.',
      );
      return;
    }
    if (project.modules.some(hasCodeChanges)) {
      tell('Apply or discard pending HTML changes before saving.', true);
      return;
    }
    if (!W.path(project)) {
      openTemplateSettings();
      return;
    }
    const target = project,
      options = { ...exportOptions(), fullTemplate: all };
    const snapshot = JSON.parse(JSON.stringify(target));
    const modules = all ? snapshot.modules : snapshot.modules.filter((m) => m.id === currentId);
    const failed = modules.find((m) => E.problems(E.themedModule(snapshot, m)).length);
    if (failed) {
      showSaveIssues(failed);
      return;
    }
    const surfaces = [
      ...document.querySelectorAll('main, .sidebar, .top-actions, .draft-status-bar, dialog[open]'),
    ];
    const previousInert = surfaces.map((el) => el.inert);
    savingRepository = true;
    surfaces.forEach((el) => {
      el.inert = true;
    });
    renderRepositoryState();
    try {
      if (storageBlocked || localStorage.getItem(W.KEY) !== savedWorkspace)
        throw Error(
          'Browser drafts changed in another tab or could not be loaded. Download a backup and reload before saving.',
        );
      const entries = await E.files(snapshot, modules, options);
      await repository.save(entries, options);
      window.BlockMaintenance.recordExport(
        target,
        modules.map((m) => E.definition(E.themedModule(snapshot, m))),
      );
      target.settings.baseUrl = options.baseUrl;
      target.settings.location = 'docs';
      repositorySaved.set(W.path(target), repositorySettings(target));
      for (const saved of modules) {
        const m = target.modules.find((m) => m.id === saved.id);
        repositoryBuilt.set(moduleSaveKey(target, m), moduleSaveContent(target, m));
      }
      if (persist()) tell('Saved to repository. Ready to commit and push in Tower.');
      else
        tell(
          'Saved to repository, but the browser recovery draft was not saved. Keep this tab open and download an editable project backup before reloading.',
          true,
        );
    } catch (error) {
      tell('Save failed: ' + error.message, true);
    } finally {
      savingRepository = false;
      surfaces.forEach((el, i) => {
        el.inert = previousInert[i];
      });
      renderRepositoryState();
    }
  }
  $('connect-repository').onclick = () => openWritableRepository(true);
  $('save-repository').onclick = () => saveRepository();
  $('copy-module-url').onclick = async () => {
    const url = E.endpoint(current(), workspace.repository.baseUrl, exportOptions());
    if (!workspace.repository.baseUrl) {
      openRepositorySettings();
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      tell('Module URL copied.');
    } catch {
      tell('Copy the module URL shown above.');
    }
  };
  window.BlockRepository?.remembered()
    .then((handle) => {
      rememberedRepository = handle;
      renderRepositoryState();
    })
    .catch(() => {});
  function exportOptions() {
    return {
      ...project.settings,
      baseUrl: workspace.repository.baseUrl,
      location: 'docs',
    };
  }
  $('browse-projects').onclick = showProjects;
  $('close-projects').onclick = () => $('projects-dialog').close();
  $('project-search').oninput = renderProjects;
  $('new-template').onclick = () => openTemplateSettings(true);
  $('template-settings').onclick = () => openTemplateSettings();
  $('cancel-template').onclick = () => $('template-dialog').close();
  $('template-form').onsubmit = (e) => {
    e.preventDefault();
    try {
      const nextSettings = W.naming(
        workspace,
        templateDraft,
        $('template-client').value,
        $('template-name').value,
      );
      const themeErrors = E.themeProblems(templateThemeDraft);
      if (themeErrors.length) throw Error(themeErrors.join(' '));
      templateDraft.settings = nextSettings;
      templateDraft.settings.showEditorHeader = $('show-editor-header').checked;
      templateDraft.settings.editorTheme = templateThemeDraft.editorTheme
        ? E.editorTheme(templateThemeDraft)
        : null;
      for (const module of templateDraft.modules) delete module.editorTheme;
      if (!workspace.projects.includes(templateDraft)) workspace.projects.push(templateDraft);
      $('template-dialog').close();
      activateTemplate(templateDraft);
      if (!unsavedDraft) tell('Template settings saved in this browser.');
    } catch (error) {
      $('template-form-error').textContent = error.message;
    }
  };
  $('repository-settings').onclick = openRepositorySettings;
  $('export-repository-settings').onclick = openRepositorySettings;
  $('cancel-repository').onclick = () => $('repository-dialog').close();
  $('repository-form').onsubmit = (e) => {
    e.preventDefault();
    try {
      workspace.repository.baseUrl = W.repositoryURL($('repository-url').value);
      persist();
      $('repository-dialog').close();
      if (step === 3) renderExport();
    } catch (error) {
      $('repository-error').textContent = error.message;
    }
  };
  function renderSidebar() {
    $('active-client').textContent = project.settings.clientName || 'UNASSIGNED CLIENT';
    $('active-template').textContent = project.settings.name || 'Untitled template';
    document.title =
      (project.settings?.name ? project.settings.name + ' · ' : '') + 'Block Studio · Jarrang';
    const list = $('module-list'),
      top = list.scrollTop,
      left = list.scrollLeft,
      focusedId = document.activeElement?.dataset?.moduleId;
    list.replaceChildren();
    project.modules.forEach((m) => {
      const b = document.createElement('button');
      b.dataset.moduleId = m.id;
      b.className = 'module-button' + (m.id === currentId ? ' active' : '');
      b.innerHTML =
        '<span class="module-icon" aria-hidden="true">▤</span><span><span class="name"></span><span class="meta"></span></span>';
      b.querySelector('.name').textContent = m.name;
      b.querySelector('.meta').textContent = hasCodeChanges(m)
        ? 'Unapplied HTML changes'
        : m.analysed
          ? m.fields.filter((f) => f.enabled).length + ' editable fields'
          : 'Draft module';
      b.onclick = () => {
        if (currentId === m.id) return;
        history.endGroup();
        currentId = m.id;
        step = m.analysed ? 1 : 0;
        selectedField = null;
        trialValues = {};
        render();
      };
      list.append(b);
      if (m.id === focusedId) b.focus({ preventScroll: true });
    });
    list.scrollTop = top;
    list.scrollLeft = left;
  }
  let workspaceMode = 'configure';
  let previewMode = 'desktop';
  function setStep(next) {
    if (next === 2) {
      setWorkspaceMode('test');
      return;
    }
    if (next === step) return;
    const m = current();
    if (next > 0 && (!m.analysed || m.draftSource !== m.source)) {
      tell('Find editable content first so the mappings match your current HTML.', true);
      return;
    }
    step = next;
    render();
  }
  function render() {
    $('save-issues').hidden = true;
    const m = current();
    history.track(m);
    renderHistory();
    $('quick-edit-html').hidden = !m.analysed;
    $('setup-navigation').hidden = !!m.analysed && step !== 0;
    $('module-task-navigation').hidden = !m.analysed;
    renderTaskNavigation();
    renderSidebar();
    $('module-title').textContent = m.name;
    $('module-title').title = m.name;
    $('module-status').textContent = hasCodeChanges(m) ? 'Unapplied HTML' : 'Draft';
    $('module-status').hidden = m.analysed && !hasCodeChanges(m);
    document.querySelectorAll('.step').forEach((b) => {
      const n = Number(b.dataset.step);
      b.classList.toggle('active', n === step);
      b.classList.toggle('done', n < step);
      b.setAttribute('aria-current', n === step ? 'step' : 'false');
    });
    [
      ['import', 0],
      ['map', 1],
      ['export', 3],
    ].forEach(([id, value]) => ($('step-' + id).hidden = value !== step));
    if (step === 0) {
      $('module-name').value = m.name;
      $('source-html').value = m.draftSource;
      $('context-css').value = m.contextCss || '';
      $('email-width').value = m.width || 600;
      $('source-size').textContent = m.draftSource.length.toLocaleString('en-GB') + ' characters';
    }
    if (step === 1) {
      renderWorkspaceMode();
    }
    if (step === 3) {
      renderExport();
    }
  }
  function analyse() {
    const m = current(),
      source = $('source-html').value;
    if (!source.trim()) {
      tell('Paste your email module or choose an HTML file.', true);
      return;
    }
    if (source.length > 2000000) {
      tell('Choose a module smaller than 2 MB.', true);
      return;
    }
    const run = () => {
      const result = C.infer(source),
        controls = m.fields.filter((f) => f.binding === 'template');
      m.source = source;
      m.draftSource = source;
      m.fields = [...result.fields, ...controls];
      m.analysed = true;
      m.reviewed = false;
      m.acknowledged = false;
      selectedField = m.fields[0]?.id;
      trialValues = {};
      persist('find editable content');
      step = 1;
      render();
      tell(result.fields.length + ' suggested fields. Review what should be editable.');
    };
    if (m.analysed && m.source !== source)
      confirmAction(
        'Replace the existing mappings?',
        'The HTML has changed. Re-analysing replaces this module’s field names, rules and mappings. Save a project copy first if you need to keep them.',
        run,
      );
    else if (m.analysed) {
      step = 1;
      render();
    } else run();
  }
  function moveField(id, target) {
    const m = current(),
      from = m.fields.findIndex((f) => f.id === id);
    if (from < 0 || target < 0 || target >= m.fields.length || from === target) return;
    const [field] = m.fields.splice(from, 1);
    m.fields.splice(target, 0, field);
    selectedField = id;
    fieldChanged(null);
    renderFields();
    mappingCode?.setSelected(selectedField);
    syncPreviewSelection();
    const row = $('field-list').children[target];
    row?.querySelector('.field-drag-handle')?.focus({ preventScroll: true });
    revealField(row);
    tell(field.label + ' moved to position ' + (target + 1) + ' of ' + m.fields.length + '.');
  }
  // Scroll only the field list, never its ancestors or the preview.
  function revealField(row) {
    const list = $('field-list');
    if (!row || list.scrollHeight <= list.clientHeight) return;
    const bounds = list.getBoundingClientRect?.(),
      item = row.getBoundingClientRect?.();
    if (!bounds || !item) return;
    if (item.top < bounds.top) list.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom)
      list.scrollTop += Math.min(item.bottom - bounds.bottom, item.top - bounds.top);
  }
  let stopFieldDrag = () => {};
  function renderFields() {
    stopFieldDrag();
    const m = current(),
      list = $('field-list'),
      top = list.dataset.moduleId === m.id ? list.scrollTop : 0;
    list.dataset.moduleId = m.id;
    if (!m.fields.some((f) => f.id === selectedField)) selectedField = m.fields[0]?.id || null;
    $('field-count').textContent = m.fields.length + (m.fields.length === 1 ? ' field' : ' fields');
    $('field-list').replaceChildren();
    if (!m.fields.length)
      $('field-list').innerHTML =
        '<div class="empty-fields"><strong>No simple editable fields found.</strong>The source may contain only layout or personalisation. You can export it as a fixed block, or import a simpler module.</div>';
    let draggedId = null,
      scrollFrame = null,
      scrollSpeed = 0,
      lastFrame = null;
    const stopScroll = () => {
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
      lastFrame = null;
      scrollSpeed = 0;
    };
    const scrollDrag = (time) => {
      const elapsed = lastFrame === null ? 16 : Math.min(time - lastFrame, 32);
      lastFrame = time;
      list.scrollTop += (scrollSpeed * elapsed) / 16;
      scrollFrame = requestAnimationFrame(scrollDrag);
    };
    stopFieldDrag = () => {
      stopScroll();
      draggedId = null;
      clearDrop();
    };
    list.ondragover = (e) => {
      if (!draggedId) return;
      e.preventDefault();
      const bounds = list.getBoundingClientRect(),
        edge = Math.min(40, bounds.height / 4);
      scrollSpeed =
        e.clientY < bounds.top + edge
          ? -10 * Math.min(1, (bounds.top + edge - e.clientY) / edge)
          : e.clientY > bounds.bottom - edge
            ? 10 * Math.min(1, (e.clientY - bounds.bottom + edge) / edge)
            : 0;
      if (!scrollSpeed || list.scrollHeight <= list.clientHeight) stopScroll();
      else if (scrollFrame === null) scrollFrame = requestAnimationFrame(scrollDrag);
    };
    list.ondragleave = (e) => {
      if (!list.contains(e.relatedTarget)) stopScroll();
    };
    list.ondrop = stopFieldDrag;
    const clearDrop = () =>
      $('field-list')
        .querySelectorAll('.field-row')
        .forEach((r) => r.classList.remove('drop-before', 'drop-after', 'dragging'));
    m.fields.forEach((f, index) => {
      const row = document.createElement('div');
      row.className = 'field-row' + (f.id === selectedField ? ' active' : '');
      const button = document.createElement('button');
      button.className = 'field-select';
      const title = document.createElement('strong'),
        sub = document.createElement('span');
      title.textContent = f.label;
      sub.textContent =
        f.type === 'list'
          ? 'Repeating group · ' + f.defaultValue.length + ' starting items'
          : f.type === 'toggle'
            ? 'Show/hide section'
            : f.type === 'richtext'
              ? C.decode(f.defaultValue.replace(/<[^>]*>/g, ''))
              : f.defaultValue || 'Empty value';
      button.append(title, sub);
      button.onclick = () => {
        selectMappingField(f.id, true);
      };
      const remove = document.createElement('button');
      remove.className = 'field-edit-shortcut';
      remove.setAttribute('aria-label', 'Edit ' + f.label);
      remove.textContent = 'Edit';
      remove.onclick = (e) => {
        e.stopPropagation();
        selectedField = f.id;
        editField(f);
      };
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'field-drag-handle';
      handle.draggable = true;
      handle.setAttribute('aria-label', 'Reorder ' + f.label);
      handle.title = 'Drag to reorder. Or focus and use Up / Down arrow keys.';
      handle.innerHTML =
        '<svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="1.4"/><circle cx="11" cy="5" r="1.4"/><circle cx="5" cy="10" r="1.4"/><circle cx="11" cy="10" r="1.4"/><circle cx="5" cy="15" r="1.4"/><circle cx="11" cy="15" r="1.4"/></svg>';
      handle.disabled = m.fields.length < 2;
      handle.onkeydown = (e) => {
        if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          moveField(
            f.id,
            e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? m.fields.length - 1
                : index + (e.key === 'ArrowUp' ? -1 : 1),
          );
        }
      };
      handle.ondragstart = (e) => {
        draggedId = f.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', f.id);
        row.classList.add('dragging');
      };
      handle.ondragend = stopFieldDrag;
      row.ondragover = (e) => {
        if (!draggedId || draggedId === f.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const after =
          e.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
        clearDrop();
        row.classList.add(after ? 'drop-after' : 'drop-before');
      };
      row.ondragleave = (e) => {
        if (!row.contains(e.relatedTarget)) row.classList.remove('drop-before', 'drop-after');
      };
      row.ondrop = (e) => {
        if (!draggedId) return;
        e.preventDefault();
        const id = draggedId,
          from = m.fields.findIndex((x) => x.id === id),
          after =
            e.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
        stopFieldDrag();
        if (id === f.id) return;
        const insertion = index + (after ? 1 : 0);
        moveField(id, insertion - (from < insertion ? 1 : 0));
      };
      button.setAttribute('aria-expanded', String(f.id === selectedField));
      row.append(handle, button, remove);
      if (f.id === selectedField) {
        const details = document.createElement('div');
        details.className = 'field-row-details';
        const info = document.createElement('div');
        info.className = 'field-row-info';
        const type = document.createElement('span');
        type.className = 'field-kind';
        type.textContent =
          window.BlockFieldCatalog.types.find((t) => t.id === f.type)?.name || f.type;
        info.append(type);
        const discard = document.createElement('button');
        discard.type = 'button';
        discard.className = 'field-remove';
        discard.textContent = 'Remove';
        discard.setAttribute('aria-label', 'Remove ' + f.label);
        discard.title = 'Remove this editable field';
        discard.onclick = () => deleteField(f.id);
        details.append(info, discard);
        row.append(details);
      }
      if (f.type === 'list') {
        const children = document.createElement('div');
        children.className = 'group-children';
        for (const child of f.itemFields) {
          const childButton = document.createElement('button');
          childButton.type = 'button';
          childButton.className = 'group-child';
          childButton.textContent = child.label;
          childButton.setAttribute('aria-label', 'Edit ' + child.label + ' in ' + f.label);
          childButton.onclick = () => {
            selectMappingField(f.id);
            $('mapping-preview').contentWindow?.postMessage(
              { type: 'studio-select-field', fieldId: f.id, childKey: child.key },
              '*',
            );
            editField(f, undefined, undefined, child.key);
          };
          children.append(childButton);
        }
        row.append(children);
      }
      list.append(row);
    });
    list.scrollTop = top;
  }
  function deleteField(id) {
    if (!requireAppliedCode()) return;
    const m = current(),
      f = m.fields.find((x) => x.id === id);
    if (!f) return;
    confirmAction(
      'Delete ' + f.label + '?',
      f.binding === 'template'
        ? 'This removes the control. Update any references to ' +
            f.key +
            ' in Template code before exporting.'
        : 'This removes the field and its mapping. The source HTML remains in place and this control is no longer editable.',
      () => {
        m.fields = m.fields.filter((x) => x.id !== id);
        m.reviewed = false;
        m.acknowledged = false;
        if (selectedField === id) selectedField = m.fields[0]?.id || null;
        persist();
        renderFields();
        renderMapping();
        tell('Field deleted.');
      },
    );
  }
  function fieldChanged(changedId) {
    current().reviewed = false;
    current().acknowledged = false;
    if (changedId === undefined) trialValues = {};
    else if (changedId !== null) {
      delete trialValues[changedId];
      delete trialValues[C.conversionKey]?.[changedId];
      delete trialValues[C.linkOptionsKey]?.[changedId];
    }
    persist();
    renderSidebar();
    $('module-status').textContent = 'Draft';
    $('module-status').className = 'pill';
  }
  function editField(field, initialType, draftModule, childKey) {
    if (!requireAppliedCode()) return;
    const target = current();
    window.BlockFieldEditor.open(
      draftModule || target,
      field,
      (saved, conversion) => {
        if (conversion) {
          Object.assign(target, conversion.draft);
          selectedField = conversion.fields[0]?.id || null;
          fieldChanged();
          renderFields();
          renderMapping();
          tell(
            conversion.kind === 'rules'
              ? 'Field and layout rules saved. Switch to Test to check each affected choice.'
              : 'Saved as a single item. Its fields remain editable.',
          );
          return;
        }
        if (draftModule) Object.assign(target, draftModule);
        const index = target.fields.findIndex((f) => f.id === saved.id);
        if (index < 0) target.fields.push(saved);
        else target.fields[index] = saved;
        if (saved.binding === 'template') target.templateMode = true;
        selectedField = saved.id;
        fieldChanged(saved.id);
        renderFields();
        renderMapping();
        tell(
          'Field saved. Switch to Test client controls to check it. This field’s test value has been reset.',
        );
      },
      initialType,
      childKey,
    );
  }
  function makeRepeating() {
    if (!requireAppliedCode()) return;
    if (previewMode === 'html') {
      repeatSelected();
      return;
    }
    const field = current().fields.find((f) => f.id === selectedField);
    if (field?.type === 'list') {
      editField(field);
      return;
    }
    window.BlockRepeatBuilder.open(current(), selectedField, (group, draft) =>
      editField(group, undefined, draft),
    );
  }
  $('make-repeating').onclick = makeRepeating;
  function chooseField() {
    if (!requireAppliedCode()) return;
    window.BlockFieldEditor.choose(
      current(),
      (field, draft, type) => editField(field, type, draft),
      () => {
        setPreviewMode('html');
        document.querySelector('.advanced-tools').open = true;
        tell(
          'Select the exact value or complete element in the HTML, then choose Add field from code selection.',
        );
      },
      makeRepeating,
    );
  }
  function frameWidth() {
    return viewport === 'desktop' ? Math.max(800, (Number(current().width) || 600) + 160) : 375;
  }
  function fitPreview() {
    const canvas = $('mapping-canvas'),
      frame = $('mapping-preview'),
      box = $('preview-size');
    if (canvas.hidden || !canvas.clientWidth) return;
    const style = window.getComputedStyle(canvas),
      paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
      paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      bounded = window.matchMedia('(min-width: 901px) and (min-height: 700px)').matches,
      width = frameWidth(),
      height = parseFloat(frame.style.height) || 360,
      scale =
        $('preview-scale').value === 'actual'
          ? 1
          : window.BlockPreview.fitScale(
              width,
              height,
              canvas.clientWidth - paddingX,
              bounded ? canvas.clientHeight - paddingY : Infinity,
            );
    box.style.width = width * scale + 'px';
    box.style.height = height * scale + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    $('preview-fit-option').textContent =
      $('preview-scale').value === 'actual'
        ? 'Fit module'
        : 'Fit module (' + Math.round(scale * 100) + '%)';
  }
  $('preview-scale').onchange = () => {
    $('mapping-canvas').scrollTop = 0;
    $('mapping-canvas').scrollLeft = 0;
    fitPreview();
  };
  if (window.ResizeObserver) new window.ResizeObserver(fitPreview).observe($('mapping-canvas'));
  window.addEventListener('resize', fitPreview);
  function setFrame(id, html) {
    // browsers can leave a sandboxed iframe blank when it's reused after being hidden; force a fresh load
    const frame = $(id);
    frame.removeAttribute('srcdoc');
    frame.srcdoc = html;
  }
  function sourceFieldRanges(module) {
    const ranges = [],
      source = module.source,
      fields = module.fields.filter((f) => f.enabled);
    const add = (start, end, id) => {
      if (
        Number.isInteger(start) &&
        Number.isInteger(end) &&
        start >= 0 &&
        end > start &&
        end <= source.length
      )
        ranges.push({ start, end, id });
    };
    fields.forEach((f) => (f.targets || []).forEach((t) => add(t.start, t.end, f.id)));
    if (module.templateMode) {
      const scopes = [];
      for (const token of source.matchAll(/{{[\s\S]*?}}|{%[\s\S]*?%}/g)) {
        const expression = token[0].slice(2, -2).replace(/"[^"\n]*"|'[^'\n]*'/g, '');
        if (/^\s*endfor\b/.test(expression)) {
          scopes.pop();
          continue;
        }
        const loop = expression.match(/^\s*for\s+(\w+)\s+in\s+([\w.]+)/);
        const resolve = (name) => {
          for (let i = scopes.length - 1; i >= 0; i--)
            if (scopes[i].alias === name) return scopes[i].root;
          return name;
        };
        const names = loop ? [loop[2]] : expression.match(/[A-Za-z_]\w*(?:\.\w+)*/g) || [];
        const roots = new Set(names.map((name) => resolve(name.split('.')[0])));
        fields
          .filter((f) => roots.has(f.key || f.id))
          .forEach((f) => add(token.index, token.index + token[0].length, f.id));
        if (loop) scopes.push({ alias: loop[1], root: resolve(loop[2].split('.')[0]) });
      }
    }
    return ranges;
  }
  function sourceLoopRanges(module) {
    if (!module.templateMode) return [];
    const stack = [],
      loops = [];
    for (const token of module.source.matchAll(
      /{%\s*(for\s+(\w+)\s+in\s+([\w.]+)[\s\S]*?|endfor)\s*%}/g,
    )) {
      if (token[1] === 'endfor') {
        const loop = stack.pop();
        if (loop) {
          loop.end = token.index + token[0].length;
          loops.push(loop);
        }
      } else {
        const root = token[3].split('.')[0],
          parent = [...stack].reverse().find((l) => l.alias === root);
        const key = parent ? parent.key : root,
          field = module.fields.find((f) => f.enabled && (f.key || f.id) === key);
        stack.push({
          start: token.index,
          alias: token[2],
          key,
          label: field?.label || token[3],
        });
      }
    }
    return loops.sort((a, b) => a.start - b.start);
  }
  let mappingCode = null,
    trialCode = null;
  function editorFields(module) {
    return sourceFieldRanges(module).map((range) => ({
      ...range,
      label: module.fields.find((f) => f.id === range.id)?.label || 'Field',
    }));
  }
  function syncPreviewSelection() {
    // The sandboxed preview owns its DOM. Selection changes never replace srcdoc.
    $('mapping-preview').contentWindow?.postMessage(
      { type: 'studio-select-field', fieldId: selectedField },
      '*',
    );
  }
  $('mapping-preview').addEventListener('load', syncPreviewSelection);
  function selectMappingField(id, restoreFocus = false) {
    if (id === selectedField) return;
    selectedField = id;
    renderFields();
    mappingCode?.setSelected(selectedField);
    syncPreviewSelection();
    if (restoreFocus) {
      const index = current().fields.findIndex((f) => f.id === id);
      $('field-list')
        .children[index]?.querySelector('.field-select')
        ?.focus({ preventScroll: true });
    } else {
      revealField($('field-list').children[current().fields.findIndex((f) => f.id === id)]);
    }
  }
  function selectCodeField(ids) {
    if (!ids.length) return;
    const index = ids.indexOf(selectedField);
    selectMappingField(ids[(index + 1) % ids.length]);
  }
  function renderSourceMapping() {
    if (!mappingCode)
      mappingCode = window.BlockCodeEditor.mount($('mapping-source'), {
        input: $('quick-code-source'),
        label: 'Module HTML and CSS',
        onField: selectCodeField,
        onRepeat: repeatSelected,
        onInput: editQuickSource,
        getFields: () => editorFields(codeState().draft),
        getLoops: () => sourceLoopRanges(codeState().draft),
        onReplace: (edits) => {
          const state = codeState();
          let candidate = JSON.parse(JSON.stringify(state.draft));
          for (const edit of [...edits].sort((a, b) => b.start - a.start))
            candidate = window.BlockQuickEdit.patch(
              candidate,
              candidate.source.slice(0, edit.start) + edit.value + candidate.source.slice(edit.end),
            );
          const draft = window.BlockQuickEdit.validate(state.original, candidate);
          stageCodeDraft(state, draft);
          codeChanged();
          return draft.source;
        },
      });
    const module = codeState().draft;
    mappingCode.setSource(module.source, {
      identity: project.projectId + ':' + module.id,
      fields: editorFields(module),
      loops: sourceLoopRanges(module),
      selected: selectedField,
    });
    updateCodeActions();
  }
  function renderOutputCode(source) {
    if (!trialCode)
      trialCode = window.BlockCodeEditor.mount($('trial-source'), {
        readOnly: true,
        label: 'Rendered email HTML',
      });
    trialCode.setSource(source, { identity: current().id });
  }
  function renderMappingPreview() {
    const draft = codeState().draft;
    $('mapping-preview').style.width = frameWidth() + 'px';
    fitPreview();
    try {
      updateWorkspacePreview(
        window.BlockPreview.documentHTML(draft.source, draft, true, selectedField, true),
      );
    } catch (e) {
      tell('The preview could not be updated. Check the source HTML.', true);
      tell(e.message, true);
    }
  }
  function renderMapping() {
    if (previewMode !== 'html') renderMappingPreview();
    renderSourceMapping();
    const warnings = C.inspect(current());
    $('mapping-warnings').hidden = !warnings.length;
    $('mapping-warnings-content').replaceChildren();
    if (warnings.length) {
      $('mapping-warnings-summary').textContent = warnings.length + ' source checks';
      const ul = document.createElement('ul');
      warnings.forEach((w) => {
        const li = document.createElement('li');
        li.textContent = w;
        ul.append(li);
      });
      $('mapping-warnings-content').append(ul);
    }
  }
  function selectedSourceRange() {
    const range = mappingCode?.getSelection();
    return range && range.start !== range.end ? range : null;
  }
  function addManualField() {
    if (!requireAppliedCode()) return;
    const m = current();
    if ($('mapping-source').hidden) {
      setPreviewMode('html');
      tell(
        'Select the exact HTML text, an attribute value, or a whole element (its opening to closing tag) to add a show/hide toggle, then choose Add field from code selection again.',
      );
      return;
    }
    const range = selectedSourceRange();
    if (!range) {
      tell(
        'Select text in the HTML view first. For attributes, select only the value inside the quotes. To add a show/hide toggle, select a complete element from its opening to closing tag.',
        true,
      );
      return;
    }
    try {
      const manual = C.manualField(m.source, range.start, range.end, m.fields),
        nextNumber =
          m.fields.reduce((max, f) => {
            const match = String(f.id).match(/^field(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
          }, 0) + 1;
      manual.id = 'field' + nextNumber;
      editField(manual);
    } catch (error) {
      tell(error.message, true);
    }
  }
  window.addEventListener('message', (e) => {
    if (e.source !== $('mapping-preview').contentWindow) return;
    if (Number.isFinite(e.data?.studioHeight) && e.data.studioHeight > 0) {
      $('mapping-preview').style.height = Math.max(1, e.data.studioHeight) + 'px';
      fitPreview();
    }
    if (workspaceMode === 'configure' && Array.isArray(e.data?.studioFields)) {
      const fields = current().fields.filter(
        (f) => f.enabled && e.data.studioFields.includes(f.id),
      );
      if (fields.length) {
        const next = fields.find((f) => f.id !== selectedField) || fields[0];
        selectMappingField(next.id);
      } else
        tell(
          'This region is fixed layout or protected content. Select one of the highlighted editable regions.',
        );
    }
  });
  function updateThemePreview() {
    $('editor-theme-preview').textContent =
      E.themeCSS(E.themedModule(project, current()), '#trial-fields') +
      E.themeCSS(templateThemeDraft, '#theme-sample');
    $('theme-feedback').textContent = E.themeProblems(templateThemeDraft).join(' ');
  }
  function renderThemeSettings() {
    const m = templateThemeDraft,
      enabled = !!m.editorTheme,
      values = window.BlockExport.editorTheme(m);
    $('theme-enabled').checked = enabled;
    $('theme-options').hidden = !enabled;
    $('theme-options').replaceChildren();
    for (const [key, title] of Object.entries({
      accent: 'Accent and buttons',
      background: 'Form background',
      text: 'Text and borders',
      field: 'Field background',
    })) {
      const row = document.createElement('div');
      row.className = 'theme-colour-row';
      const label = document.createElement('label');
      label.textContent = title;
      label.htmlFor = 'theme-' + key;
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.id = 'theme-' + key;
      picker.value = values[key];
      const hex = document.createElement('input');
      hex.type = 'text';
      hex.value = values[key];
      hex.maxLength = 7;
      hex.setAttribute('aria-label', title + ' hex value');
      hex.spellcheck = false;
      const save = (value) => {
        m.editorTheme = { ...window.BlockExport.editorTheme(m), [key]: value };
        updateThemePreview();
      };
      picker.oninput = () => {
        hex.value = picker.value;
        hex.setCustomValidity('');
        hex.removeAttribute('aria-invalid');
        save(picker.value);
      };
      hex.oninput = () => {
        const valid = /^#[a-f0-9]{6}$/i.test(hex.value);
        hex.setCustomValidity(valid ? '' : 'Enter a six-digit hex colour, for example #080043.');
        hex.setAttribute('aria-invalid', String(!valid));
        if (valid) {
          picker.value = hex.value;
          save(hex.value);
        }
      };
      hex.onblur = () => {
        if (!hex.checkValidity()) {
          hex.value = window.BlockExport.editorTheme(m)[key];
          hex.setCustomValidity('');
          hex.removeAttribute('aria-invalid');
          tell('The colour was not saved. Enter # followed by six hexadecimal characters.', true);
        }
      };
      row.append(label, picker, hex);
      $('theme-options').append(row);
    }
    updateThemePreview();
  }
  function renderTrial() {
    const m = current(),
      list = $('trial-fields'),
      top = list.dataset.moduleId === m.id ? list.scrollTop : 0;
    list.dataset.moduleId = m.id;
    $('trial-title').textContent = m.name;
    updateThemePreview();
    window.BlockControls.mount(
      $('trial-fields'),
      m.fields.filter((f) => f.enabled),
      trialValues,
      (f, value) => {
        trialValues[f.id] = value;
        renderTrialPreview();
      },
      { prefix: 'trial-' },
    );
    if (!m.fields.some((f) => f.enabled))
      $('trial-fields').innerHTML = '<p class="empty-fields">This is a fixed block.</p>';
    list.scrollTop = top;
    renderTrialPreview();
  }
  let workspacePreviewHTML = null;
  let workspacePreviewReady = false;
  function updateWorkspacePreview(html) {
    if (html === workspacePreviewHTML) return;
    const first = workspacePreviewHTML === null;
    workspacePreviewHTML = html;
    if (first) setFrame('mapping-preview', html);
    else if (workspacePreviewReady) sendWorkspacePreview();
  }
  function sendWorkspacePreview() {
    if (workspacePreviewHTML === null) return;
    $('mapping-preview').contentWindow?.postMessage(
      { type: 'studio-preview-html', html: workspacePreviewHTML },
      '*',
    );
  }
  $('mapping-preview').addEventListener('load', () => {
    workspacePreviewReady = true;
    sendWorkspacePreview();
  });
  function renderTrialPreview() {
    try {
      currentHtml = C.render(current(), trialValues);
      renderOutputCode(currentHtml);
      $('mapping-preview').style.width = frameWidth() + 'px';
      fitPreview();
      updateWorkspacePreview(
        window.BlockPreview.documentHTML(currentHtml, current(), false, null, true),
      );
    } catch (e) {
      currentHtml = '';
      renderOutputCode('Preview unavailable: ' + e.message);
      updateWorkspacePreview(
        window.BlockPreview.documentHTML(
          '<p>Preview unavailable. Resolve the field or template error to continue.</p>',
          current(),
          false,
          null,
          true,
        ),
      );
      tell(e.message, true);
    }
  }
  function renderExport() {
    const m = current();
    $('module-slug').value = m.slug;
    $('module-release').value = m.release;
    $('export-template-name').textContent =
      (project.settings.clientName || 'Unassigned') +
      ' / ' +
      (project.settings.name || 'Untitled template');
    $('export-template-path').textContent = W.path(project)
      ? 'docs/' + W.path(project) + '/'
      : 'Choose a client in Template settings before saving.';
    $('icon-colour').value = window.BlockIcons.background(m);
    $('icon-symbol').value = m.iconAssets ? '__supplied' : window.BlockIcons.selected(m)?.id || '';
    $('icon-colour').disabled = !!m.iconAssets;
    const suppliedOption = $('icon-symbol').querySelector('option[value="__supplied"]');
    suppliedOption.disabled = suppliedOption.hidden = !m.iconAssets;
    $('icon-export-help').textContent = m.iconAssets
      ? 'The supplied icon.png and dragIcon.png are preserved exactly, including their dimensions and transparency. Choose another icon to replace both.'
      : 'Generated icons export as icon.png (60 × 60) and dragIcon.png (120 × 120), with automatic foreground contrast.';
    renderBlockIcon();
    updateModuleSettings();
  }
  function updateModuleSettings() {
    $('endpoint-value').textContent = E.endpoint(
      current(),
      workspace.repository.baseUrl,
      project.settings,
    );
  }
  function showSaveIssues(module) {
    if ($('projects-dialog').open) $('projects-dialog').close();
    if (currentId !== module.id) {
      currentId = module.id;
      selectedField = null;
      step = module.analysed ? 1 : 0;
    }
    render();
    $('save-issues-title').textContent = 'Could not save ' + module.name;
    const list = $('save-issues-list');
    list.replaceChildren();
    const labels = {
      source: 'Edit HTML & CSS',
      import: 'Open source import',
      folder: 'Edit folder name',
      version: 'Edit module version',
      field: 'Edit field',
      fields: 'Review fields',
      icon: 'Choose icon',
      repository: 'Reload repository',
      theme: 'Edit template colours',
      maintenance: 'Module settings',
    };
    for (const issue of E.issues(E.themedModule(project, current()))) {
      const row = document.createElement('li'),
        text = document.createElement('span'),
        action = document.createElement('button');
      text.textContent = issue.message;
      action.type = 'button';
      action.className = 'button quiet';
      action.textContent = labels[issue.target];
      action.onclick = () => {
        $('save-issues').hidden = true;
        if (issue.target === 'field') {
          const field = current().fields.find((f) => f.id === issue.fieldId);
          if (field) editField(field);
        } else if (issue.target === 'fields') $('task-fields').onclick();
        else if (issue.target === 'repository') openWritableRepository(true);
        else if (issue.target === 'theme') $('template-colours').onclick();
        else if (issue.target === 'import' || (issue.target === 'source' && !current().analysed)) {
          step = 0;
          render();
          $('source-html').focus();
        } else if (issue.target === 'source') openCodeEditor();
        else {
          step = 3;
          render();
          $(
            issue.target === 'version'
              ? 'module-release'
              : issue.target === 'icon'
                ? 'icon-symbol'
                : 'module-slug',
          ).focus();
        }
      };
      row.append(text, action);
      list.append(row);
    }
    $('notice').hidden = true;
    $('save-issues').hidden = false;
    $('save-issues').focus();
  }
  $('dismiss-save-issues').onclick = () => {
    $('save-issues').hidden = true;
  };
  async function exportModules(all = false) {
    if (project.modules.some((module) => hasCodeChanges(module))) {
      tell('Apply or discard pending HTML changes before exporting this template.', true);
      return;
    }
    if ([...document.querySelectorAll('dialog')].some((dialog) => dialog.open)) return;
    if (!W.path(project)) {
      openTemplateSettings();
      tell('Choose the client and template name before exporting.');
      return;
    }
    const exportTarget = project,
      exportProject = JSON.parse(JSON.stringify(project)),
      exportId = currentId,
      options = { ...exportOptions(), fullTemplate: all };
    const filename = all ? projectFileSlug() + '-sfmc-modules.zip' : current().slug + '-sfmc.zip';
    const modules = all
        ? exportProject.modules
        : exportProject.modules.filter((m) => m.id === exportId),
      button = all ? $('export-all') : $('download-module');
    const errors = modules.flatMap((m) =>
      E.problems(E.themedModule(exportProject, m)).map((e) => m.name + ': ' + e),
    );
    if (errors.length) {
      const failed = modules.find((m) => E.problems(E.themedModule(exportProject, m)).length);
      showSaveIssues(failed);
      return;
    }
    button.disabled = true;
    const previous = button.textContent;
    button.textContent = 'Preparing ZIP…';
    try {
      const blob = await E.build(exportProject, modules, options);
      download(blob, filename);
      if (workspace.projects.includes(exportTarget)) {
        window.BlockMaintenance.recordExport(
          exportTarget,
          modules.map((m) => E.definition(E.themedModule(exportProject, m))),
        );
        persist();
      }
      showDownloadReceipt(filename, 'package');
    } catch (e) {
      tell(e.message, true);
    } finally {
      button.textContent = previous;
      button.disabled = false;
    }
  }
  function addModule() {
    const m = newModule();
    project.modules.push(m);
    currentId = m.id;
    step = 0;
    selectedField = null;
    trialValues = {};
    persist();
    render();
    $('module-name').focus();
    $('module-name').select();
  }
  function repeatSelected(range) {
    if (!requireAppliedCode()) return;
    if ($('mapping-source').hidden) {
      setPreviewMode('html');
      tell('Place the cursor inside an item, then choose Make repeating in the HTML toolbar.');
      mappingCode?.focus();
      return;
    }
    const selection =
      range && Number.isInteger(range.start) ? range : mappingCode?.getCursorRange();
    if (!selection) return;
    window.BlockRepeatBuilder.open(
      current(),
      null,
      (group, draft) => editField(group, undefined, draft),
      selection,
    );
  }
  const codeDrafts = new Map();
  function renderHistory() {
    const state = history.status(current()),
      pending = hasCodeChanges();
    for (const direction of ['undo', 'redo']) {
      const button = $('module-' + direction),
        action = state[direction];
      button.disabled = pending || !action;
      const label = direction === 'undo' ? 'Undo' : 'Redo';
      button.title = pending
        ? 'Apply or discard your HTML changes first.'
        : action
          ? label + ' ' + action + ' (this session)'
          : 'Nothing to ' + direction + ' in this session.';
      button.setAttribute('aria-label', action ? label + ' ' + action : label);
    }
    let available = false,
      referenceError = '';
    try {
      available = H.hasRecoveryChanges(current());
    } catch (error) {
      referenceError = error.message;
    }
    $('restore-export').disabled = pending || !available;
    $('restore-export').title = pending
      ? 'Apply or discard your HTML changes first.'
      : !current().exportedDefinition
        ? 'Export this module or open its repository to save a recovery reference.'
        : referenceError
          ? referenceError
          : available
            ? 'Review the last exported content before restoring it.'
            : 'Content already matches the last export.';
  }
  function moveHistory(direction) {
    if (savingRepository) return;
    if (!requireAppliedCode()) return;
    try {
      const label = history[direction](current());
      if (!label) return;
      codeDrafts.delete(current());
      trialValues = {};
      if (!current().analysed || current().draftSource !== current().source) step = 0;
      else if (step === 0) step = 1;
      persist();
      render();
      tell(
        (direction === 'undo' ? 'Undid ' : 'Redid ') +
          label +
          '. Temporary test values have been reset.',
      );
    } catch (error) {
      tell(error.message, true);
    }
  }
  $('module-undo').onclick = () => moveHistory('undo');
  $('module-redo').onclick = () => moveHistory('redo');
  window.addEventListener('focusout', () => history.endGroup());
  window.addEventListener('keydown', (event) => {
    if (
      event.defaultPrevented ||
      !(event.metaKey || event.ctrlKey) ||
      event.altKey ||
      event.key.toLowerCase() !== 'z'
    )
      return;
    // Text inputs and open dialogs own their own undo. Do not steal editing shortcuts.
    if (
      event.target?.closest?.('input, textarea, select, [contenteditable], dialog') ||
      document.querySelector('dialog[open]')
    )
      return;
    event.preventDefault();
    moveHistory(event.shiftKey ? 'redo' : 'undo');
  });
  $('restore-export').onclick = () => {
    if (!requireAppliedCode()) return;
    try {
      const target = current(),
        draft = H.exportedContent(target);
      C.assertProject({
        format: 'jarrang-block-studio',
        version: 1,
        settings: {},
        modules: [draft],
      });
      const before = H.snapshot(target),
        reference = JSON.stringify(target.exportedDefinition);
      const list = $('recovery-changes');
      list.replaceChildren();
      const old = H.comparison(target),
        next = H.comparison(draft);
      const labels = {
        name: 'Module name',
        slug: 'Module folder',
        release: 'Module version',
        source: 'HTML & CSS',
        draftSource: 'Source import draft',
        templateMode: 'Template logic mode',
        contextCss: 'Preview CSS',
        fields: 'Editable fields and their settings',
      };
      for (const key of Object.keys(labels))
        if (JSON.stringify(old[key]) !== JSON.stringify(next[key])) {
          const row = document.createElement('li');
          row.textContent =
            labels[key] +
            (key === 'fields'
              ? ' (' + old.fields.length + ' currently, ' + next.fields.length + ' in the export)'
              : '');
          list.append(row);
        }
      if (!list.children.length) {
        tell('This module’s content already matches the last export.');
        return;
      }
      $('recovery-current').textContent = JSON.stringify(old, null, 2);
      $('recovery-exported').textContent = JSON.stringify(next, null, 2);
      $('recovery-confirm').onclick = () => {
        if (
          current() !== target ||
          H.snapshot(target) !== before ||
          JSON.stringify(target.exportedDefinition) !== reference ||
          hasCodeChanges(target)
        ) {
          $('recovery-dialog').close();
          tell(
            'The module or export reference changed. Open recovery again to review the latest content.',
            true,
          );
          return;
        }
        H.restoreExportedContent(target);
        codeDrafts.delete(target);
        trialValues = {};
        selectedField = null;
        step = 1;
        $('recovery-dialog').close();
        persist('restore last exported content');
        render();
        tell(
          'Last exported content restored. You can undo this restoration. Review and export when ready.',
        );
      };
      $('recovery-dialog').showModal();
    } catch (error) {
      tell(error.message, true);
    }
  };
  $('recovery-cancel').onclick = () => $('recovery-dialog').close();
  function codeState() {
    const module = current();
    // Browsing code needs no copies. Keep a separate snapshot only while a fix is pending.
    return codeDrafts.get(module) || { original: module, draft: module };
  }
  function stageCodeDraft(state, draft) {
    const module = current();
    if (draft.source === state.original.source) {
      codeDrafts.delete(module);
      return;
    }
    codeDrafts.set(module, {
      original: state.original === module ? JSON.parse(JSON.stringify(module)) : state.original,
      draft,
    });
  }
  function hasCodeChanges(module = current()) {
    const state = codeDrafts.get(module);
    return !!state && state.original.source !== state.draft.source;
  }
  function requireAppliedCode() {
    if (!hasCodeChanges()) return true;
    tell('Apply or discard your HTML changes before changing fields or template logic.', true);
    return false;
  }
  function updateCodeActions() {
    renderRepositoryState();
    const dirty = hasCodeChanges();
    for (const id of ['quick-code-save', 'quick-code-cancel']) $(id).disabled = !dirty;
    $('quick-code-preview-state').textContent = dirty ? 'Unapplied changes' : 'No changes';
    $('configure-fields-panel').inert = dirty;
    $('module-status').textContent = dirty ? 'Unapplied HTML' : 'Draft';
    $('module-status').hidden = current().analysed && !dirty;
    renderHistory();
  }
  function codeChanged() {
    $('quick-code-error').textContent = '';
    updateCodeActions();
    renderSidebar();
  }
  function editQuickSource(value) {
    const state = codeState();
    const draft = window.BlockQuickEdit.patchInput(state.draft, value);
    stageCodeDraft(state, draft);
    codeChanged();
    return draft.source;
  }
  function previewQuickCode() {
    const state = codeState();
    try {
      const draft = window.BlockQuickEdit.validate(state.original, state.draft);
      updateWorkspacePreview(
        window.BlockPreview.documentHTML(draft.source, draft, true, selectedField, true),
      );
      $('quick-code-error').textContent = '';
      $('quick-code-preview-state').textContent = hasCodeChanges()
        ? 'Preview updated. Apply changes to save this fix.'
        : 'Preview up to date.';
    } catch (error) {
      $('quick-code-error').textContent = error.message;
      tell('Preview could not be updated: ' + error.message, true);
    }
  }
  function openCodeEditor() {
    if (current().draftSource !== current().source) {
      tell('Apply or discard changes in Source import before editing here.', true);
      return;
    }
    setWorkspaceMode('configure');
    setPreviewMode('html');
    mappingCode.focus();
  }
  $('quick-edit-html').onclick = openCodeEditor;
  $('edit-code-from-view').onclick = openCodeEditor;
  $('source-setup').onclick = () => {
    if (requireAppliedCode()) setStep(0);
  };
  $('task-fields').onclick = () => {
    setWorkspaceMode('configure');
    setPreviewMode(viewport);
  };
  $('task-test').onclick = () => {
    setWorkspaceMode('test');
    setPreviewMode(viewport);
  };
  function applyCodeFix() {
    const state = codeState();
    try {
      if (
        current().source !== state.original.source ||
        JSON.stringify(current().fields) !== JSON.stringify(state.original.fields)
      )
        throw Error(
          'The module changed while this code draft was open. Discard the code draft and reapply your fix to the latest module.',
        );
      const fixed = window.BlockQuickEdit.validate(state.original, state.draft);
      Object.assign(current(), {
        source: fixed.source,
        draftSource: fixed.draftSource,
        fields: fixed.fields,
        acknowledged: false,
      });
      codeDrafts.delete(current());
      persist('HTML & CSS fix');
      render();
      tell('HTML changes applied. Field settings are preserved.');
    } catch (error) {
      $('quick-code-error').textContent = error.message;
    }
  }
  $('quick-code-save').onclick = () => applyCodeFix();
  $('quick-code-cancel').onclick = () => {
    if (!hasCodeChanges()) return;
    confirmAction('Discard HTML changes?', 'The saved module and its fields will be kept.', () => {
      codeDrafts.delete(current());
      $('quick-code-error').textContent = '';
      renderSidebar();
      renderMapping();
    });
  };
  function templateCode() {
    if (!requireAppliedCode()) return;
    const m = current(),
      dialog = document.createElement('dialog');
    dialog.className = 'template-dialog';
    dialog.innerHTML =
      '<h2>Template code</h2><p class="help">Logic runs in the editor. SFMC receives the rendered HTML. Existing source mappings are rebuilt when you apply code changes; named template controls are retained.</p><div class="template-code-grid"><div><label for="template-source">Email template</label><textarea id="template-source" class="code-editor" spellcheck="false"></textarea></div><aside><h3>Available values</h3><div id="template-keys"></div><h3>Supported syntax</h3><pre class="template-snippet">{% if show_cta %}\n  …\n{% else %}\n  …\n{% endif %}\n\n{% for item in items %}\n  {{ item.text }}\n{% endfor %}</pre><p class="help">Also supports elsif, comparisons, and/or/not, forloop.index and block_id. Use | richtext for sanitised formatting. This is a defined subset, not full Liquid.</p></aside></div><div id="template-error" class="field-editor-errors" role="alert"></div><div class="dialog-actions"><button id="template-cancel" class="button secondary">Cancel</button><button id="template-save" class="button primary">Apply template</button></div>';
    document.body.append(dialog);
    $('template-source').value = m.source;
    m.fields.forEach((f) => {
      const line = document.createElement('p');
      line.className = 'help';
      line.textContent =
        (f.key || f.id) +
        ' · ' +
        f.type +
        (f.type === 'list' ? ' · item fields: ' + f.itemFields.map((c) => c.key).join(', ') : '');
      $('template-keys').append(line);
    });
    $('template-cancel').onclick = () => dialog.close();
    dialog.onclose = () => dialog.remove();
    $('template-save').onclick = () => {
      try {
        const source = $('template-source').value;
        window.BlockLogic.compile(source);
        if (source !== m.source) {
          const controls = m.fields.filter((f) => f.binding === 'template');
          // Retain mapped fields explicitly referenced by the new template as named controls.
          m.fields
            .filter((f) => f.binding !== 'template')
            .forEach((f) => {
              const key = f.key || f.id;
              if (new RegExp('(?:\\{[%{]\\s*[^}]*?)\\b' + key + '\\b').test(source))
                controls.push({ ...f, key, binding: 'template', targets: [] });
            });
          const inferred = C.infer(source).fields;
          const used = new Set(controls.map((f) => f.id));
          inferred.forEach((f) => {
            while (used.has(f.id)) f.id += 'x';
            used.add(f.id);
          });
          m.source = source;
          m.draftSource = source;
          m.fields = [...inferred, ...controls];
        }
        m.templateMode = true;
        fieldChanged();
        selectedField = m.fields[0]?.id;
        dialog.close();
        renderFields();
        renderMapping();
        tell('Template applied. Review its controls and test both conditional branches.');
      } catch (e) {
        $('template-error').textContent = e.message;
      }
    };
    dialog.showModal();
  }
  function logicExample() {
    const m = newModule('Conditional list example');
    m.templateMode = true;
    m.analysed = true;
    m.source = `<table role="presentation" width="600" style="width:100%;max-width:600px;background-color:{{ background }};"><tr><td style="padding:32px;font-family:Arial,sans-serif;">
{% if show_title %}<h2>{{ title }}</h2>{% endif %}
{% if layout == "detailed" %}<p>Here are the highlights:</p>{% else %}<p>A quick look:</p>{% endif %}
<ul>{% for bullet in bullets %}<li>{{ bullet.text }}</li>{% else %}<li>More details coming soon.</li>{% endfor %}</ul>
{% if show_cta %}<p><a href="{{ cta_url }}">{{ cta_label }}</a></p>{% endif %}
</td></tr></table>`;
    m.draftSource = m.source;
    const add = (type, key, label, value) => {
      const f = C.templateField(m, type, label);
      f.key = key;
      f.defaultValue = value;
      m.fields.push(f);
      return f;
    };
    add('colour', 'background', 'Background colour', '#ffffff');
    add('toggle', 'show_title', 'Show title', 'shown');
    add('text', 'title', 'Title', 'Made for your next project');
    const layout = add('select', 'layout', 'Content style', 'detailed');
    layout.options = [
      { label: 'Detailed', value: 'detailed' },
      { label: 'Compact', value: 'compact' },
    ];
    const list = add('list', 'bullets', 'Bullet points', [
      { text: 'A flexible first benefit' },
      { text: 'Another reason to get started' },
    ]);
    list.maxItems = 8;
    add('toggle', 'show_cta', 'Show button', 'shown');
    add('text', 'cta_label', 'Button text', 'Explore more');
    add('url', 'cta_url', 'Button destination', 'https://example.com/');
    project.modules.push(m);
    currentId = m.id;
    step = 1;
    selectedField = m.fields[0].id;
    trialValues = {};
    persist();
    render();
    tell('Example added: colour, dropdown, if/else, show/hide and a repeatable list.');
  }
  $('add-template-control').onclick = chooseField;
  $('repeat-selection').onclick = repeatSelected;
  $('template-code').onclick = templateCode;
  $('logic-example').onclick = logicExample;
  document
    .querySelectorAll('[data-step]')
    .forEach((b) => (b.onclick = () => setStep(Number(b.dataset.step))));
  function renderWorkspaceMode() {
    const testing = workspaceMode === 'test';
    $('configure-fields-panel').hidden = testing;
    $('configure-tools').hidden = testing;
    $('add-template-control').hidden = testing;
    $('make-repeating').hidden = testing;
    $('test-fields-panel').hidden = !testing;
    $('test-mode-actions').hidden = !testing;
    $('mapping-warnings').hidden = testing;
    $('workspace-preview-title').textContent = testing ? 'Test output' : 'Starting content';
    $('workspace-preview-help').textContent = testing
      ? 'Test preview · values are not saved to the module.'
      : 'Select highlighted content to find its field.';
    if (testing) renderTrial();
    else {
      renderFields();
      renderMapping();
    }
    setPreviewMode(previewMode);
  }
  function setWorkspaceMode(mode) {
    if (workspaceMode === mode && step === 1) return;
    workspaceMode = mode;
    if (step !== 1) {
      step = 1;
      render();
    } else renderWorkspaceMode();
  }
  function renderTaskNavigation() {
    const active =
      step === 3
        ? 'task-export'
        : step !== 1
          ? ''
          : workspaceMode === 'test'
            ? 'task-test'
            : previewMode === 'html'
              ? 'quick-edit-html'
              : 'task-fields';
    for (const id of ['task-fields', 'quick-edit-html', 'task-test', 'task-export']) {
      $(id).classList.toggle('active', id === active);
      $(id).setAttribute('aria-current', id === active ? 'page' : 'false');
    }
  }
  function setPreviewMode(mode) {
    const wasHtml = previewMode === 'html';
    previewMode = mode;
    renderTaskNavigation();
    const html = mode === 'html';
    $('show-map-source').hidden = workspaceMode !== 'test';
    $('workspace-preview-title').textContent =
      workspaceMode === 'test'
        ? 'Test output'
        : mode === 'html'
          ? 'Module source'
          : 'Starting content';
    $('show-map-source').textContent = workspaceMode === 'test' ? 'Generated HTML' : 'HTML & CSS';
    $('inline-code-actions').hidden = !html || workspaceMode === 'test';
    $('edit-code-from-view').hidden = workspaceMode !== 'test';
    $('code-view-context').hidden = !html || workspaceMode !== 'test';
    $('code-view-purpose').textContent =
      workspaceMode === 'test'
        ? 'Read-only output with temporary test values. Edit the source to fix HTML or CSS.'
        : 'Edit HTML and CSS here. Connected field values stay protected; select code to connect fields or make a section repeatable.';
    if (!html) viewport = mode;
    $('mapping-source').hidden = !html || workspaceMode === 'test';
    $('trial-source').hidden = !html || workspaceMode !== 'test';
    $('mapping-canvas').hidden = html;
    $('preview-scale').hidden = html;
    $('show-map-source').classList.toggle('active', html);
    $('show-map-source').setAttribute('aria-pressed', String(html));
    document.querySelectorAll('.viewport').forEach((button) => {
      const active = !html && button.dataset.width === viewport;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('mapping-preview').style.width = frameWidth() + 'px';
    fitPreview();
    if (wasHtml && !html && step === 1 && workspaceMode === 'configure') {
      if (hasCodeChanges()) previewQuickCode();
      else renderMappingPreview();
    }
  }
  document
    .querySelectorAll('.viewport')
    .forEach((b) => (b.onclick = () => setPreviewMode(b.dataset.width)));
  $('module-name').oninput = (e) => {
    const m = current(),
      old = m.name;
    m.name = e.target.value || 'Untitled module';
    if (!m.published && m.slug === C.slug(old)) m.slug = C.slug(m.name);
    $('module-title').textContent = m.name;
    $('module-title').title = m.name;
    persist('module name', 'module-name');
    renderSidebar();
  };
  $('source-html').oninput = (e) => {
    current().draftSource = e.target.value;
    current().acknowledged = false;
    $('source-size').textContent = e.target.value.length.toLocaleString('en-GB') + ' characters';
    persist('source import edit', 'source-html');
  };
  $('context-css').oninput = (e) => {
    current().contextCss = e.target.value;
    current().acknowledged = false;
    persist('preview CSS', 'context-css');
  };
  $('email-width').onchange = (e) => {
    current().width = Math.min(1200, Math.max(280, Number(e.target.value) || 600));
    e.target.value = current().width;
    persist();
  };
  $('analyse').onclick = analyse;
  $('sample-button').onclick = () => {
    const use = () => {
      current().draftSource = sample;
      $('source-html').value = sample;
      persist();
      render();
    };
    if (current().draftSource && current().draftSource !== sample)
      confirmAction(
        'Replace the HTML?',
        'This replaces the HTML in the import box with the example module.',
        use,
      );
    else use();
  };
  let htmlUploadSequence = 0;
  $('upload-html').onclick = () => $('html-file').click();
  $('html-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const targetProject = project,
      target = current(),
      sourceAtStart = target.draftSource,
      sequence = ++htmlUploadSequence;
    e.target.value = '';
    try {
      if (file.size > 2000000) throw Error('Choose an HTML module smaller than 2 MB.');
      const text = await file.text();
      const stillCurrent = () =>
        sequence === htmlUploadSequence &&
        project === targetProject &&
        current() === target &&
        targetProject.modules.includes(target) &&
        target.draftSource === sourceAtStart;
      if (!stillCurrent()) {
        tell(
          'HTML import cancelled because the module changed while the file was loading. Choose the file again in the intended module.',
          true,
        );
        return;
      }
      const use = () => {
        if (!stillCurrent()) {
          tell('HTML import cancelled because the module changed. Choose the file again.', true);
          return;
        }
        target.draftSource = text;
        if (target.name === 'Untitled module' || (!target.analysed && sourceAtStart !== sample)) {
          target.name = file.name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ');
          target.slug = C.slug(target.name);
        }
        persist();
        render();
        tell('HTML imported. Find editable content to continue.');
      };
      if (target.analysed)
        confirmAction(
          'Replace this module’s HTML?',
          'Existing mappings will be replaced when you analyse the new HTML.',
          use,
        );
      else use();
    } catch (error) {
      tell('HTML import failed: ' + error.message, true);
    }
  };
  $('add-manual-field').onclick = addManualField;
  $('task-export').onclick = () => {
    if (!requireAppliedCode()) return;
    setStep(3);
  };
  $('reset-values').onclick = () => {
    trialValues = {};
    renderTrial();
  };

  $('template-colours').onclick = () => {
    openTemplateSettings();
    $('theme-enabled').closest?.('details')?.setAttribute('open', '');
  };
  $('theme-existing').onchange = () => {
    const module = templateDraft.modules.find((m) => m.id === $('theme-existing').value);
    if (module) {
      templateThemeDraft.editorTheme = E.editorTheme(module);
      renderThemeSettings();
    }
  };
  $('theme-enabled').onchange = (e) => {
    if (e.target.checked) templateThemeDraft.editorTheme = E.editorTheme(templateThemeDraft);
    else templateThemeDraft.editorTheme = null;
    renderThemeSettings();
  };
  $('theme-reset').onclick = () => {
    templateThemeDraft.editorTheme = null;
    renderThemeSettings();
  };
  $('show-map-source').onclick = () => setPreviewMode('html');
  $('module-slug').oninput = (e) => {
    current().slug = e.target.value;
    persist('module folder', 'module-slug');
    updateModuleSettings();
  };
  $('module-release').oninput = (e) => {
    current().release = e.target.value;
    persist('module version', 'module-release');
    updateModuleSettings();
  };
  for (const icon of window.BlockIcons.choices) {
    const option = document.createElement('option');
    option.value = icon.id;
    option.textContent = icon.label;
    $('icon-symbol').append(option);
  }
  function renderBlockIcon() {
    $('block-icon-preview').src =
      'data:image/png;base64,' + (current().iconAssets?.icon || E.icon(current(), 60));
  }
  $('icon-symbol').onchange = (e) => {
    if (e.target.value === '__supplied') {
      renderExport();
      return;
    }
    if (current().iconAssets) {
      const symbol = e.target.value;
      confirmAction(
        'Replace the supplied icons?',
        'This replaces both PNGs with generated artwork when you export. Cancel to keep the ESC icons.',
        () => {
          delete current().iconAssets;
          current().iconSymbol = symbol;
          persist();
          renderExport();
        },
      );
      $('icon-symbol').value = '__supplied';
      return;
    }
    current().iconSymbol = window.BlockIcons.choices.some((icon) => icon.id === e.target.value)
      ? e.target.value
      : '';
    persist();
    renderBlockIcon();
  };
  $('icon-colour').oninput = (e) => {
    current().iconColour = e.target.value;
    persist('icon colour', 'icon-colour');
    renderBlockIcon();
  };
  $('download-module').onclick = () => saveRepository();
  $('export-all').onclick = () => saveRepository(true);
  $('download-module-zip').onclick = () => {
    $('projects-dialog').close();
    return exportModules();
  };
  $('download-template-zip').onclick = () => {
    $('projects-dialog').close();
    return exportModules(true);
  };
  $('new-module').onclick = addModule;
  $('duplicate-module').onclick = () => {
    if (!requireAppliedCode()) return;
    const m = JSON.parse(JSON.stringify(current()));
    m.id = crypto.randomUUID?.() || 'm' + Date.now();
    m.name += ' copy';
    let s = C.slug(m.name),
      i = 2;
    while (project.modules.some((x) => x.slug === s)) s = C.slug(m.name) + '-' + i++;
    m.slug = s;
    delete m.published;
    delete m.exportedDefinition;
    m.acknowledged = false;
    project.modules.push(m);
    currentId = m.id;
    trialValues = {};
    persist();
    render();
    tell('Module duplicated with a separate folder and identity.');
  };
  $('delete-module').onclick = () =>
    confirmAction(
      'Delete ' + current().name + '?',
      'This removes the module from this project. Previously downloaded exports are unaffected.',
      () => {
        codeDrafts.delete(current());
        project.modules = project.modules.filter((m) => m.id !== currentId);
        if (!project.modules.length) project.modules.push(newModule());
        currentId = project.modules[0].id;
        step = 0;
        selectedField = null;
        trialValues = {};
        persist();
        render();
      },
    );
  $('save-project').onclick = () => {
    if (project.modules.some((module) => hasCodeChanges(module))) {
      tell('Apply or discard pending HTML changes before downloading the editable project.', true);
      return;
    }
    download(
      new Blob(
        [
          JSON.stringify(
            {
              ...project,
              settings: {
                ...project.settings,
                baseUrl: workspace.repository.baseUrl,
                location: 'docs',
              },
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
      projectFileSlug() + '.jarrang.json',
    );
    showDownloadReceipt(projectFileSlug() + '.jarrang.json', 'project');
  };
  function importTemplates(projects, onImported) {
    if (workspace.projects.some((p) => p.modules.some(hasCodeChanges))) {
      tell('Apply or discard pending HTML changes before loading templates.', true);
      return;
    }
    const conflicts = projects
      .map((p) => {
        const existing = W.importConflict(workspace, p);
        return existing && repositoryContent(existing) !== repositoryContent(p) ? existing : null;
      })
      .filter(Boolean);
    const apply = () => {
      try {
        workspace = window.BlockMaintenance.importBatch(workspace, projects, W);
        if (onImported) onImported();
        if ($('projects-dialog').open) $('projects-dialog').close();
        activateTemplate(workspace.projects.find((p) => p.projectId === workspace.activeId));
        tell(
          'Loaded ' +
            projects.length +
            ' templates. Original module URLs and icons have been kept.',
        );
      } catch (e) {
        tell(e.message, true);
      }
    };
    if (conflicts.length)
      confirmAction(
        'Replace saved template drafts?',
        'This replaces browser drafts for ' +
          conflicts.map((p) => p.settings.clientName + ' / ' + p.settings.name).join(', ') +
          '. Download any edits you need to keep first.',
        apply,
      );
    else apply();
  }
  $('repository-snapshot-note').textContent = window.REPOSITORY_PROJECTS?.projects.length
    ? 'Bundled templates: ' +
      window.REPOSITORY_PROJECTS.projects
        .map((p) => p.settings.clientName + ' / ' + p.settings.name)
        .join(', ') +
      '. For later changes, pull in Tower and open the repository folder.'
    : 'Open your local repository to load its saved templates and original icons.';
  $('load-bundled-projects').hidden = !window.REPOSITORY_PROJECTS?.projects.length;
  $('load-bundled-projects').onclick = () => {
    try {
      importTemplates(window.REPOSITORY_PROJECTS.projects);
    } catch (e) {
      tell(e.message, true);
    }
  };
  $('open-repository').onclick = () => openWritableRepository();
  $('repository-folder').onchange = async (e) => {
    const input = e.target;
    try {
      importTemplates(await window.BlockMaintenance.readRepository(input.files, W));
    } catch (e) {
      tell('Repository not loaded: ' + e.message, true);
    } finally {
      input.value = '';
    }
  };
  $('open-project').onclick = () => $('project-file').click();
  $('project-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (workspace.projects.some((p) => p.modules.some(hasCodeChanges))) {
      tell('Apply or discard pending HTML changes before importing a template.', true);
      e.target.value = '';
      return;
    }
    try {
      if (file.size > 20000000) throw Error('Choose a template file smaller than 20 MB.');
      const loaded = W.normalise(C.assertProject(JSON.parse(await file.text()))),
        conflict = W.importConflict(workspace, loaded);
      const use = () => {
        try {
          const next = W.importProject(workspace, loaded, conflict?.projectId);
          if ($('projects-dialog').open) $('projects-dialog').close();
          activateTemplate(next);
          tell('Template imported. Other templates have been kept.');
        } catch (error) {
          if ($('projects-dialog').open) $('projects-dialog').close();
          tell(error.message, true);
        }
      };
      if (conflict)
        confirmAction(
          'Replace this saved template?',
          'This file matches ' +
            (conflict.settings.name || 'an existing template') +
            '. It will replace that browser draft. Other templates are kept. Save its current draft first if you need a backup.',
          use,
        );
      else use();
    } catch (error) {
      tell(error.message, true);
      if ($('projects-dialog').open) $('projects-dialog').close();
    }
    e.target.value = '';
  };
  // Small explicit API for export verification and future integrations.
  window.BlockStudio = {
    getProject: () => JSON.parse(JSON.stringify(project)),
    sample,
  };
  render();
  if (!storageWarning) persist();
  if (storageWarning) tell(storageWarning, true);
})();
