const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const C = require('../src/core.js');
function host(saved = {}, { deferData = false, blankStart = false } = {}) {
  const source = '{% for item in items %}<p>{{ item.text }}</p>{% endfor %}';
  const list = C.templateField({ fields: [] }, 'list', 'Items');
  list.id = 'items';
  list.key = 'items';
  list.defaultValue = [{ text: 'Initial' }];
  const definition = {
    id: 'module',
    release: '1.0.0',
    name: 'Module',
    source,
    templateMode: true,
    fields: [list],
    ...(blankStart ? { blankStart: {} } : {}),
  };
  const form = { disabled: true, inert: false, replaceChildren() {} },
    status = {},
    nodes = {
      'block-definition': { textContent: JSON.stringify(definition) },
      fields: form,
      status,
      'block-name': { focus() {} },
    };
  if (blankStart) nodes['load-sample'] = { hidden: true, addEventListener: (_, fn) => (load = fn) };
  const calls = [],
    pending = [],
    dataCallbacks = [];
  let options,
    mounted,
    change,
    load,
    mountCount = 0;
  const sdk = {
    getData(cb) {
      if (deferData) dataCallbacks.push(cb);
      else cb(saved);
    },
    getContent(cb) {
      pending.push(cb);
    },
    setContent(html, cb) {
      calls.push({ type: 'content', value: html, cb });
    },
    setData(data, cb) {
      calls.push({ type: 'data', value: data, cb });
    },
  };
  const window = {
    BlockCore: C,
    parent: {},
    sfdc: {
      BlockSDK: function (o) {
        options = o;
        return sdk;
      },
    },
    BlockControls: {
      mount(container, fields, values, onChange) {
        mounted = values;
        mountCount++;
        change = onChange;
        return new Map(fields.map((f) => [f.id, { input: { setAttribute() {} }, error: {} }]));
      },
    },
    addEventListener() {},
  };
  const timers = new Map();
  let next = 0;
  const context = {
    window,
    document: { getElementById: (id) => nodes[id], addEventListener() {} },
    crypto: { randomUUID: () => 'test' },
    setTimeout(fn, ms) {
      const id = ++next;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/runtime.js'), 'utf8'), context);
  return {
    form,
    status,
    calls,
    pending,
    get mounted() {
      return mounted;
    },
    get mountCount() {
      return mountCount;
    },
    get sampleButton() {
      return nodes['load-sample'];
    },
    loadSample() {
      load();
    },
    resolveData(data = saved) {
      dataCallbacks.forEach((cb) => cb(data));
    },
    change(value) {
      change(list, value);
    },
    close() {
      options.onEditClose();
    },
    expire() {
      for (const [id, t] of [...timers])
        if (t.ms === 10000) {
          timers.delete(id);
          t.fn();
        }
    },
    flush() {
      for (const [id, t] of [...timers])
        if (t.ms === 200) {
          timers.delete(id);
          t.fn();
        }
    },
  };
}
const metadata = () => ({
  studio: {
    schemaVersion: 1,
    moduleId: 'module',
    moduleVersion: '1.0.0',
    blockId: 'existing',
    values: { items: [{ text: 'Initial' }] },
  },
});
test('existing HTML is checked before editing is enabled', () => {
  const h = host();
  assert.equal(h.form.disabled, true);
  assert.equal(h.form.inert, true);
  h.pending[0]('<p>Existing content</p>');
  assert.equal(h.form.disabled, true);
  assert.equal(h.form.inert, true);
  assert.equal(h.calls.length, 0);
});
test('new empty blocks initialise only after the content check', () => {
  const h = host();
  assert.equal(h.calls.length, 0);
  h.pending[0]('');
  assert.equal(h.form.disabled, false);
  assert.equal(h.calls[0].value, '<p>Initial</p>');
});
test('blank-start blocks save their former defaults only when Load test sample is used', () => {
  const h = host({}, { blankStart: true });
  assert.equal(h.sampleButton.hidden, true);
  h.pending[0]('');
  assert.equal(h.sampleButton.hidden, false);
  assert.equal(h.calls[0].value, '');
  h.loadSample();
  assert.equal(h.sampleButton.hidden, true);
  h.calls[0].cb('');
  assert.equal(h.calls[1].value.studio.blankStart, true);
  h.calls[1].cb();
  assert.equal(h.calls[2].value, '<p>Initial</p>');
  h.calls[2].cb('<p>Initial</p>');
  const saved = h.calls[3].value;
  assert.deepEqual(JSON.parse(JSON.stringify(saved.studio.values.items)), [{ text: 'Initial' }]);
  assert.equal(host(saved, { blankStart: true }).sampleButton.hidden, true);
});
test('test sample cannot overwrite authored repeater rows', () => {
  const data = metadata();
  data.studio.blankStart = true;
  data.studio.values.items = [{ text: 'Saved' }];
  const h = host(data, { blankStart: true });
  assert.equal(h.sampleButton.hidden, true);
  h.loadSample();
  assert.equal(h.mounted.items[0].text, 'Saved');
  assert.equal(h.calls.length, 0);
});
test('test sample preserves link settings already attached to blank repeater rows', () => {
  const data = metadata();
  data.studio.blankStart = true;
  const linkSettings = { [C.linkOptionsKey]: { link: { alias: 'test-alias' } } };
  data.studio.values.items = [{ text: '', ...linkSettings }];
  const h = host(data, { blankStart: true });
  assert.equal(h.sampleButton.hidden, false);
  h.loadSample();
  h.calls[0].cb('<p>Initial</p>');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[1].value.studio.values.items)), [
    { text: 'Initial', ...linkSettings },
  ]);
});
test('controls are drawn from defaults and stay inert until SFMC responds', () => {
  const h = host(metadata(), { deferData: true });
  assert.deepEqual(JSON.parse(JSON.stringify(h.mounted)), { items: [{ text: 'Initial' }] });
  assert.equal(h.form.inert, true);
  assert.equal(h.form.disabled, true);
  assert.equal(h.status.textContent, 'Connecting to Content Builder…');
  h.resolveData({
    studio: { ...metadata().studio, values: { items: [{ text: 'Saved' }] } },
  });
  assert.equal(h.mountCount, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(h.mounted)), { items: [{ text: 'Saved' }] });
  assert.equal(h.form.inert, false);
  assert.equal(h.form.disabled, false);
  assert.equal(h.status.textContent, 'Ready to edit');
});
test('new blocks keep the already drawn controls once SFMC confirms they are empty', () => {
  const h = host({}, { deferData: true });
  h.resolveData({});
  assert.equal(h.mountCount, 1);
  assert.equal(h.form.inert, true);
  h.pending[0]('');
  assert.equal(h.mountCount, 1);
  assert.equal(h.form.inert, false);
  assert.equal(h.calls[0].value, '<p>Initial</p>');
});
test('connection timeout removes the placeholder controls', () => {
  let cleared = 0;
  const h = host({}, { deferData: true });
  h.form.replaceChildren = () => cleared++;
  h.expire();
  assert.equal(cleared, 1);
  assert.equal(h.form.inert, true);
  assert.match(h.status.textContent, /Unable to connect/);
});
test('pending save metadata is an immutable snapshot of its HTML', () => {
  const h = host(metadata());
  const rows = [{ text: 'First' }];
  h.change(rows);
  h.flush();
  assert.equal(h.calls[0].value, '<p>First</p>');
  rows[0].text = 'Second';
  h.change(rows);
  h.calls[0].cb('<p>First</p>');
  assert.equal(h.calls[1].value.studio.values.items[0].text, 'First');
  h.calls[1].cb();
  assert.equal(h.calls[2].value, '<p>Second</p>');
});
test('close flushes latest edits and ignores pending save callbacks', () => {
  const h = host(metadata());
  h.change([{ text: 'First' }]);
  h.flush();
  h.change([{ text: 'Latest' }]);
  h.close();
  assert.equal(h.calls[1].value, '<p>Latest</p>');
  assert.equal(h.calls[2].value.studio.values.items[0].text, 'Latest');
  h.calls[0].cb('late');
  assert.equal(h.calls.length, 3);
});
test('malformed saved repeaters remain locked with a recovery message', () => {
  const data = metadata();
  data.studio.values.items = [null];
  const h = host(data);
  assert.equal(h.form.disabled, true);
  assert.match(h.status.textContent, /saved|invalid|restore/i);
  assert.equal(h.form.inert, true);
});
test('save timeout locks every control and preserves its error after change events or late callbacks', () => {
  const h = host(metadata());
  h.change([{ text: 'Unsaved' }]);
  h.flush();
  h.expire();
  const message = h.status.textContent;
  assert.equal(h.form.inert, true);
  assert.equal(h.form.disabled, true);
  h.change([{ text: 'Must be ignored' }]);
  h.flush();
  h.calls[0].cb('late reply');
  assert.equal(h.calls.length, 1);
  assert.equal(h.status.textContent, message);
  assert.match(message, /did not confirm/);
});
test('a late metadata response cannot reactivate a timed-out connection', () => {
  const h = host(metadata(), { deferData: true });
  h.expire();
  const message = h.status.textContent;
  h.resolveData();
  assert.equal(h.form.inert, true);
  assert.equal(h.status.textContent, message);
});

test('a delayed content reply after timeout cannot unlock or overwrite the block', () => {
  const h = host();
  h.expire();
  h.pending[0]('');
  assert.equal(h.form.disabled, true);
  assert.equal(h.form.inert, true);
  assert.equal(h.calls.length, 0);
  assert.match(h.status.textContent, /Reopen/);
});
test('invalid content-check responses are never treated as an empty block', () => {
  for (const value of [undefined, null, {}]) {
    const h = host();
    h.pending[0](value);
    assert.equal(h.form.disabled, true);
    assert.equal(h.calls.length, 0);
  }
});
