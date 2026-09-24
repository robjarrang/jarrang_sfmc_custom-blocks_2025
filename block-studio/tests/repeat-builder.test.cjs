const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../src/core.js');
function setup(source) {
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.value = '';
    }
    append(...children) {
      this.children.push(...children);
    }
    setAttribute() {}
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      this.onclose?.();
    }
    remove() {}
  }
  const document = {
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => ({ textContent: text }),
    body: new Element('body'),
  };
  const window = {
    BlockCodeEditor: require('../src/code-editor.js'),
    BlockCore: C,
    BlockPreview: { documentHTML: (html) => html },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/repeat-builder.js'), 'utf8'), {
    window,
    document,
  });
  const module = { source, fields: C.infer(source).fields };
  return { module, document, builder: window.BlockRepeatBuilder };
}
function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children || []) {
    const found = find(child, predicate);
    if (found) return found;
  }
}
test('repeat boundary choices include the enclosing item and report untouched siblings without mutating the module', () => {
  const { module, builder } = setup(
    '<ul><li><p>First item</p></li><li><p>Second item</p></li></ul>',
  );
  const before = JSON.stringify(module),
    options = builder.candidates(module, module.fields[0].id);
  assert.ok(options.some((o) => o.tag === 'li' && o.siblings === 1 && !o.error));
  assert.equal(JSON.stringify(module), before);
});
test('boundary preview handles quoted angle brackets and cancellation leaves source and fields intact', () => {
  const { module, builder, document } = setup('<p title="A > B">First item</p>');
  const before = JSON.stringify(module);
  let called = false;
  builder.open(module, module.fields[0].id, () => {
    called = true;
  });
  const frame = find(document.body, (n) => n.tag === 'iframe');
  assert.match(frame.srcdoc, /<p title="A > B" data-repeat-candidate="true">/);
  find(document.body, (n) => n.textContent === 'Cancel').onclick();
  assert.equal(called, false);
  assert.equal(JSON.stringify(module), before);
});
test('sibling acknowledgement gates conversion and produces a draft with one starting item', () => {
  const { module, builder, document } = setup('<div><p>First item</p><p>Second item</p></div>');
  const before = JSON.stringify(module);
  let result;
  builder.open(module, module.fields[0].id, (group, draft) => (result = { group, draft }));
  const next = find(document.body, (n) => n.textContent === 'Set up repeating group');
  assert.equal(next.disabled, true);
  next.onclick();
  assert.equal(result, undefined);
  const ack = find(document.body, (n) => n.id === 'repeat-siblings');
  ack.checked = true;
  ack.onchange();
  next.onclick();
  assert.equal(result.group.defaultValue.length, 1);
  assert.equal(C.render(result.draft), module.source);
  assert.equal(JSON.stringify(module), before);
});
test('unmapped sections cannot be converted by the guided flow', () => {
  const { module, builder } = setup('<div></div>');
  assert.ok(builder.candidates(module).every((o) => o.error));
});

test('a cursor inside HTML offers complete enclosing items without including adjacent items', () => {
  const { module, builder } = setup(
    '<table><tr><td><p>First</p></td><td><p>Second</p></td></tr></table>',
  );
  const start = module.source.indexOf('First') + 2;
  const options = builder.candidates(module, null, { start, end: start });
  assert.deepEqual(
    Array.from(options, (o) => o.tag),
    ['p', 'td', 'tr', 'table'],
  );
  assert.ok(options.every((o) => o.start <= start && o.end > start));
});
test('partial code selections are expanded to an enclosing boundary and shown verbatim', () => {
  const { module, builder, document } = setup('<div><p>First</p><p>Second</p></div>');
  const start = module.source.indexOf('First') + 1,
    end = module.source.indexOf('Second') + 2;
  const options = builder.candidates(module, null, { start, end });
  assert.deepEqual(
    Array.from(options, (o) => o.tag),
    ['div'],
  );
  builder.open(module, null, () => {}, { start, end });
  assert.equal(find(document.body, (n) => n.tag === 'pre').textContent, module.source);
});

