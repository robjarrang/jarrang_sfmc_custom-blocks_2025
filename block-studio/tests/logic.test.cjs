const test = require('node:test'),
  assert = require('node:assert/strict'),
  C = require('../src/core.js'),
  L = require('../src/logic.js');
const make = (source) => ({
  id: 'm',
  name: 'Test',
  slug: 'test',
  source,
  draftSource: source,
  fields: [],
  templateMode: true,
});
function field(m, type, key, value) {
  const f = C.templateField(m, type, key);
  f.key = key;
  f.defaultValue = value;
  m.fields.push(f);
  return f;
}
test('if/elsif/else and comparisons render only the selected branch', () => {
  const m = make(
    '{% if show %}yes{% elsif variant == "compact" and count > 1 %}compact{% else %}no{% endif %}',
  );
  const show = field(m, 'toggle', 'show', 'hidden');
  field(m, 'text', 'variant', 'compact');
  field(m, 'number', 'count', '2');
  assert.equal(C.render(m), 'compact');
  assert.equal(C.render(m, { [show.id]: 'shown' }), 'yes');
});
test('loops, empty alternatives, nested conditions, escaping and indices', () => {
  const m = make(
    '<ul>{% for item in items %}{% if item.show %}<li id="item-{{ forloop.index }}">{{ item.text }}</li>{% endif %}{% else %}<li>Empty</li>{% endfor %}</ul>',
  );
  const list = field(m, 'list', 'items', [
    { text: 'A & B', show: 'shown' },
    { text: 'Hidden', show: 'hidden' },
  ]);
  list.itemFields.push({
    key: 'show',
    type: 'toggle',
    label: 'Show',
    defaultValue: 'shown',
    targets: [],
  });
  assert.equal(C.render(m), '<ul><li id="item-1">A &amp; B</li></ul>');
  assert.equal(C.render(m, { [list.id]: [] }), '<ul><li>Empty</li></ul>');
});
test('user text cannot inject new template instructions or tags', () => {
  const m = make('<p>{{ text }}</p>');
  field(m, 'text', 'text', '{% if secret %}<img onerror="x">{{ secret }}');
  assert.equal(C.render(m), '<p>{% if secret %}&lt;img onerror=&quot;x&quot;&gt;{{ secret }}</p>');
});
test('server-side personalisation is preserved and prototype access is rejected', () => {
  const m = make('%%[ SET @x = "{{ untouched }}" ]%%<p>{{ title }}</p>');
  field(m, 'text', 'title', 'Safe');
  assert.equal(C.render(m), '%%[ SET @x = "{{ untouched }}" ]%%<p>Safe</p>');
  assert.throws(() => L.evaluate('item.constructor', { item: {} }), /not available/);
});
test('unclosed and unsupported directives fail clearly', () => {
  assert.throws(() => L.compile('{% if show %}Oops'), /Missing endif/);
  assert.throws(() => L.compile('{% javascript alert(1) %}'), /Unsupported/);
  assert.throws(() => C.render(make('{{ missing }}')), /Unknown template value/);
});
test('required controls in an omitted branch do not prevent rendering', () => {
  const m = make('{% if show %}{{ title }}{% else %}Hidden{% endif %}');
  const show = field(m, 'toggle', 'show', 'hidden'),
    title = field(m, 'text', 'title', '');
  title.required = true;
  assert.equal(C.render(m), 'Hidden');
  assert.throws(() => C.render(m, { [show.id]: 'shown' }), /title/);
});
test('nested loops have scoped indices and preserve outer values', () => {
  const m = make(
    '{% for a in items %}{{ forloop.index }}:{% for b in items %}{{ a.text }}-{{ b.text }};{% endfor %}{{ forloop.index }}{% endfor %}',
  );
  field(m, 'list', 'items', [{ text: 'A' }, { text: 'B' }]);
  assert.equal(C.render(m), '1:A-A;A-B;12:B-A;B-B;2');
});
test('show/hide sections contain editable fields and suppress required validation when hidden', () => {
  const source = '<table><tr><td><a href="https://example.com/">Read more</a></td></tr></table>',
    m = { source, fields: C.infer(source).fields };
  const start = source.indexOf('<tr>'),
    end = source.indexOf('</tr>') + 5,
    toggle = C.manualField(source, start, end, m.fields);
  toggle.id = 'show';
  m.fields.push(toggle);
  const label = m.fields.find((f) => f.label === 'Button text');
  label.required = true;
  assert.equal(C.render(m, { show: 'hidden', [label.id]: '' }), '<table></table>');
  assert.ok(C.render(m, { [label.id]: 'New label' }).includes('New label'));
  C.assertProject({
    format: 'jarrang-block-studio',
    version: 1,
    modules: [{ ...m, id: 'm', name: 'Test', slug: 'test' }],
  });
});
test('CSS colour selection updates only the value and supports changing its default', () => {
  const source = '<td style="background-color:#ffffff;padding:20px;">Copy</td>',
    start = source.indexOf('#ffffff'),
    f = C.manualField(source, start, start + 7, []);
  f.id = 'colour';
  f.defaultValue = '#112233';
  assert.equal(C.render({ source, fields: [f] }), source.replace('#ffffff', '#112233'));
  assert.equal(f.type, 'colour');
  assert.throws(() => C.render({ source, fields: [f] }, { colour: 'red;display:none' }));
});
test('dropdown values are constrained and linked values update together', () => {
  const source = '<td align="left" style="text-align:left">Copy</td>',
    a = source.indexOf('left'),
    b = source.lastIndexOf('left'),
    f = C.manualField(source, a, a + 4, []);
  f.id = 'align';
  f.type = 'select';
  f.options = [
    { label: 'Left aligned', value: 'left' },
    { label: 'Centred', value: 'center' },
  ];
  f.targets.push({
    ...C.mappingTarget(source, b, b + 4),
    originalValue: 'left',
  });
  assert.equal(
    C.render({ source, fields: [f] }, { align: 'center' }),
    source.replaceAll('left', 'center'),
  );
  assert.throws(() => C.render({ source, fields: [f] }, { align: 'right' }));
});
test('repeat selection moves editable item fields into a list and preserves other mappings', () => {
  const source = '<h2>Heading</h2><ul><li>First benefit</li></ul><p>Footer</p>',
    m = { ...make(source), fields: C.infer(source).fields };
  const start = source.indexOf('<li>'),
    end = source.indexOf('</li>') + 5,
    list = C.repeatSelection(m, start, end);
  assert.equal(list.type, 'list');
  assert.equal(C.render(m), source);
  const rowKey = list.itemFields[0].key,
    out = C.render(m, {
      [list.id]: [{ [rowKey]: 'One' }, { [rowKey]: 'Two' }],
    });
  assert.equal(out, '<h2>Heading</h2><ul><li>One</li><li>Two</li></ul><p>Footer</p>');
});
