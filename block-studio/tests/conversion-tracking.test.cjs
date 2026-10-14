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
test('source-mapped links keep URL strings and independent tracking choices, even for matching destinations', () => {
  const source =
    '<a href="https://example.com/">One</a><a href="https://example.com/">Two</a>%%[ SET @x = "keep" ]%%';
  const m = { source, fields: C.infer(source).fields };
  const links = m.fields.filter((f) => f.type === 'url');
  assert.equal(C.render(m), source);
  const values = {
    ...flags({ [links[0].id]: true, [links[1].id]: false }),
    [links[0].id]: 'https://example.com/?a=1&b=2',
  };
  const out = C.render(m, values);
  assert.equal((out.match(/conversion="true"/g) || []).length, 1);
  assert.ok(out.includes('href="https://example.com/?a=1&amp;b=2" conversion="true"'));
  assert.ok(out.endsWith('%%[ SET @x = "keep" ]%%'));
  assert.equal(m.source, source);
  assert.equal(typeof values[links[0].id], 'string');
});
test('template links track all connected anchors without affecting another field or missing legacy choices', () => {
  const m = moduleFor(
    '<a href="{{ first }}">A</a><a href="{{ first }}">B</a><a href="{{ second }}">C</a>',
    [url('first'), url('second')],
  );
  assert.equal((C.render(m, flags({ first: true })).match(/conversion="true"/g) || []).length, 2);
  assert.ok(!C.render(m).includes('conversion='));
  m.fields[0].defaultConversionTracking = true;
  assert.equal((C.render(m).match(/conversion="true"/g) || []).length, 2);
  assert.ok(!C.render(m, flags({ first: false })).includes('conversion='));
});
test('tracking insertion works at a template boundary and follows hidden branches', () => {
  const toggle = {
    id: 'show',
    key: 'show',
    type: 'toggle',
    label: 'Show',
    enabled: true,
    targets: [],
    defaultValue: 'shown',
  };
  const m = moduleFor(
    '{% if show %}<a href="{{ link }}"{% if show %} target="_blank"{% endif %}>A</a>{% endif %}',
    [url('link'), toggle],
  );
  assert.ok(C.render(m, flags({ link: true })).includes('target="_blank" conversion="true">'));
  assert.equal(C.render(m, { show: 'hidden', ...flags({ link: true }) }), '');
});
test('repeated and nested links use the matching item choice with scoped aliases', () => {
  const list = {
    id: 'links',
    key: 'links',
    type: 'list',
    label: 'Links',
    enabled: true,
    targets: [],
    minItems: 0,
    maxItems: 5,
    itemFields: [url('destination', 'href')],
    defaultValue: [
      { href: 'https://example.com/one', ...flags({ href: true }) },
      { href: 'https://example.com/two', ...flags({ href: false }) },
    ],
  };
  const m = moduleFor(
    '{% for entry in links %}<a href="{{ entry.href }}">{{ forloop.index }}</a>{% endfor %}',
    [list],
  );
  const out = C.render(m);
  assert.ok(out.includes('href="https://example.com/one" conversion="true">1'));
  assert.ok(out.includes('href="https://example.com/two">2'));
  const nested = {
    ...list,
    id: 'groups',
    key: 'groups',
    itemFields: [{ ...list, key: 'children' }],
    defaultValue: [{ children: list.defaultValue }],
  };
  const n = moduleFor(
    '{% for group in groups %}{% for entry in group.children %}<a href="{{ entry.href }}">A</a>{% endfor %}{% endfor %}',
    [nested],
  );
  assert.equal((C.render(n).match(/conversion="true"/g) || []).length, 1);
});
test('conversion stays restricted to web links and explicitly supported fields', () => {
  const m = moduleFor('<a href="{{ link }}">A</a>', [url('link')]);
  for (const link of ['mailto:hello@example.com', 'tel:+4412345', '#section', ''])
    assert.ok(!C.render(m, { link, ...flags({ link: true }) }).includes('conversion='));
  m.fields[0].allowConversionTracking = false;
  assert.ok(!C.render(m, flags({ link: true })).includes('conversion='));
  assert.throws(() => C.render(m, flags({ link: 'true' })), /on or off/);
});
test('existing static conversion attributes round-trip without duplication and can be unticked', () => {
  const source = '<a conversion="true" href="https://example.com/">A</a>';
  const m = { source, fields: C.infer(source).fields };
  const f = m.fields.find((f) => f.type === 'url');
  assert.equal(f.defaultConversionTracking, true);
  assert.equal((C.render(m).match(/conversion="true"/g) || []).length, 1);
  assert.ok(!C.render(m, flags({ [f.id]: false })).includes('conversion='));
});
test('URL checkbox is labelled, preserves its destination and works per repeated item', async () => {
  const dom = await environment();
  try {
    const f = url('link');
    const values = { link: f.defaultValue };
    const parent = dom.document.createElement('div');
    const changes = [];
    dom.document.body.append(parent);
    dom.BlockControls.mount(parent, [f], values, (field, value) => changes.push([field.id, value]));
    const check = parent.querySelector('[type=checkbox]');
    assert.ok(check);
    assert.equal(check.checked, false);
    assert.equal(check.parentElement.textContent, 'Conversion Tracking Link');
    check.checked = true;
    check.dispatchEvent(new dom.Event('change'));
    assert.equal(values[C.conversionKey].link, true);
    assert.equal(values.link, f.defaultValue);
    assert.deepEqual(changes, [['link', f.defaultValue]]);
    const input = parent.querySelector('input[type=text]');
    input.value = 'mailto:a@example.com';
    input.dispatchEvent(new dom.Event('input'));
    assert.equal(check.disabled, true);
    const list = {
      id: 'items',
      label: 'Items',
      type: 'list',
      itemFields: [url('u', 'href')],
      defaultValue: [{ href: f.defaultValue }],
      minItems: 0,
      maxItems: 3,
    };
    const rows = {};
    dom.BlockControls.mount(parent, [list], rows, () => {});
    const first = parent.querySelector('[type=checkbox]');
    first.checked = true;
    first.dispatchEvent(new dom.Event('change'));
    assert.equal(rows.items[0][C.conversionKey].href, true);
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Duplicate').click();
    assert.equal(rows.items[1][C.conversionKey].href, true);
    [...parent.querySelectorAll('button')].find((b) => b.textContent === '＋ Add item').click();
    assert.equal(rows.items[2][C.conversionKey].href, false);
  } finally {
    await dom.happyDOM.close();
  }
});
test('rich-text conversion attributes survive sanitisation only for permitted web links', async () => {
  const dom = await environment();
  try {
    const f = { allowConversionTracking: true };
    const input =
      '<a href="https://example.com/" conversion="true" onclick="bad()" style="color:red">Web</a><a href="mailto:a@example.com" conversion="true">Mail</a>';
    const out = dom.BlockCore.cleanRich(input, f);
    assert.equal((out.match(/conversion="true"/g) || []).length, 1);
    assert.ok(!out.includes('onclick'));
    assert.ok(out.includes('font-weight:inherit'));
    assert.ok(!dom.BlockCore.cleanRich(input, {}).includes('conversion='));
    const m = moduleFor('<p>{{ body | richtext }}</p>', [
      {
        id: 'body',
        key: 'body',
        label: 'Body',
        type: 'richtext',
        enabled: true,
        targets: [],
        defaultValue: input,
        allowConversionTracking: true,
      },
    ]);
    assert.equal((dom.BlockCore.render(m).match(/conversion="true"/g) || []).length, 1);
  } finally {
    await dom.happyDOM.close();
  }
});
test('single-item conversion retains the selected row tracking choice', async () => {
  const dom = await environment();
  try {
    const child = url('u', 'href');
    const list = {
      id: 'links',
      key: 'links',
      label: 'Links',
      type: 'list',
      enabled: true,
      targets: [],
      binding: 'template',
      minItems: 0,
      maxItems: 5,
      itemFields: [child],
      defaultValue: [{ href: child.defaultValue, ...flags({ href: true }) }],
    };
    const m = moduleFor('{% for item in links %}<a href="{{ item.href }}">Open</a>{% endfor %}', [
      list,
    ]);
    const result = dom.BlockRepeatBuilder.singleDraft(m, 'links', 0);
    assert.equal(result.fields[0].defaultConversionTracking, true);
    assert.ok(dom.BlockCore.render(result.draft).includes('conversion="true"'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('rich-text link dialogue adds, reopens and removes tracking without changing locked link styles', async () => {
  const dom = await environment();
  try {
    const parent = dom.document.createElement('div');
    dom.document.body.append(parent);
    const f = {
      id: 'body',
      type: 'richtext',
      label: 'Body',
      allowConversionTracking: true,
      linkStyle: { colour: '#123456', decoration: 'underline', weight: 'bold' },
    };
    let value = '';
    const editor = dom.BlockRichText.mount(parent, f, 'Register now', (html) => (value = html));
    const range = dom.document.createRange();
    range.selectNodeContents(editor);
    dom.getSelection().removeAllRanges();
    dom.getSelection().addRange(range);
    editor.dispatchEvent(new dom.Event('mouseup'));
    parent.querySelector('[aria-label="Add or edit link"]').click();
    const destination =
      parent.querySelector('.rich-link-panel input[type=text]') ||
      [...parent.querySelectorAll('input[type=text]')].at(-1);
    assert.ok(destination);
    destination.value = 'https://example.com/register';
    destination.dispatchEvent(new dom.Event('input'));
    const check = parent.querySelector('.conversion-option input');
    assert.ok(check);
    assert.equal(check.checked, false);
    check.checked = true;
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Insert link').click();
    assert.ok(value.includes('conversion="true"'));
    assert.ok(value.includes('color:#123456'));
    const anchor = editor.querySelector('a');
    const existing = dom.document.createRange();
    existing.setStart(anchor.firstChild, 2);
    existing.collapse(true);
    dom.getSelection().removeAllRanges();
    dom.getSelection().addRange(existing);
    editor.dispatchEvent(new dom.Event('mouseup'));
    parent.querySelector('[aria-label="Add or edit link"]').click();
    assert.equal(parent.querySelector('.conversion-option input').checked, true);
    parent.querySelector('.conversion-option input').checked = false;
    [...parent.querySelectorAll('button')].find((b) => b.textContent === 'Update link').click();
    assert.ok(!value.includes('conversion='));
    assert.ok(value.includes('font-weight:bold'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('SFMC runtime reopens and saves tracking metadata without changing existing URL values', async () => {
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
        values: { link: 'https://example.com/saved', ...flags({ link: true }) },
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
    assert.equal(data.unrelated, 'keep');
    assert.equal(data.studio.blockId, 'saved-id');
    assert.equal(dom.document.getElementById('status').textContent, 'Saved in Content Builder');
  } finally {
    await dom.happyDOM.close();
  }
});
test('authoring refuses unused, partial and doubly controlled tracking connections', () => {
  const f = url('link');
  assert.deepEqual(C.conversionProblems(moduleFor('<a href="{{ link }}">A</a>', [f])), []);
  assert.ok(
    C.conversionProblems(moduleFor('<a href="https://example.com/{{ link }}">A</a>', [f])).some(
      (e) => e.includes('complete anchor href'),
    ),
  );
  assert.ok(C.conversionProblems(moduleFor('<p>{{ link }}</p>', [f])).length);
  assert.ok(
    C.conversionProblems(
      moduleFor('<a href="{{ link }}" conversion="{{ rule }}">A</a>', [
        f,
        { ...f, id: 'rule', key: 'rule', type: 'text', allowConversionTracking: false },
      ]),
    ).some((e) => e.includes('already controlled')),
  );
});
test('authoring exposes conversion options and keeps trial choices separate from starting content', async () => {
  const dom = await environment();
  try {
    const f = url('link');
    f.allowConversionTracking = false;
    const m = moduleFor('<a href="{{ link }}">A</a>', [f]);
    let saved;
    dom.BlockFieldEditor.open(m, f, (field) => (saved = field));
    const dialog = dom.document.querySelector('.field-dialog');
    const allow = [...dialog.querySelectorAll('label')]
      .find((n) => n.textContent === 'Allow clients to mark conversion links')
      .querySelector('input');
    allow.checked = true;
    allow.dispatchEvent(new dom.Event('change'));
    const trial =
      dialog.querySelector('.control-preview .conversion-option input') ||
      [...dialog.querySelectorAll('.conversion-option')]
        .find((n) => n.textContent === 'Conversion Tracking Link')
        ?.querySelector('input');
    assert.ok(trial);
    trial.checked = true;
    trial.dispatchEvent(new dom.Event('change'));
    [...dialog.querySelectorAll('button')].find((n) => n.textContent === 'Save field').click();
    assert.equal(saved.allowConversionTracking, true);
    assert.equal(saved.defaultConversionTracking, undefined);
    assert.equal(saved.defaultValue, f.defaultValue);
    assert.equal(m.fields[0].allowConversionTracking, false);
  } finally {
    await dom.happyDOM.close();
  }
});
test('conversion checkboxes stay compact in both client and Studio styles', async () => {
  const dom = await environment();
  try {
    for (const file of [
      'runtime.css',
      'controls.css',
      'runtime-brand.css',
      'studio.css',
      'brand.css',
    ]) {
      const style = dom.document.createElement('style');
      style.textContent = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
      dom.document.head.append(style);
    }
    const container = dom.document.createElement('main');
    container.className = 'editor';
    dom.document.body.append(container);
    dom.BlockControls.mount(container, [url('link')], {}, () => {});
    const check = container.querySelector('[type=checkbox]');
    const css = dom.getComputedStyle(check);
    assert.notEqual(css.width, '100%');
    assert.notEqual(css.minHeight, '46px');
    assert.equal(dom.getComputedStyle(check.parentElement).display, 'flex');
    check.parentElement.hidden = true;
    assert.equal(dom.getComputedStyle(check.parentElement).display, 'none');
  } finally {
    await dom.happyDOM.close();
  }
});