function repeating(
  source = '<p>Before</p><div><a href="https://example.com">Go</a></div><p>After</p>',
) {
  const state = setup(source);
  const node = C.parse(source).nodes.find((n) => n.tag === 'div');
  state.group = C.repeatSelection(state.module, node.start, node.end);
  return state;
}
test('making a group single preserves output and promotes editable fields in place', () => {
  const { module, group, builder } = repeating();
  const before = JSON.stringify(module),
    html = C.render(module);
  const result = builder.singleDraft(module, group.id);
  assert.equal(JSON.stringify(module), before);
  assert.equal(C.render(result.draft), html);
  assert.ok(!result.draft.source.includes('{% for'));
  assert.ok(!result.draft.fields.some((f) => f.id === group.id));
  assert.equal(result.fields.length, group.itemFields.length);
  const text = result.fields.find((f) => f.type === 'text' || f.type === 'richtext');
  assert.ok(C.render(result.draft, { [text.id]: 'Changed' }).includes('Changed'));
});
test('chosen item supplies defaults, unrelated mappings survive and duplicate keys are avoided', () => {
  const { module, group, builder } = repeating();
  const row = JSON.parse(JSON.stringify(group.defaultValue[0]));
  const child = group.itemFields.find((f) => f.type === 'text' || f.type === 'richtext');
  row[child.key] = 'Second button';
  group.defaultValue.push(row);
  const result = builder.singleDraft(module, group.id, 1);
  assert.ok(C.render(result.draft).includes('Second button'));
  assert.ok(C.render(result.draft).includes('<p>Before</p>'));
  const keys = result.draft.fields.map((f) => f.key || f.id);
  assert.equal(new Set(keys).size, keys.length);
  assert.throws(() => builder.singleDraft(module, group.id, 5), /Choose a starting item/);
});
test('empty repeating group can become one item using child defaults', () => {
  const { module, group, builder } = repeating();
  group.defaultValue = [];
  assert.ok(C.render(builder.singleDraft(module, group.id).draft).includes('Go'));
});
test('custom loop counters and external references block conversion without mutation', () => {
  const { module, group, builder } = repeating();
  module.source = module.source.replace('{% endfor %}', '{{ forloop.index }}{% endfor %}');
  const before = JSON.stringify(module);
  assert.throws(() => builder.singleDraft(module, group.id), /loop counters/);
  assert.equal(JSON.stringify(module), before);
  module.source = module.source.replace('{{ forloop.index }}', '') + '{{ ' + group.key + '.size }}';
  assert.throws(() => builder.singleDraft(module, group.id), /Other template logic/);
});
test('conversion retains rich-text policies and field order while rebasing later mappings', () => {
  const { module, group, builder } = repeating();
  const child = group.itemFields.find((f) => f.type === 'text' || f.type === 'richtext');
  child.type = 'richtext';
  child.toolbar = { bold: false };
  child.linkStyle = { color: '#123456' };
  const after = module.fields.find((f) => f.defaultValue === 'After');
  const result = builder.singleDraft(module, group.id);
  const promoted = result.fields.find((f) => f.label === child.label);
  assert.equal(promoted.toolbar.bold, false);
  assert.equal(promoted.linkStyle.color, '#123456');
  assert.ok(
    C.render(result.draft, { [after.id]: 'Still editable' }).includes('<p>Still editable</p>'),
  );
});
test('loop empty alternative is removed and quoted alias-like text remains literal', () => {
  const { module, group, builder } = repeating();
  const at = module.source.indexOf('{% endfor %}');
  C.rebase(module, [
    {
      start: at,
      end: at,
      value:
        "{% if 'item.literal' == 'item.literal' %}Literal value{% endif %}{% else %}<p>Empty</p>",
    },
  ]);
  const result = builder.singleDraft(module, group.id);
  assert.ok(result.draft.source.includes("'item.literal'"));
  assert.ok(!result.draft.source.includes('<p>Empty</p>'));
  assert.ok(C.render(result.draft).includes('Literal value'));
});

test('repeating to single to repeating preserves content, fields and rich-text policy across several cycles', () => {
  const { module, group, builder } = repeating();
  const child = group.itemFields.find((f) => f.type === 'text' || f.type === 'richtext');
  child.toolbar = { bold: false };
  let current = module,
    list = group;
  const output = C.render(current);
  for (let i = 0; i < 3; i++) {
    current = builder.singleDraft(current, list.id).draft;
    const field = current.fields.find((f) => f.binding === 'template');
    assert.ok(builder.candidates(current, field.id).some((c) => !c.error));
    const node = C.parse(current.source).nodes.find((n) => n.tag === 'div');
    list = C.repeatSelection(current, node.start, node.end);
    assert.equal(C.render(current), output);
    assert.equal(list.itemFields.length, group.itemFields.length);
    assert.equal(list.itemFields.find((f) => f.label === child.label).toolbar.bold, false);
  }
});
test('shared template references block repeat conversion without changing source or fields', () => {
  const { module, group, builder } = repeating();
  const draft = builder.singleDraft(module, group.id).draft;
  const field = draft.fields.find((f) => f.binding === 'template');
  draft.source += '{{ ' + field.key + ' }}';
  const node = C.parse(draft.source).nodes.find((n) => n.tag === 'div'),
    before = JSON.stringify(draft);
  assert.throws(() => C.repeatSelection(draft, node.start, node.end), /outside this section/);
  assert.equal(JSON.stringify(draft), before);
});
test('mixed literal mappings and template references become independently editable item fields', () => {
  const source = '<div><p>Literal</p><a href="{{ destination }}">Link</a></div>',
    module = { source, fields: C.infer(source).fields, templateMode: true };
  const destination = C.templateField(module, 'url', 'Destination');
  destination.key = 'destination';
  destination.defaultValue = 'https://example.com';
  module.fields.push(destination);
  const before = C.render(module);
  const group = C.repeatSelection(module, 0, source.length);
  assert.equal(C.render(module), before);
  assert.ok(group.itemFields.some((f) => f.label === 'Destination'));
});
test('disabled connected fields are not silently converted or re-enabled', () => {
  const { module, builder } = setup('<div><p>Fixed content</p></div>');
  module.fields[0].enabled = false;
  const before = JSON.stringify(module);
  assert.throws(() => C.repeatSelection(module, 0, module.source.length), /disabled field/);
  assert.equal(JSON.stringify(module), before);
});
test('template filters survive repeat conversion and unsafe expressions remain blocked', () => {
  const { module, builder } = setup('<div>{{ copy | escape }}</div>');
  module.fields = [];
  module.templateMode = true;
  const field = C.templateField(module, 'text', 'Copy');
  field.key = 'copy';
  field.defaultValue = '<Hello>';
  module.fields.push(field);
  const group = C.repeatSelection(module, 0, module.source.length);
  assert.match(module.source, /item.copy\s*\|\s*escape/);
  assert.equal(C.render(module), '<div>&lt;Hello&gt;</div>');
  const single = builder.singleDraft(module, group.id).draft;
  single.source = single.source.replace('| escape', '| unknown');
  const before = JSON.stringify(single);
  assert.throws(() => C.repeatSelection(single, 0, single.source.length), /custom expression/);
  assert.equal(JSON.stringify(single), before);
});
