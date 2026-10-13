const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const JSZip = require('../vendor/jszip.min.js');
const root = path.resolve(__dirname, '../..');
const projects = ['newsletter', 'congress'].map((t) =>
  JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/' + t + '.jarrang.json'))),
);
async function environment() {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  const context = vm.createContext({
    window: { getSelection: dom.getSelection.bind(dom) },
    document: dom.document,
    DOMParser: dom.DOMParser,
    URL,
    JSZip,
    Uint8Array,
    btoa,
    crypto: require('node:crypto').webcrypto,
    setTimeout,
    clearTimeout,
  });
  for (const file of [
    'logic',
    'runtime-core',
    'html-validation',
    'core',
    'maintenance',
    'workspace',
    'quick-edit',
    'block-icons',
    'export-assets',
    'exporter',
    'rich-editor',
    'controls',
    'field-catalog',
    'template-rules',
    'field-transforms',
    'field-editor',
    'code-editor',
    'repeat-builder',
  ])
    vm.runInContext(
      fs.readFileSync(path.join(root, 'block-studio/src/' + file + '.js'), 'utf8'),
      context,
    );
  return { ...context.window, dom };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const click = (container, text) => {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  assert.ok(button, 'Button: ' + text);
  button.click();
};
const labelled = (container, text) => {
  const label = [...container.querySelectorAll('label')].find((l) => l.textContent === text);
  assert.ok(label, 'Label: ' + text);
  return container.querySelector('#' + label.htmlFor);
};
test('congress landscape header retains side-by-side composition and proportional imagery', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    const content = host.querySelector('.esc-lead-content');
    const visual = host.querySelector('.esc-lead-visual');
    assert.equal(content.parentElement, visual.parentElement, 'shared desktop row');
    assert.equal(content.nextElementSibling, visual);
    assert.equal(content.getAttribute('width'), '320');
    assert.equal(visual.getAttribute('width'), '300');
    assert.equal(visual.getAttribute('valign'), 'middle');
    assert.equal(visual.style.verticalAlign, 'middle');
    const frame = visual.querySelector('.esc-lead-image-frame');
    assert.equal(frame.getAttribute('width'), '274');
    assert.equal(frame.style.width, '274px');
    assert.equal(frame.style.maxWidth, '', 'master template can expand the frame on mobile');
    const desktop = visual.querySelector('.esc-lead-visual-desktop');
    assert.equal(desktop.getAttribute('width'), '274', 'explicit Outlook display width');
    assert.equal(desktop.hasAttribute('height'), false);
    assert.equal(desktop.style.height, 'auto');
    assert.equal(desktop.style.maxHeight, '');
    assert.equal(desktop.style.width, '100%');
    assert.equal(desktop.style.maxWidth, '274px');
    assert.equal(desktop.style.borderRadius, '8px');
    assert.match(desktop.src, /1920x1080/);
    assert.match(m.source, /<!--\[if !mso\]><!-->.*esc-lead-visual-mobile/s);
    assert.match(m.source, /%%=v\(@PrimaryColour\)=%%/);
    assert.match(m.source, /%%=v\(@TextOnPrimaryColour\)=%%/);
    assert.ok(host.querySelector('.esc-lead-organiser-table'));
    assert.equal(C.htmlProblems(m).length, 0);
  } finally {
    await dom.happyDOM.close();
  }
});
test('congress image fallback honours saved mobile values and keeps URLs and alt text escaped', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const p = projects[1];
    const m = p.modules.find((m) => m.slug === 'lead-editorial');
    // Use the actual serialised definition consumed by an existing SFMC block.
    const page = E.moduleHtml(E.themedModule(p, m));
    const definition = JSON.parse(page.match(/id="block-definition">([\s\S]*?)<\/script>/)[1]);
    const check = (values, src, alt) => {
      const output = C.render(definition, values);
      const host = dom.document.createElement('div');
      host.innerHTML = output.replace(/<!--\[if !mso\]><!-->|<!--<!\[endif\]-->/g, '');
      const mobile = host.querySelector('.esc-lead-visual-mobile');
      assert.equal(mobile.getAttribute('src'), src);
      assert.equal(mobile.getAttribute('alt'), alt);
      assert.equal(mobile.hasAttribute('onerror'), false);
      assert.equal(
        host.querySelector('.esc-lead-visual-desktop').getAttribute('src'),
        values.field8,
      );
      assert.doesNotMatch(output, /\{%|\{\{/);
    };
    const main = {
      field8: 'https://example.com/1920x1080.jpg?a=1&b=2',
      field9: 'Congress "2026" & science',
    };
    check(main, main.field8, main.field9);
    check({ ...main, field10: '', field11: 'Old mobile caption' }, main.field8, main.field9);
    check(
      { ...main, field10: 'https://example.com/mobile.jpg', field11: 'Mobile "visual"' },
      'https://example.com/mobile.jpg',
      'Mobile "visual"',
    );
    check(
      { ...main, field10: 'https://example.com/mobile.jpg', field11: '' },
      'https://example.com/mobile.jpg',
      '',
    );
    assert.equal(definition.fields.length, 13);
    assert.equal(definition.id, 'c5a8e174-6d3b-4f92-8a5c-1e7d9b4f2a86');
    assert.equal(definition.slug, 'lead-editorial');
    assert.equal(definition.release, '1.0.0');
  } finally {
    await dom.happyDOM.close();
  }
});
test('newsletter story cards use proportional images in every light and dark variant', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    for (const m of projects[0].modules.filter((m) =>
      ['story-card-2col', 'story-card-3col'].includes(m.slug),
    )) {
      const images = [...m.source.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
      assert.ok(images.length >= 4);
      for (const image of images) {
        assert.doesNotMatch(image, /\sheight="/);
        assert.match(image, /height: auto;/);
        assert.match(image, /\swidth="\d+"/);
      }
      assert.equal(C.htmlProblems(m).length, 0);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('partial export preserves other module drafts and reopens against the last exported definitions', async () => {
  const { BlockExport: E, BlockMaintenance: M, BlockWorkspace: W, dom } = await environment();
  try {
    const p = clone(projects[0]);
    p.modules[1].name += ' draft';
    p.modules[1].release = '99.0.0';
    p.modules[1].slug += '-draft';
    p.modules[1].source = '<!-- unexported -->' + p.modules[1].source;
    p.modules[1].draftSource = p.modules[1].source;
    delete p.modules[1].iconAssets;
    p.modules[1].iconColour = '#123456';
    const zip = await JSZip.loadAsync(
      await (
        await E.build(p, [p.modules[0]], { ...p.settings, fullTemplate: false })
      ).arrayBuffer(),
    );
    const files = [];
    for (const original of p.modules)
      for (const name of ['index.html', 'icon.png', 'dragIcon.png']) {
        const file =
          'docs/clients/esc/newsletter/modules/' + original.exportedDefinition.slug + '/' + name;
        const bytes = zip.file(file)
          ? await zip.file(file).async('nodebuffer')
          : fs.readFileSync(path.join(root, file));
        files.push({
          webkitRelativePath: 'repo/' + file,
          size: bytes.length,
          text: async () => bytes.toString(),
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        });
      }
    const text = await zip.file('projects/esc/newsletter.jarrang.json').async('string');
    files.push({
      webkitRelativePath: 'repo/projects/esc/newsletter.jarrang.json',
      size: text.length,
      text: async () => text,
    });
    const loaded = (await M.readRepository(files, W))[0];
    assert.equal(loaded.modules[1].source, p.modules[1].source);
    assert.equal(loaded.modules[1].name, p.modules[1].name);
    assert.equal(loaded.modules[1].slug, p.modules[1].slug);
    assert.equal(loaded.modules[1].release, '99.0.0');
    assert.match(M.problems(loaded.modules[1]).join(' '), /identity, folder and version/);
    assert.equal(loaded.modules[1].iconAssets, undefined);
    assert.equal(loaded.modules[1].iconColour, '#123456');
    assert.equal(loaded.modules[1].exportedDefinition.name, projects[0].modules[1].name);
    const originalPage = files.find((f) =>
      f.webkitRelativePath.endsWith('/' + projects[0].modules[1].slug + '/index.html'),
    );
    const originalText = await originalPage.text();
    originalPage.text = async () =>
      originalText.replace(/("name"\s*:\s*)"[^"]*"/, '$1"Changed outside Studio"');
    await assert.rejects(
      () => M.readRepository(files, W),
      /differ/,
      'draft folder edits must not skip verification of the registered page',
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('the last exported schema catches later removals without overwriting newer draft content', async () => {
  const { BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    const p = clone(projects[0]),
      m = p.modules[0];
    m.fields.push({
      id: 'new',
      key: 'new',
      type: 'text',
      label: 'New field',
      enabled: true,
      binding: 'template',
      targets: [],
      defaultValue: '',
      required: false,
      maxLength: 0,
    });
    const snapshot = clone(E.definition(m));
    m.name = 'Newer draft';
    M.recordExport(p, [snapshot]);
    assert.equal(m.name, 'Newer draft');
    assert.equal(m.exportedDefinition.name, snapshot.name);
    m.fields.pop();
    assert.match(M.problems(m).join(' '), /New field/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('text-to-rich-text conversion updates repeated values and expressions together', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    delete m.published;
    delete m.exportedDefinition;
    const list = m.fields[0],
      child = list.itemFields[0];
    list.defaultValue[0][child.key] = '<b>literal</b>';
    const before = C.render(m);
    let saved;
    F.open(m, list, (f, result) => (saved = result?.draft));
    const dialog = dom.document.querySelector('dialog');
    const type = labelled(dialog.querySelector('.item-field-card'), 'Item field type');
    type.value = 'richtext';
    type.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved, dialog.querySelector('[role=alert]').textContent);
    assert.equal(C.render(saved), before);
    assert.match(saved.source, new RegExp('item\\.' + child.key + ' \\| richtext'));
    const rows = clone(saved.fields[0].defaultValue);
    rows[0][child.key] = '<strong>Bold</strong>';
    assert.match(C.render(saved, { [list.id]: rows }), /<strong>Bold<\/strong>/);
    assert.equal(list.defaultValue[0][child.key], '<b>literal</b>');
    dialog.remove();
    const rich = saved;
    rich.fields[0].defaultValue[0][child.key] = '<strong>Bold</strong><br>Next';
    F.open(rich, rich.fields[0], (f, result) => (saved = result?.draft));
    const plainDialog = dom.document.querySelector('dialog');
    const plainType = labelled(plainDialog.querySelector('.item-field-card'), 'Item field type');
    plainType.value = 'text';
    plainType.dispatchEvent(new dom.Event('change', { bubbles: true }));
    assert.match(plainDialog.textContent, /removes formatting/);
    click(plainDialog, 'Save field');
    assert.equal(saved.fields[0].defaultValue[0][child.key], 'Bold\nNext');
    assert.ok(!saved.source.includes('item.' + child.key + ' | richtext'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('item-key renames update references and rows atomically while published keys stay locked', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    F.open(m, m.fields[0], () => {});
    let dialog = dom.document.querySelector('dialog');
    assert.equal(
      labelled(dialog.querySelector('.item-field-card'), 'Item template key').disabled,
      true,
    );
    dialog.remove();
    delete m.published;
    delete m.exportedDefinition;
    const before = C.render(m);
    let saved;
    F.open(m, m.fields[0], (f, result) => (saved = result?.draft));
    dialog = dom.document.querySelector('dialog');
    const key = labelled(dialog.querySelector('.item-field-card'), 'Item template key');
    key.value = 'renamed_title';
    key.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved, dialog.querySelector('[role=alert]').textContent);
    assert.equal(C.render(saved), before);
    assert.match(saved.source, /item\.renamed_title/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('field-reference changes respect loop scope, literal strings and AMPscript', async () => {
  const { BlockFieldTransforms: T, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    const f = m.fields[0],
      next = clone(f);
    next.key = 'links';
    m.source =
      "%%[ SET @value = 'nav_links' ]%%{% for nav_links in nav_links %}{{ nav_links.title }}{% endfor %}";
    const updated = T.apply(m, f, next);
    assert.match(updated.source, /for nav_links in links/);
    assert.match(updated.source, /{{ nav_links.title }}/);
    assert.match(updated.source, /SET @value = 'nav_links'/);
    assert.equal(JSON.stringify(C.templateProblems(updated)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('formatted-text conversion cannot insert markup into an attribute connection', async () => {
  const { BlockFieldTransforms: T, BlockCore: C, dom } = await environment();
  try {
    const f = C.templateField({ fields: [] }, 'text', 'Label');
    f.key = 'label';
    f.defaultValue = 'Label';
    const m = {
      source: '<img alt="{{ label }}" src="https://example.com/a.png">',
      templateMode: true,
      fields: [f],
    };
    assert.throws(() => T.apply(m, f, { ...f, type: 'richtext' }), /HTML attribute/);
    assert.equal(m.fields[0].type, 'text');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repeater actions retain focus on the new, moved or neighbouring item', async () => {
  const { BlockControls: B, dom } = await environment();
  try {
    const f = clone(projects[0].modules.find((m) => m.slug === 'navigation').fields[0]);
    f.minItems = 0;
    f.maxItems = 10;
    f.defaultValue = f.defaultValue.slice(0, 1);
    const container = dom.document.createElement('div');
    dom.document.body.append(container);
    B.mount(container, [f], {}, () => {});
    const cards = () => [...container.querySelectorAll('.repeat-card')];
    const add = container.querySelector('.add-repeat-item');
    add.focus();
    add.click();
    assert.ok(cards()[1].contains(dom.document.activeElement));
    click(cards()[1], '↑');
    assert.ok(cards()[0].contains(dom.document.activeElement));
    click(cards()[0], 'Duplicate');
    assert.ok(cards()[1].contains(dom.document.activeElement));
    click(cards()[1], 'Remove');
    assert.ok(cards()[1].contains(dom.document.activeElement));
    while (cards().length) click(cards()[0], 'Remove');
    assert.equal(dom.document.activeElement, container.querySelector('.add-repeat-item'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('every ESC conditional expression has a supported guided editor model', async () => {
  const { BlockTemplateRules: R, BlockLogic: L, dom } = await environment();
  try {
    let count = 0;
    for (const p of projects)
      for (const m of p.modules) {
        const rules = new Map(m.fields.flatMap((f) => R.rules(m, f)).map((r) => [r.start, r]));
        const conditions = [...m.source.matchAll(/{%\s*(?:if|elsif|elseif)\s+([\s\S]*?)%}/g)];
        assert.equal(rules.size, conditions.length, m.slug);
        for (const rule of rules.values()) {
          assert.ok(rule.model, m.slug + ': ' + rule.condition);
          const scope = Object.fromEntries(
            m.fields.map((f) => [
              f.key || f.id,
              f.type === 'toggle' ? f.defaultValue === 'shown' : f.defaultValue,
            ]),
          );
          for (const operand of rule.operands) {
            const parts = operand.path.split('.');
            if (parts.length === 2) {
              scope[parts[0]] ||= {};
              scope[parts[0]][parts[1]] =
                operand.field.defaultValue ?? (operand.field.type === 'boolean' ? true : 1);
            }
          }
          assert.equal(
            L.evaluate(R.expression(rule.model), scope),
            L.evaluate(rule.condition, scope),
          );
          count++;
        }
      }
    assert.equal(count, 237);
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC field settings and layout rules can be opened and saved without changing rendered content', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    for (const p of projects)
      for (const original of p.modules)
        for (const field of original.fields) {
          const m = clone(original);
          const before = C.render(m);
          let saved;
          F.open(m, field, (f, result) => {
            saved = result?.draft || {
              ...m,
              fields: m.fields.map((old) => (old.id === f.id ? f : old)),
            };
          });
          const dialog = dom.document.querySelector('dialog');
          click(dialog, 'Where it applies');
          click(dialog, 'Advanced');
          click(dialog, 'Save field');
          assert.ok(
            saved,
            m.slug + ' / ' + field.label + ': ' + dialog.querySelector('[role=alert]').textContent,
          );
          assert.equal(C.render(saved), before, m.slug + ' / ' + field.label);
          dialog.remove();
        }
  } finally {
    await dom.happyDOM.close();
  }
});
test('guided dropdown rule edits are transactional, change the correct branch and keep AMPscript', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'section-header'));
    const field = m.fields.find((f) => f.key === 'theme');
    const original = JSON.stringify(m);
    let saved;
    function edit() {
      F.open(m, field, (f, result) => {
        saved = result.draft;
      });
      const dialog = dom.document.querySelector('dialog');
      click(dialog, 'Where it applies');
      for (const card of dialog.querySelectorAll('.template-rule-card')) {
        const value = labelled(card, 'Compare with');
        value.value = 'light';
        value.dispatchEvent(new dom.Event('change', { bubbles: true }));
      }
      return dialog;
    }
    let dialog = edit();
    click(dialog, 'Cancel');
    assert.equal(JSON.stringify(m), original);
    assert.equal(saved, undefined);
    dialog.remove();
    dialog = edit();
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.equal(C.render(saved), C.render(m, { [field.id]: 'dark' }));
    assert.equal(JSON.stringify(m), original);
    assert.deepEqual(
      [...saved.source.matchAll(/%%[\s\S]*?%%/g)].map((m) => m[0]),
      [...m.source.matchAll(/%%[\s\S]*?%%/g)].map((m) => m[0]),
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('all ESC repeating groups support single-item conversion including counters and optional child content', async () => {
  const { BlockRepeatBuilder: B, BlockCore: C, dom } = await environment();
  try {
    for (const p of projects)
      for (const original of p.modules)
        for (const field of original.fields.filter((f) => f.type === 'list')) {
          const result = B.singleDraft(original, field.id, field.defaultValue.length - 1);
          const m = clone(original);
          const list = m.fields.find((f) => f.id === field.id);
          list.minItems = 0;
          list.defaultValue = [list.defaultValue.at(-1)];
          assert.equal(C.render(result.draft), C.render(m), original.slug + ' / ' + field.label);
          assert.equal(JSON.stringify(C.templateProblems(result.draft)), '[]');
        }
  } finally {
    await dom.happyDOM.close();
  }
});
test('guided combined, toggle and item-position rules save valid typed expressions', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(
      projects
        .flatMap((p) => p.modules)
        .find((m) => m.source.includes('show_format_badge and format_badge')),
    );
    const field = m.fields.find((f) => f.key === 'show_format_badge');
    let saved;
    F.open(m, field, (f, result) => {
      saved = result.draft;
    });
    let dialog = dom.document.querySelector('dialog');
    click(dialog, 'Where it applies');
    const card = dialog.querySelector('.template-rule-card');
    const join = labelled(card, 'Match conditions');
    join.value = 'or';
    join.dispatchEvent(new dom.Event('change', { bubbles: true }));
    const op = labelled(card, 'Condition');
    op.value = '==';
    op.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.match(saved.source, /show_format_badge == true or format_badge/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
    dialog.remove();
    const nav = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    F.open(nav, nav.fields[0], (f, result) => {
      saved = result.draft;
    });
    dialog = dom.document.querySelector('dialog');
    click(dialog, 'Where it applies');
    const numeric = labelled(dialog.querySelector('.template-rule-card'), 'Compare with');
    numeric.value = '2';
    numeric.dispatchEvent(new dom.Event('input', { bubbles: true }));
    click(dialog, 'Save field');
    assert.match(saved.source, /forloop.index > 2/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
    assert.equal(JSON.stringify(C.parse(C.render(saved)).issues), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repeated item guidance and validation can be edited through the field editor', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    const field = m.fields[0];
    let saved;
    F.open(m, field, (f) => {
      saved = f;
    });
    const dialog = dom.document.querySelector('dialog');
    const card = dialog.querySelector('.item-field-card');
    const help = labelled(card, 'Help for your client');
    help.value = 'Keep the navigation label short.';
    help.dispatchEvent(new dom.Event('input', { bubbles: true }));
    const limit = labelled(card, 'Character limit');
    limit.value = '120';
    limit.dispatchEvent(new dom.Event('input', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.equal(saved.itemFields[0].help, help.value);
    assert.equal(saved.itemFields[0].maxLength, 120);
    assert.match(C.validate(saved.itemFields[0], 'x'.repeat(121)), /120/);
    assert.notEqual(field.itemFields[0].help, help.value);
  } finally {
    await dom.happyDOM.close();
  }
});
test('all 40 ESC modules retain their exported definition and supplied PNG pair', async () => {
  const { BlockCore: C, BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    assert.equal(
      projects.reduce((n, p) => n + p.modules.length, 0),
      40,
    );
    for (const p of projects) {
      C.assertProject(p);
      for (const m of p.modules) {
        const folder = path.join(
          root,
          'docs/clients/esc',
          p.settings.templateSlug,
          'modules',
          m.slug,
        );
        const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
        const definition = JSON.parse(
          page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1],
        );
        assert.deepEqual(JSON.parse(JSON.stringify(E.definition(m))), definition, m.slug);
        assert.equal(JSON.stringify(E.problems(m)), '[]', m.slug);
        assert.equal(JSON.stringify(M.problems(m)), '[]', m.slug);
        for (const [key, name] of [
          ['icon', 'icon.png'],
          ['dragIcon', 'dragIcon.png'],
        ])
          assert.deepEqual(
            Buffer.from(m.iconAssets[key], 'base64'),
            fs.readFileSync(path.join(folder, name)),
          );
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC defaults, all dropdown options, both toggle states and repeater limits render', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    let cases = 0;
    for (const p of projects)
      for (const m of p.modules) {
        const before = JSON.stringify(m);
        const check = (values) => {
          const out = C.render(m, values);
          assert.ok(!/{[{%]/.test(out), m.slug);
          assert.equal(JSON.stringify(C.parse(out).issues), '[]', m.slug + ': rendered structure');
          cases++;
        };
        check({});
        for (const f of m.fields) {
          if (f.type === 'select') for (const o of f.options) check({ [f.id]: o.value });
          if (f.type === 'toggle') for (const v of ['shown', 'hidden']) check({ [f.id]: v });
          if (f.type === 'list')
            for (const length of [f.minItems, f.maxItems]) {
              const item = Object.fromEntries(f.itemFields.map((c) => [c.key, c.defaultValue]));
              check({ [f.id]: Array.from({ length }, () => clone(item)) });
            }
        }
        assert.equal(JSON.stringify(m), before);
      }
    assert.ok(cases > 150);
  } finally {
    await dom.happyDOM.close();
  }
});
test('HTML fixes preserve ESC fields and AMPscript, and both template ZIPs retain every icon', async () => {
  const { BlockCore: C, BlockQuickEdit: Q, BlockExport: E, dom } = await environment();
  try {
    for (const p of projects) {
      for (const m of p.modules) {
        const draft = Q.validate(m, Q.patch(m, '<!-- Maintenance check -->\n' + m.source));
        assert.equal(C.render(draft), '<!-- Maintenance check -->\n' + C.render(m));
        assert.deepEqual(
          [...draft.source.matchAll(/%%[\s\S]*?%%/g)].map((x) => x[0]),
          [...m.source.matchAll(/%%[\s\S]*?%%/g)].map((x) => x[0]),
        );
        assert.deepEqual(
          clone(draft.fields.map((f) => f.id)),
          m.fields.map((f) => f.id),
        );
      }
      const blob = await E.build(p, p.modules, { ...p.settings, fullTemplate: true });
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      for (const m of p.modules) {
        const folder = 'docs/clients/esc/' + p.settings.templateSlug + '/modules/' + m.slug + '/';
        for (const [key, name] of [
          ['icon', 'icon.png'],
          ['dragIcon', 'dragIcon.png'],
        ])
          assert.deepEqual(
            await zip.file(folder + name).async('nodebuffer'),
            Buffer.from(m.iconAssets[key], 'base64'),
          );
        const page = await zip.file(folder + 'index.html').async('string');
        assert.match(page, /runtime(?:\.rich)?\.bundle\.js/);
        const ref = page.match(/<script src="([^"]+runtime(?:\.rich)?\.bundle\.js)"/)[1];
        assert.ok(zip.file(path.posix.normalize(path.posix.join(folder, ref))));
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('maintenance permits copy and layout changes but blocks incompatible saved-field changes', async () => {
  const { BlockMaintenance: M, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    m.source = '<!-- CSS fix -->' + m.source;
    m.name = 'New display name';
    m.fields[0].label = 'New label';
    assert.equal(JSON.stringify(M.problems(m)), '[]');
    m.fields[0].itemFields[0].key = 'renamed';
    assert.match(M.problems(m).join(' '), /saved values/);
    const other = clone(projects[0].modules[0]);
    other.release = '99.0.0';
    assert.match(M.problems(other).join(' '), /identity, folder and version/);
    delete other.published;
    assert.equal(JSON.stringify(M.problems(other)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repository folder import preserves both templates and rejects drift before changing browser drafts', async () => {
  const { BlockMaintenance: M, BlockWorkspace: W, dom } = await environment();
  try {
    const files = [];
    const add = (relative) => {
      const data = fs.readFileSync(path.join(root, relative));
      files.push({
        webkitRelativePath: 'repository/' + relative,
        size: data.length,
        text: async () => data.toString(),
        arrayBuffer: async () =>
          data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      });
    };
    for (const p of projects) {
      add('projects/esc/' + p.settings.templateSlug + '.jarrang.json');
      for (const m of p.modules)
        for (const file of ['index.html', 'icon.png', 'dragIcon.png'])
          add('docs/clients/esc/' + p.settings.templateSlug + '/modules/' + m.slug + '/' + file);
    }
    const loaded = await M.readRepository(files, W);
    assert.equal(loaded.length, 2);
    const workspace = W.create(projects[0]);
    const before = JSON.stringify(workspace);
    const next = M.importBatch(workspace, loaded, W);
    assert.equal(next.projects.length, 2);
    assert.equal(next.repository.baseUrl, projects[0].settings.baseUrl);
    assert.equal(JSON.stringify(workspace), before);
    const page = files.find((f) => f.webkitRelativePath.endsWith('/hero-story/index.html'));
    await assert.rejects(
      () =>
        M.readRepository(
          files.filter((f) => f !== page),
          W,
        ),
      /missing.*exported page/i,
    );
    const original = await page.text();
    page.text = async () => original.replace(/("name"\s*:\s*)"[^"]*"/, '$1"Changed name"');
    await assert.rejects(() => M.readRepository(files, W), /differ/);
    assert.equal(JSON.stringify(workspace), before);
    assert.throws(() => M.importBatch(workspace, [loaded[0], loaded[0]], W), /duplicate/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('all-branch validation catches a removed child key in an inactive branch or empty list', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = {
      templateMode: true,
      source: '{% if show %}{% for item in items %}{{ item.missing }}{% endfor %}{% endif %}',
      fields: [
        { id: 'show', type: 'toggle', defaultValue: 'hidden', enabled: true },
        {
          id: 'items',
          type: 'list',
          enabled: true,
          defaultValue: [],
          itemFields: [{ key: 'label', type: 'text', defaultValue: 'Item' }],
        },
      ],
    };
    assert.match(C.templateProblems(m).join(' '), /item.missing/);
    m.source = m.source.replace('item.missing', 'item.label');
    assert.equal(JSON.stringify(C.templateProblems(m)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('standalone UI boots with both ESC templates and previews supplied icons without regenerating them', async () => {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  try {
    const html = fs.readFileSync(path.join(root, 'block-studio/index.html'), 'utf8');
    dom.document.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
    const context = vm.createContext({
      window: { addEventListener: dom.addEventListener.bind(dom) },
      document: dom.document,
      DOMParser: dom.DOMParser,
      NodeFilter: dom.NodeFilter,
      URL,
      Blob,
      JSZip,
      Uint8Array,
      btoa,
      localStorage: dom.localStorage,
      crypto: require('node:crypto').webcrypto,
      setTimeout: () => 0,
      clearTimeout() {},
      getComputedStyle: dom.getComputedStyle.bind(dom),
    });
    for (const file of [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map((m) => m[1]))
      vm.runInContext(fs.readFileSync(path.join(root, 'block-studio', file), 'utf8'), context);
    const d = dom.document,
      W = context.window.BlockWorkspace;
    const saved = JSON.parse(dom.localStorage.getItem(W.KEY));
    assert.equal(saved.projects.length, 2);
    assert.equal(d.getElementById('step-map').hidden, false);
    assert.equal(
      saved.projects.reduce((n, p) => n + p.modules.length, 0),
      40,
    );
    d.getElementById('task-export').click();
    assert.equal(d.getElementById('icon-symbol').value, '__supplied');
    assert.equal(d.getElementById('icon-colour').disabled, true);
    assert.match(d.getElementById('block-icon-preview').src, /^data:image\/png;base64,iVBOR/);
    // Reloading the same Studio preserves an edited browser draft.
    saved.projects[0].modules[0].name = 'Browser draft name';
    dom.localStorage.setItem(W.KEY, JSON.stringify(saved));
    vm.runInContext(fs.readFileSync(path.join(root, 'block-studio/src/app.js'), 'utf8'), context);
    const reloaded = JSON.parse(dom.localStorage.getItem(W.KEY));
    assert.equal(reloaded.projects[0].modules[0].name, 'Browser draft name');
  } finally {
    await dom.happyDOM.close();
  }
});

test('all 40 ESC modules retain exact output, fields, references and PNGs through undo and exported-content recovery', async () => {
  const { BlockCore: C, dom } = await environment();
  const H = require('../src/history.js');
  try {
    for (const project of projects)
      for (const original of project.modules) {
        const m = clone(original),
          h = H.create();
        h.track(m);
        const output = C.render(m),
          initial = H.snapshot(m);
        const reference = JSON.stringify(m.exportedDefinition),
          published = JSON.stringify(m.published);
        const icons = JSON.stringify(m.iconAssets);
        C.rebase(m, [{ start: 0, end: 0, value: '<!-- maintenance fix -->' }]);
        m.fields.reverse();
        h.capture(m);
        const edited = H.snapshot(m),
          editedOutput = C.render(m);
        h.undo(m);
        assert.equal(H.snapshot(m), initial, m.slug);
        assert.equal(C.render(m), output, m.slug);
        h.redo(m);
        assert.equal(H.snapshot(m), edited, m.slug);
        assert.equal(C.render(m), editedOutput, m.slug);
        H.restoreExportedContent(m);
        h.capture(m, 'restore last exported content');
        assert.equal(C.render(m), output, m.slug);
        assert.equal(JSON.stringify(m.fields), JSON.stringify(original.fields), m.slug);
        assert.equal(JSON.stringify(m.iconAssets), icons, m.slug);
        assert.equal(JSON.stringify(m.exportedDefinition), reference, m.slug);
        assert.equal(JSON.stringify(m.published), published, m.slug);
        h.undo(m);
        assert.equal(H.snapshot(m), edited, m.slug);
      }
  } finally {
    await dom.happyDOM.close();
  }
});
