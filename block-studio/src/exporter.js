(function () {
  'use strict';
  const C = window.BlockCore,
    safeJSON = (value) =>
      JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
  const assetFolder = 'shared-assets/runtime-' + (window.EXPORT_ASSET_VERSION || 'development');
  const themeDefaults = {
    accent: '#080043',
    background: '#ffffff',
    text: '#080043',
    field: '#ffffff',
  };
  function editorTheme(module) {
    const input = module.editorTheme || {};
    return Object.fromEntries(
      Object.entries(themeDefaults).map(([key, value]) => [
        key,
        /^#[a-f0-9]{6}$/i.test(input[key]) ? input[key] : value,
      ]),
    );
  }
  function themedModule(project, module) {
    return Object.hasOwn(project.settings || {}, 'editorTheme')
      ? { ...module, editorTheme: project.settings.editorTheme || undefined }
      : module;
  }
  function luminance(hex) {
    const rgb = hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function themeProblems(module) {
    if (!module.editorTheme) return [];
    const t = editorTheme(module),
      issues = [];
    if (contrast(t.text, t.background) < 4.5)
      issues.push('Editor text needs more contrast against the form background (at least 4.5:1).');
    if (contrast(t.text, t.field) < 4.5)
      issues.push('Editor text needs more contrast against field backgrounds (at least 4.5:1).');
    return issues;
  }
  function themeCSS(module, scope = '.editor') {
    if (!module.editorTheme) return '';
    const t = editorTheme(module),
      onAccent =
        contrast('#ffffff', t.accent) >= contrast('#000000', t.accent) ? '#ffffff' : '#000000';
    const rule = (selectors, body) =>
      selectors
        .split(',')
        .map((selector) => scope + ' ' + selector.trim())
        .join(',') +
      '{' +
      body +
      '}';
    return (
      scope +
      '{--navy:' +
      t.text +
      ';--aqua:' +
      t.accent +
      ';--mist:' +
      t.background +
      ';--muted:' +
      t.text +
      ';--line:' +
      t.text +
      ';color:' +
      t.text +
      ';background:' +
      t.background +
      ';}' +
      rule(
        'label,h1,h2,h3,.help,.status,.rich-message,.runtime-brand,.runtime-brand>span',
        'color:' + t.text + ';',
      ) +
      rule(
        '.control,input:not([type=checkbox]):not([type=color]):not(.toggle-switch),textarea,select',
        'background:' + t.field + ';color:' + t.text + ';border-color:' + t.text + ';',
      ) +
      rule(
        '.repeat-card,.rich-toolbar,.rich-action-panel',
        'background:' + t.background + ';border-color:' + t.text + ';',
      ) +
      rule(
        'button',
        'background:' + t.field + ';color:' + t.text + ';border-color:' + t.text + ';',
      ) +
      rule(
        '.add-repeat-item,.rich-action-buttons button:first-child,.rich-toolbar .rich-tool:active',
        'background:' + t.accent + ';color:' + onAccent + ';border-color:' + t.text + ';',
      ) +
      rule('button:hover:not(:disabled)', 'background:' + t.accent + ';color:' + onAccent + ';') +
      rule('input[type=checkbox]', 'accent-color:' + t.accent + ';') +
      rule('input.toggle-switch', 'background:' + t.field + ';border:1px solid ' + t.text + ';') +
      rule('input.toggle-switch:after', 'background:' + t.text + ';') +
      rule('input.toggle-switch:checked', 'background:' + t.accent + ';') +
      rule('input.toggle-switch:checked:after', 'background:' + onAccent + ';') +
      rule(
        'button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[contenteditable]:focus-visible,.control:focus',
        'outline:2px solid ' + t.text + ';outline-offset:2px;',
      ) +
      rule('.field-error,.status.error', 'color:' + t.text + ';font-weight:700;') +
      rule('[aria-invalid=true]', 'border:2px solid ' + t.text + '!important;')
    );
  }
  function problems(module) {
    const errors = themeProblems(module);
    if (!module.source.trim()) errors.push('Import some email HTML.');
    if (module.draftSource !== module.source)
      errors.push('Analyse the changed HTML before exporting.');
    if (!module.reviewed) errors.push('Review and confirm the editable fields.');
    if (!module.acknowledged)
      errors.push('Confirm that you have reviewed the source dependencies.');
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(module.slug) ||
      ['docs', 'shared-assets', 'src', 'vendor'].includes(module.slug)
    )
      errors.push('Choose a valid, unique module folder name.');
    if (!/^\d+\.\d+\.\d+$/.test(module.release)) errors.push('Use a version such as 1.0.0.');
    if (/<(?:script|iframe|object|embed)\b|\son\w+\s*=/i.test(module.source))
      errors.push('Remove executable HTML from the email module.');
    if (/<!doctype|<html\b|<body\b/i.test(module.source))
      errors.push('Import a module fragment, rather than a complete email document.');
    module.fields
      .filter((f) => f.enabled)
      .forEach((f) => C.fieldProblems(f).forEach((e) => errors.push(f.label + ': ' + e)));
    try {
      C.render(module);
    } catch (e) {
      errors.push(e.message);
    }
    if (C.parse(module.source).issues.length)
      errors.push('Fix the unclosed HTML syntax before exporting.');
    return errors;
  }
  function definition(module) {
    return {
      id: module.id,
      name: module.name,
      slug: module.slug,
      release: module.release,
      source: module.source,
      templateMode: !!module.templateMode,
      contextCss: module.contextCss || '',
      fields: module.fields,
      editorTheme: module.editorTheme ? editorTheme(module) : undefined,
    };
  }
  function moduleHtml(module, assetPath = '../' + assetFolder) {
    return (
      '<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
      C.escape(module.name) +
      ' settings</title><link rel="stylesheet" href="' +
      assetPath +
      '/runtime.css"><link rel="stylesheet" href="' +
      assetPath +
      '/controls.css"><link rel="stylesheet" href="' +
      assetPath +
      '/brand.css"><style>' +
      themeCSS(module) +
      '</style></head><body><main class="editor"><div class="runtime-brand"><svg class="jarrang-wordmark" width="180" height="48" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 48" aria-hidden="true"><path fill="currentColor" d="M1.894 3.348 4.98 6.75v30.887a13.738 13.738 0 0 1-1.08 6.047A8.816 8.816 0 0 1 0 47.3l.163.7c8.93-1.513 13.423-6.485 13.423-14.849V0L1.894 2.97ZM40.061 29.079l.054-13.8c0-5.249-3.518-8.119-9.2-8.119-3.626 0-8.065 1.028-13.423 3.085l3.789 5.953h.215c2.923-3.41 4.817-5.521 5.737-6.386.92-.92 1.623-1.354 2.165-1.354 1.57 0 2.327 1.083 2.327 3.248v5.412a31.513 31.513 0 0 0-10.77 3.518c-3.085 1.731-4.98 4.384-4.98 7.578 0 4.383 3.356 6.657 7.415 6.657a9.754 9.754 0 0 0 8.389-4.709h.108v4.655l11.257-2v-.382c-2.6-2-3.085-2.544-3.085-3.356m-8.333-.324a4.773 4.773 0 0 1-4.059 2.219c-1.894 0-3.518-1.569-3.518-4.168 0-3.518 3.194-6.766 7.577-8.5ZM56.24 12.787h-.111l.109-6.007-11.635 2.98v.217l3.085 3.356V31.36l-3.085 1.774v1.136h16.126v-1.131l-4.435-1.779v-17q1.218-1.95 2.111-1.949c.487 0 2.76 1.028 6.711 3.03l1.353-7.523A6.143 6.143 0 0 0 63.6 7.16c-3.247 0-5.412 2.111-7.36 5.629M79.057 12.787h-.1l.109-6.007-11.642 2.98v.217l3.085 3.356V31.36l-3.085 1.774v1.136h16.133v-1.131l-4.442-1.779v-17q1.218-1.95 2.11-1.949c.487 0 2.76 1.028 6.712 3.03l1.353-7.523a6.144 6.144 0 0 0-2.869-.758c-3.247 0-5.412 2.111-7.36 5.629M113.271 29.079l.054-13.8c0-5.249-3.518-8.119-9.2-8.119-3.626 0-8.065 1.028-13.423 3.085l3.788 5.953h.217c2.923-3.41 4.817-5.521 5.737-6.386.92-.92 1.623-1.354 2.164-1.354 1.57 0 2.327 1.083 2.327 3.248v5.412a31.514 31.514 0 0 0-10.77 3.518c-3.085 1.731-4.98 4.384-4.98 7.578 0 4.383 3.356 6.657 7.415 6.657a9.754 9.754 0 0 0 8.389-4.709h.108v4.655l11.257-2v-.382c-2.6-2-3.085-2.544-3.085-3.356m-8.335-.324a4.773 4.773 0 0 1-4.059 2.219c-1.894 0-3.518-1.569-3.518-4.168 0-3.518 3.194-6.766 7.577-8.5ZM146.824 15.385c0-6.874-4.872-8.227-8.065-8.227-3.735 0-7.145 2.327-9.309 5.737h-.055l.055-6.116-11.637 2.982v.379l3.085 3.41v17.811l-3.085 1.774v1.137h14.83v-1.133l-3.139-1.778V14.303a6.312 6.312 0 0 1 4.871-2.706c2.327 0 3.9 1.625 3.9 4.925v14.839l-3.136 1.774v1.137h14.83v-1.133l-3.145-1.778ZM169.559 29.45l-9.146-.053q-3.093 0-3.092-2.373a2.922 2.922 0 0 1 .819-2 16.911 16.911 0 0 0 6.375 1.126 14.676 14.676 0 0 0 9.014-2.583 8.064 8.064 0 0 0 3.436-6.8 8.174 8.174 0 0 0-4.044-7.3h6.82V2.981h-.45l-8.384 5.455a16.667 16.667 0 0 0-6.4-1.134 14.509 14.509 0 0 0-9.013 2.61 8.124 8.124 0 0 0-3.436 6.855 8.32 8.32 0 0 0 4.89 7.7c-3.515 1.662-5.26 3.744-5.26 6.222a4.739 4.739 0 0 0 3.357 4.693c-3.515.738-5.577 2.583-5.577 4.987q0 5.813 13.851 5.827a26.165 26.165 0 0 0 11.947-2.426c3.146-1.608 4.732-3.955 4.732-7.091q0-7.119-10.441-7.223m-5.042-21.02c2.749 0 4.017 2.347 4.017 8.33 0 2.979-.317 5.115-.978 6.353a3.217 3.217 0 0 1-3.039 1.847 3.144 3.144 0 0 1-2.987-1.846c-.634-1.239-.951-3.374-.951-6.353 0-5.9 1.215-8.33 3.938-8.33m-.212 36.618c-5.63 0-8.828-2.056-8.828-5.509a3.644 3.644 0 0 1 2.22-3.507 14.1 14.1 0 0 0 1.692.106l9.04.106q4.916 0 4.916 3.559c0 3.242-3.119 5.247-9.04 5.247"/></svg><span>Block Studio</span></div><h1 id="block-name"></h1><p id="status" class="status" role="status" aria-live="polite">Loading module…</p><fieldset id="fields" disabled></fieldset></main><aside id="standalone-area"></aside><script type="application/json" id="block-definition">' +
      safeJSON(definition(module)) +
      '</script><script src="' +
      assetPath +
      '/blocksdk.js"></script><script src="' +
      assetPath +
      '/logic.js"></script><script src="' +
      assetPath +
      '/core.js"></script><script src="' +
      assetPath +
      '/rich-editor.js"></script><script src="' +
      assetPath +
      '/controls.js"></script><script src="' +
      assetPath +
      '/runtime.js"></script></body></html>'
    );
  }
  function icon(module, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = /^#[a-f0-9]{6}$/i.test(module.iconColour) ? module.iconColour : '#080043';
    ctx.fillRect(0, 0, size, size);
    if (window.BlockIcons.draw(ctx, module, size))
      return canvas.toDataURL('image/png').split(',')[1];
    const unit = size / 60;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * unit;
    ctx.strokeRect(16 * unit, 7 * unit, 28 * unit, 29 * unit);
    ctx.fillStyle = '#59dbca';
    ctx.fillRect(20 * unit, 12 * unit, 20 * unit, 6 * unit);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20 * unit, 23 * unit, 20 * unit, 2 * unit);
    ctx.fillRect(20 * unit, 28 * unit, 13 * unit, 2 * unit);
    const words = module.name.trim().split(/\s+/),
      lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : [words[0]];
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + 7 * unit + 'px Arial';
    lines
      .slice(0, 2)
      .forEach((line, i) =>
        ctx.fillText(line.slice(0, 13), 30 * unit, (46 + i * 8) * unit, 55 * unit),
      );
    return canvas.toDataURL('image/png').split(',')[1];
  }
  function templatePath(settings) {
    if (!settings?.clientSlug && !settings?.templateSlug) return '';
    if (
      ![settings.clientSlug, settings.templateSlug].every(
        (s) => typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 80,
      )
    )
      throw Error('Choose valid client and template folders before exporting.');
    return 'clients/' + settings.clientSlug + '/' + settings.templateSlug;
  }
  function endpoint(module, base, settings) {
    const path = templatePath(settings),
      root = (base || 'https://your-team.github.io/custom-blocks').replace(/\/+$/, '');
    return root + '/' + (path ? path + '/modules/' : '') + module.slug + '/';
  }
  function guide(project, modules, options) {
    const path = templatePath(options);
    return (
      '# Publish ' +
      (project.settings.name || 'this template') +
      ' with Tower\n\n' +
      '## One-time repository setup\n\nUse the supplied Block Studio repository package. In GitHub Settings > Pages, choose Deploy from a branch, your branch and /docs. Open the published /studio/ page to use the central tool. Do not append /docs to the public site URL.\n\n' +
      '## Apply this export\n\n1. Extract the ZIP outside your repository.\n2. Merge its docs/ and projects/ contents into the corresponding folders in your local repository. On macOS, do not replace an existing top-level folder with the exported folder: that can remove other clients. Copy the changed files into their matching folders, preserving all other files.\n3. In Tower, review the diff. This export only updates this template and adds the runtime assets it needs. Unexpected deletions of other templates or older runtimes should not be committed.\n4. Commit and push to the configured Pages branch.\n5. Open the endpoints below and register each module separately in SFMC.\n\n' +
      'Template destination: docs/' +
      path +
      '/\nEditable source: projects/' +
      options.clientSlug +
      '/' +
      options.templateSlug +
      '.jarrang.json\n\n' +
      (options.fullTemplate
        ? 'This full template export refreshes its catalogue. Removed modules disappear from the catalogue but their previously published folders must be retained for existing SFMC content.'
        : 'This module update does not replace the template catalogue. Use Export template to refresh that catalogue when adding modules.') +
      '\n\n' +
      '## Module endpoints\n\n' +
      modules.map((m) => '- ' + m.name + ': ' + endpoint(m, options.baseUrl, options)).join('\n') +
      '\n\n' +
      '## Keep existing blocks working\n\nKeep module identities, publishing folders and older runtime folders. Runtime folders are identified by their content and are never overwritten by a different release. Updating Studio does not change published modules. Re-export intentionally to adopt new code. For a changed field schema, create a new module folder and release; retain the previous endpoint. Existing SFMC instances are not migrated automatically.\n\n' +
      '## Shared editing\n\nPull the latest changes in Tower before starting. Import the relevant projects/ JSON into Studio, edit it, then export back into the same repository. Browser drafts are local to that browser and do not synchronise between people or devices. Resolve conflicting project edits through your normal Git review process.\n\n' +
      'The projects/ folder is outside the Pages publishing folder; it remains visible to people with repository access (and everyone if the repository is public). Published module defaults are public site content.\n\n' +
      '## Verify in SFMC\n\nTest new blocks, editing, close/reopen, duplication, tracking, AMPscript and sends. Browser preview does not certify email-client rendering. Conditions and loops render in the editor; AMPscript remains for SFMC. Template context CSS is preview-only.\n'
    );
  }
  async function build(project, modules, options) {
    C.assertProject(project);
    modules = modules.map((module) => themedModule(project, module));
    const path = templatePath(options);
    if (!path) throw Error('Choose a client and template before exporting.');
    const slugs = new Set();
    // All project folders must be unique, even when exporting only one module.
    for (const m of project.modules) {
      if (slugs.has(m.slug)) throw Error('Two modules use the same folder name: ' + m.slug);
      slugs.add(m.slug);
    }
    for (const m of modules) {
      if (!project.modules.some((p) => p.id === m.id))
        throw Error('Module does not belong to this template.');
      const errs = problems(m);
      if (errs.length) throw Error(m.name + ': ' + errs[0]);
    }
    if (!modules.length) throw Error('Add a module before exporting.');
    if (options.baseUrl) {
      const url = new URL(options.baseUrl);
      if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password)
        throw Error('Use a complete https site URL without a query, fragment or credentials.');
    }
    if (!window.EXPORT_ASSETS?.['blocksdk.js'] || !window.EXPORT_ASSET_VERSION)
      throw Error('The local export dependencies are missing. Rebuild Studio.');
    const zip = new JSZip(),
      prefix = 'docs/';
    zip.file(prefix + '.nojekyll', '');
    zip.file('BOOTSTRAP-ICONS-LICENSE.txt', window.BlockIcons.license);
    Object.entries(window.EXPORT_ASSETS).forEach(([name, content]) =>
      zip.file(prefix + assetFolder + '/' + name, content),
    );
    for (const m of modules) {
      const folder = prefix + path + '/modules/' + m.slug + '/';
      zip.file(folder + 'index.html', moduleHtml(m, '../../../../../' + assetFolder));
      zip.file(folder + 'icon.png', icon(m, 60), { base64: true });
      zip.file(folder + 'dragIcon.png', icon(m, 120), { base64: true });
    }
    if (options.fullTemplate) {
      const heading =
        (project.settings.clientName || options.clientSlug) +
        ' / ' +
        (project.settings.name || options.templateSlug);
      zip.file(
        prefix + path + '/index.html',
        '<!doctype html><html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
          C.escape(heading) +
          '</title><link rel="stylesheet" href="../../../' +
          assetFolder +
          '/brand.css"><body class="catalogue"><h1>' +
          C.escape(heading) +
          '</h1><p>Each module is a separate SFMC custom block.</p><ul>' +
          modules
            .map(
              (m) =>
                '<li><a href="modules/' +
                m.slug +
                '/">' +
                C.escape(m.name) +
                '</a><br><code>' +
                C.escape(endpoint(m, options.baseUrl, options)) +
                '</code></li>',
            )
            .join('') +
          '</ul></body></html>',
      );
    }
    const sourceFolder = 'projects/' + options.clientSlug + '/';
    zip.file(
      sourceFolder + options.templateSlug + '-PUBLISHING.md',
      guide(project, modules, options),
    );
    // Keep the whole editable template, including drafts, in both full and module-only exports.
    zip.file(
      sourceFolder + options.templateSlug + '.jarrang.json',
      JSON.stringify(
        {
          ...project,
          settings: {
            ...project.settings,
            baseUrl: options.baseUrl || '',
            location: 'docs',
          },
        },
        null,
        2,
      ),
    );
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
  window.BlockExport = {
    build,
    icon,
    problems,
    endpoint,
    moduleHtml,
    definition,
    editorTheme,
    themedModule,
    themeCSS,
    themeProblems,
    templatePath,
  };
})();
