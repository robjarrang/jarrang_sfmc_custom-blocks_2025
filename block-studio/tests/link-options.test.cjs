const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../src/core.js');
const clone = (v) => JSON.parse(JSON.stringify(v));
const url = (id, key = id) => ({
  id,
  key,
  type: 'url',
  label: id,
  binding: 'template',
  enabled: true,
  targets: [],
  defaultValue: 'https://example.com/',
  allowConversionTracking: true,
  allowLinkTitle: true,
  allowTrackingAlias: true,
});
const flags = (choices) => ({ [C.conversionKey]: choices });
const moduleFor = (source, fields) => ({
  id: 'module',
  name: 'Module',
  slug: 'module',
  release: '1.0.0',
  source,
  templateMode: true,
  fields,
});
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
    window: dom,
    document: dom.document,
    DOMParser: dom.DOMParser,
    URL,
    CustomEvent: dom.CustomEvent,
    NodeFilter: dom.NodeFilter,
    console,
  });
  for (const name of [
    'logic',
    'runtime-core',
    'html-validation',
    'core',
    'rich-editor',
    'controls',
    'field-catalog',
    'template-rules',
    'field-transforms',
    'code-editor',
    'repeat-builder',
    'field-editor',
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, '../src/' + name + '.js'), 'utf8'),
      context,
    );
  return dom;
}
const options = (saved) => ({ [C.linkOptionsKey]: saved });
const labelled = (parent, caption) => {
  const label = [...parent.querySelectorAll('label')].find((n) => n.textContent === caption);
  return parent.querySelector('#' + label.htmlFor);
};
test('mapped links preserve imported titles/aliases and safely edit, clear and distinguish them', () => {
  const source =
    '<a href="https://example.com/" title=Hello alias="one&amp;two">One</a><a href="https://example.com/">Two</a>%%[ SET @colour = "#fff" ]%%';
  const m = { source, fields: C.infer(source).fields };
  const fields = m.fields.filter((f) => f.type === 'url');
  assert.equal(C.render(m), source);
  const out = C.render(
    m,
    options({
      [fields[0].id]: { title: '', alias: 'A" & <B>' },
      [fields[1].id]: { title: 'Second', alias: 'second_cta' },
    }),
  );
  assert.ok(!out.includes('title=Hello'));
  assert.ok(out.includes('alias="A&quot; &amp; &lt;B&gt;"'));
  assert.ok(out.includes('title="Second"'));
  assert.ok(out.endsWith('%%[ SET @colour = "#fff" ]%%'));
  assert.equal(m.source, source);
});
test('template and nested repeated links use independent options, defaults and empty overrides', () => {
  const child = {
    ...url('u', 'href'),
    defaultLinkTitle: 'Default',
    defaultTrackingAlias: 'default_alias',
  };
  const inner = {
    id: 'inner',
    key: 'inner',
    type: 'list',
    label: 'Inner',
    enabled: true,
    targets: [],
    itemFields: [child],
    defaultValue: [],
  };
  const outer = {
    id: 'outer',
    key: 'outer',
    type: 'list',
    label: 'Outer',
    enabled: true,
    targets: [],
    itemFields: [inner],
    defaultValue: [
      {
        inner: [
          { href: child.defaultValue, ...options({ href: { title: 'First', alias: 'first' } }) },
          { href: child.defaultValue, ...options({ href: { title: '', alias: '' } }) },
          { href: child.defaultValue },
        ],
      },
    ],
  };
  const m = moduleFor(
    '{% for row in outer %}{% for link in row.inner %}<a href="{{ link.href | escape }}">Open</a>{% endfor %}{% endfor %}',
    [outer],
  );
  const out = C.render(m);
  assert.equal((out.match(/title=/g) || []).length, 2);
  assert.ok(out.includes('title="First"'));
  assert.ok(out.includes('alias="default_alias"'));
  assert.deepEqual(C.conversionProblems(m), []);
});
test('disabled options and template-controlled attributes retain authored content', () => {
  const f = url('link');
  f.allowLinkTitle = false;
  const m = moduleFor('<a href="{{ link }}" title="{{ title }}" alias="static">Open</a>', [
    f,
    {
      id: 'title',
      key: 'title',
      type: 'text',
      enabled: true,
      targets: [],
      defaultValue: 'Authored',
    },
  ]);
  const out = C.render(m, options({ link: { title: 'Client', alias: 'client_alias' } }));
  assert.ok(out.includes('title="Authored"'));
  assert.ok(out.includes('alias="client_alias"'));
  f.allowLinkTitle = true;
  assert.ok(C.conversionProblems(m).some((e) => e.includes('Title is already controlled')));
  assert.ok(
    C.conversionProblems(moduleFor('<a href="https://example.com/{{ link }}">Open</a>', [f]))
      .length,
  );
});
test('invalid top-level and item metadata are rejected and reserved keys cannot become fields', () => {
  const m = moduleFor('<a href="{{ link }}">Open</a>', [url('link')]);
  for (const value of [
    null,
    [],
    { link: null },
    { link: { title: true } },
    { link: { alias: {} } },
    { link: { onclick: 'alert(1)' } },
  ])
    assert.throws(() => C.render(m, { [C.linkOptionsKey]: value }));
  const f = { type: 'list', itemFields: [url('u', 'href')] };
  assert.ok(
    C.valueShape(f, [{ href: 'https://example.com/', ...options({ href: { alias: 1 } }) }]),
  );
  assert.ok(C.fieldProblems({ ...url('link'), key: C.linkOptionsKey }).length);
});
test('URL controls share a collapsed, labelled options section and retain values after reopening', async () => {
  const dom = await environment();
  try {
    const parent = dom.document.createElement('div');
    const f = {
      ...url('link'),
      defaultLinkTitle: 'Default title',
      defaultTrackingAlias: 'registration',
    };
    const values = { link: f.defaultValue };
    let changes = 0;
    dom.BlockControls.mount(parent, [f], values, () => changes++);
    assert.equal(parent.querySelector('details').open, false);
    assert.equal(parent.querySelector('summary').textContent, 'Link options');
    assert.equal(labelled(parent, 'Title').value, 'Default title');
    const alias = labelled(parent, 'Tracking Alias');
    alias.value = 'updated';
    alias.dispatchEvent(new dom.Event('input'));
    assert.equal(changes, 1);
    assert.equal(values.link, f.defaultValue);
    dom.BlockControls.mount(parent, [f], clone(values), () => {});
    assert.equal(labelled(parent, 'Tracking Alias').value, 'updated');
    const title = labelled(parent, 'Title');
    title.value = '';
    title.dispatchEvent(new dom.Event('input'));
    assert.ok(parent.querySelector('details .conversion-option'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('repeating item duplication, reordering and single-item conversion preserve link settings', async () => {
  const dom = await environment();
  try {
    const child = url('u', 'href');
    const list = {
      id: 'links',
      key: 'links',
      type: 'list',
      label: 'Links',
      enabled: true,
      binding: 'template',
      targets: [],
      minItems: 0,
      maxItems: 5,
      itemFields: [child],
      defaultValue: [
        {
          href: child.defaultValue,
          ...options({ href: { title: 'Chosen', alias: 'chosen_cta' } }),
        },
      ],
    };
    const values = { links: clone(list.defaultValue) },
      parent = dom.document.createElement('div');
    dom.BlockControls.mount(parent, [list], values, () => {});
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Duplicate').click();
    assert.equal(values.links[1][C.linkOptionsKey].href.alias, 'chosen_cta');
    const m = moduleFor('{% for item in links %}<a href="{{ item.href }}">Open</a>{% endfor %}', [
      list,
    ]);
    const result = dom.BlockRepeatBuilder.singleDraft(m, 'links', 0);
    assert.equal(result.fields[0].defaultLinkTitle, 'Chosen');
    assert.equal(result.fields[0].defaultTrackingAlias, 'chosen_cta');
    assert.ok(dom.BlockCore.render(result.draft).includes('alias="chosen_cta"'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('formatted-text link dialogue inserts and reopens options while preserving fixed styles', async () => {
  const dom = await environment();
  try {
    const parent = dom.document.createElement('div');
    dom.document.body.append(parent);
    const f = {
      ...url('body'),
      type: 'richtext',
      defaultLinkTitle: 'Registration',
      defaultTrackingAlias: 'registration',
      linkStyle: { colour: '#123456', decoration: 'underline', weight: 'bold' },
    };
    let value = '';
    const editor = dom.BlockRichText.mount(parent, f, 'Register now', (html) => (value = html));
    const select = (node, collapsed = false) => {
      const range = dom.document.createRange();
      range.selectNodeContents(node);
      if (collapsed) range.collapse(true);
      dom.getSelection().removeAllRanges();
      dom.getSelection().addRange(range);
      editor.dispatchEvent(new dom.Event('mouseup'));
    };
    select(editor);
    parent.querySelector('[aria-label="Add or edit link"]').click();
    labelled(parent, 'Link destination').value = 'https://example.com/register';
    const title = labelled(parent, 'Title');
    title.value = 'Register & join';
    title.dispatchEvent(new dom.Event('input'));
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Insert link').click();
    assert.ok(value.includes('title="Register &amp; join"'));
    assert.ok(value.includes('alias="registration"'));
    assert.ok(value.includes('color:#123456'));
    select(editor.querySelector('a'), true);
    parent.querySelector('[aria-label="Add or edit link"]').click();
    assert.equal(labelled(parent, 'Title').value, 'Register & join');
    const alias = labelled(parent, 'Tracking Alias');
    alias.value = '';
    alias.dispatchEvent(new dom.Event('input'));
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Update link').click();
    assert.ok(!value.includes('alias='));
    const clean = dom.BlockCore.cleanRich(
      '<a href="https://example.com" title="A&quot;B" alias="track" onclick="alert(1)" style="color:red">Link</a>',
      f,
    );
    assert.ok(clean.includes('title="A&quot;B"'));
    assert.ok(clean.includes('alias="track"'));
    assert.ok(!clean.includes('onclick'));
    assert.ok(!clean.includes('color:red'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('field settings expose permissions/defaults without replacing the URL or test values', async () => {
  const dom = await environment();
  try {
    const f = url('link'),
      m = moduleFor('<a href="{{ link }}">Open</a>', [f]);
    let saved;
    dom.BlockFieldEditor.open(m, f, (field) => (saved = field));
    const dialog = dom.document.querySelector('.field-dialog');
    const title = labelled(dialog, 'Default Title');
    title.value = 'Register';
    title.dispatchEvent(new dom.Event('input'));
    const alias = labelled(dialog, 'Default Tracking Alias');
    alias.value = 'cta';
    alias.dispatchEvent(new dom.Event('input'));
    [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Save field').click();
    assert.equal(saved.defaultLinkTitle, 'Register');
    assert.equal(saved.defaultTrackingAlias, 'cta');
    assert.equal(saved.defaultValue, f.defaultValue);
  } finally {
    await dom.happyDOM.close();
  }
});
test('SFMC runtime reopens and saves Title/Alias metadata without replacing URLs or conversion choices', async () => {
  const dom = await environment();
  try {
    const definition = moduleFor('<a href="{{ link }}">Register</a>', [url('link')]);
    dom.document.body.innerHTML =
      '<script id="block-definition" type="application/json"></script><fieldset id="fields"></fieldset><p id="status"></p><h1 id="block-name"></h1>';
    dom.document.getElementById('block-definition').textContent = JSON.stringify(definition);
    const saved = {
      unrelated: 'keep',
      studio: {
        schemaVersion: 1,
        moduleId: definition.id,
        moduleVersion: definition.release,
        blockId: 'saved-id',
        values: {
          link: 'https://example.com/saved',
          ...flags({ link: true }),
          ...options({ link: { title: 'Saved title', alias: 'saved_alias' } }),
        },
      },
    };
    const calls = [];
    let next = 0;
    const timers = new Map();
    const sdk = {
      getData(cb) {
        cb(saved);
      },
      getContent() {
        throw Error('Saved instances must not be reinitialised');
      },
      setContent(html, cb) {
        calls.push({ html });
        cb?.(html);
      },
      setData(data, cb) {
        calls.push({ data });
        cb?.(data);
      },
    };
    const window = {
      BlockCore: dom.BlockCore,
      BlockControls: dom.BlockControls,
      parent: {},
      sfdc: {
        BlockSDK: function () {
          return sdk;
        },
      },
      addEventListener() {},
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/runtime.js'), 'utf8'), {
      window,
      document: dom.document,
      crypto: { randomUUID: () => 'id' },
      setTimeout(fn, ms) {
        const id = ++next;
        timers.set(id, { fn, ms });
        return id;
      },
      clearTimeout(id) {
        timers.delete(id);
      },
    });
    assert.equal(labelled(dom.document, 'Title').value, 'Saved title');
    const alias = labelled(dom.document, 'Tracking Alias');
    assert.equal(alias.value, 'saved_alias');
    alias.value = 'updated_alias';
    alias.dispatchEvent(new dom.Event('input'));
    const check = dom.document.querySelector('[type=checkbox]');
    assert.equal(check.checked, true);
    assert.equal(dom.document.querySelector('[type=text]').value, saved.studio.values.link);
    check.checked = false;
    check.dispatchEvent(new dom.Event('change'));
    for (const [id, timer] of [...timers])
      if (timer.ms === 200) {
        timers.delete(id);
        timer.fn();
      }
    assert.ok(!calls.find((c) => c.html)?.html.includes('conversion='));
    const data = calls.find((c) => c.data).data;
    assert.equal(data.studio.values.link, saved.studio.values.link);
    assert.equal(data.studio.values[C.conversionKey].link, false);
    assert.equal(data.studio.values[C.linkOptionsKey].link.title, 'Saved title');
    assert.equal(data.studio.values[C.linkOptionsKey].link.alias, 'updated_alias');
    assert.equal(data.unrelated, 'keep');
    assert.equal(data.studio.blockId, 'saved-id');
    assert.equal(dom.document.getElementById('status').textContent, 'Saved in Content Builder');
  } finally {
    await dom.happyDOM.close();
  }
});
