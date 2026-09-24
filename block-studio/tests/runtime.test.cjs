const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const C = require('../src/core.js');
function host(saved = {}) {
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
  };
  const form = { disabled: true },
    status = {},
    nodes = {
      'block-definition': { textContent: JSON.stringify(definition) },
      fields: form,
      status,
      'block-name': {},
    };
  const calls = [],
    pending = [];
  let options, mounted, change;
  const sdk = {
    getData(cb) {
      cb(saved);
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
  assert.equal(h.mounted, undefined);
  h.pending[0]('<p>Existing content</p>');
  assert.equal(h.form.disabled, true);
  assert.equal(h.calls.length, 0);
});
test('new empty blocks initialise only after the content check', () => {
  const h = host();
  assert.equal(h.calls.length, 0);
  h.pending[0]('');
  assert.equal(h.form.disabled, false);
  assert.equal(h.calls[0].value, '<p>Initial</p>');
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
  assert.equal(h.mounted, undefined);
});

test('a delayed content reply after timeout cannot unlock or overwrite the block', () => {
  const h = host();
  h.expire();
  h.pending[0]('');
  assert.equal(h.form.disabled, true);
  assert.equal(h.mounted, undefined);
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
