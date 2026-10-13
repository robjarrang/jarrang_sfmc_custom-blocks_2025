const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/html-validation.js');
const C = require('../src/core.js');
const Q = require('../src/quick-edit.js');
test('structural validation rejects missing, unexpected and misnested end tags', () => {
  assert.match(H.check('<table><tr><td>Hello').join(' '), /Missing <\/table>/);
  assert.match(H.check('<div><strong>Text</div>').join(' '), /Close <strong>/);
  assert.match(H.check('<p>Text</p></div>').join(' '), /Unexpected <\/div>/);
  assert.match(H.check('<style>p{color:red}').join(' '), /Missing <\/style>/);
});
test('permitted omitted end tags, raw CSS and opaque AMPscript remain valid', () => {
  for (const html of [
    '<ul><li>One<li>Two</ul>',
    '<table><tbody><tr><td>One<td>Two<tr><td>Three</table>',
    '<p>One<p>Two',
    '<style>p::after{content:"<span>"}</style><p>Text</p>',
    '%%[ SET @markup = "<table>" ]%%<p>%%=v(@markup)=%%</p>',
  ])
    assert.deepEqual(H.check(html), []);
});
test('Outlook and non-Outlook structures are validated independently', () => {
  const wrapped =
    '<!--[if mso]><table><tr><td><![endif]--><p>Text</p><!--[if mso]></td></tr></table><![endif]-->';
  assert.deepEqual(H.check(wrapped), []);
  assert.deepEqual(H.check('<!--[if !mso]><!--><div>Other clients</div><!--<![endif]-->'), []);
  assert.deepEqual(
    H.check(
      '<!--[if (gte mso 9)&(lt mso 16)]><p>Older</p><![endif]--><!--[if mso 16]><p>Newer</p><![endif]-->',
    ),
    [],
  );
  assert.match(H.check(wrapped.replace('</table>', '')).join(' '), /Outlook HTML: Missing/);
});
test('rendered alternatives are checked even when the default is structurally valid', () => {
  const toggle = C.templateField({ fields: [] }, 'toggle', 'Wrapper');
  toggle.key = 'show';
  const m = {
    source: '<table><tr><td>Hello{% if show %}</td></tr></table>{% endif %}',
    templateMode: true,
    fields: [toggle],
  };
  assert.deepEqual(H.check(C.render(m)), []);
  assert.match(C.htmlProblems(m).join(' '), /Wrapper \(hidden\).*Missing/);
});
test('quick fixes cannot remove required closing markup', () => {
  const source = '<table><tr><td>Hello</td></tr></table>';
  const m = { id: 'm', name: 'Module', slug: 'module', source, draftSource: source, fields: [] };
  assert.throws(
    () => Q.validate(m, Q.patch(m, source.replace('</table>', ''))),
    /Missing <\/table>/,
  );
});
