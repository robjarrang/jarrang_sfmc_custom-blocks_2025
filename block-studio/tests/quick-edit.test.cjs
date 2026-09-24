const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  C = require('../src/core.js'),
  Q = require('../src/quick-edit.js');
function make(source) {
  return {
    id: 'm',
    name: 'Story',
    slug: 'story',
    release: '1.0.0',
    source,
    draftSource: source,
    fields: C.infer(source).fields,
    analysed: true,
    reviewed: true,
    acknowledged: true,
  };
}
test('successive CSS and closing-tag fixes preserve field settings and changed value rendering', () => {
  const original = make('<table><tr><td style="padding:20px"><p>Hello</p></td></tr></table>');
  original.fields[0].label = 'Client headline';
  original.fields[0].required = true;
  let draft = Q.patch(original, original.source.replace('20px', '24px'));
  draft = Q.patch(draft, draft.source.replace('</p>', '</p><br>'));
  const fixed = Q.validate(original, draft);
  assert.equal(original.source.includes('20px'), true);
  assert.equal(fixed.fields[0].id, original.fields[0].id);
  assert.equal(fixed.fields[0].label, 'Client headline');
  assert.equal(fixed.fields[0].required, true);
  assert.equal(fixed.reviewed, true);
  assert.equal(fixed.acknowledged, false);
  assert.equal(fixed.templateMode, undefined);
  assert.equal(
    C.render(fixed, { [fixed.fields[0].id]: 'Updated' }),
    fixed.source.replace('Hello', 'Updated'),
  );
});
test('connected values cannot be edited and failures leave original unchanged', () => {
  const m = make('<p>Hello</p>'),
    before = JSON.stringify(m);
  assert.throws(() => Q.patch(m, '<p>Goodbye</p>'), /protected/);
  assert.equal(JSON.stringify(m), before);
});
test('CSS fixes inside optional sections retain toggles and child fields', () => {
  const m = make('<div style="padding:20px"><p>Hello</p></div>');
  const toggle = C.manualField(m.source, 0, m.source.length, m.fields);
  toggle.id = 'toggle';
  m.fields.unshift(toggle);
  const fixed = Q.validate(m, Q.patch(m, m.source.replace('20px', '24px')));
  assert.equal(C.render(fixed, { toggle: 'hidden' }), '');
  assert.ok(C.render(fixed).includes('24px'));
});
test('missing closing markup can be added without rediscovery', () => {
  const m = make('<table><tr><td><p>Hello</p>');
  const fixed = Q.validate(m, Q.patch(m, m.source + '</td></tr></table>'));
  assert.equal(fixed.fields.length, m.fields.length);
  assert.equal(C.render(fixed), fixed.source);
});
test('template references and AMPscript remain protected at validation', () => {
  const m = make('<p style="padding:20px">{{ title }}</p>');
  m.templateMode = true;
  m.fields = [
    {
      ...C.templateField(m, 'text', 'Title'),
      key: 'title',
      defaultValue: 'Hello',
    },
  ];
  const fixed = Q.validate(m, Q.patch(m, m.source.replace('20px', '24px')));
  assert.ok(C.render(fixed).includes('Hello'));
  assert.throws(
    () => Q.validate(m, Q.patch(m, m.source.replace('title', 'other'))),
    /logic and personalisation/,
  );
});
test('invalid surrounding attribute changes do not silently rebind fields', () => {
  const m = make('<img src="https://example.com/a.png" alt="Photo">');
  assert.throws(() => Q.validate(m, Q.patch(m, m.source.replace('src=', 'href='))), /changes what/);
});
test('textarea edits preserve CRLF source and mapped multiline content', () => {
  const m = make('<div style="padding:20px">\r\n<p>Hello\r\nworld</p>\r\n</div>');
  const display = m.source.replace(/\r\n/g, '\n').replace('20px', '24px');
  const fixed = Q.validate(m, Q.patchInput(m, display));
  assert.equal(fixed.source, m.source.replace('20px', '24px'));
  assert.equal(
    fixed.source.slice(fixed.fields[0].targets[0].start, fixed.fields[0].targets[0].end),
    'Hello\r\nworld',
  );
});
