const test = require('node:test'),
  assert = require('node:assert/strict');
const C = require('../src/core.js');
const OPEN = '\uE000',
  CLOSE = '\uE001',
  list = (tag = 'ul', attrs = '') =>
    OPEN + '<' + tag + attrs + '><li>One</li><li>Two</li></' + tag + '>' + CLOSE;
const host =
  '<p class="body-copy" style="color: #333333; font-family: \'mulish-variable\', Arial, sans-serif !important; font-size: 14px; line-height: 22px; margin: 0 0 18px;">';
const page = (inner) => '<table><tr><td>' + host + inner + '</p></td></tr></table>';
const count = (html, re) => (html.match(re) || []).length;

test('a list between text splits the paragraph and repeats its open tag', () => {
  const out = C.placeLists(page('Intro' + list() + 'Outro'));
  assert.equal(count(out, /<p /g), 2);
  assert.equal(count(out, /<\/p>/g), 2);
  assert.match(out, /Intro<\/p><ul /);
  assert.match(out, /<\/ul><p class="body-copy"[^>]*>Outro<\/p>/);
  assert.ok(!out.includes(OPEN) && !out.includes(CLOSE));
});
test('a list at the start or end does not leave an empty paragraph behind', () => {
  for (const inner of [list() + 'Outro', 'Intro' + list(), list()]) {
    const out = C.placeLists(page(inner));
    assert.ok(!/<p[^>]*>\s*<\/p>/.test(out), out);
  }
  assert.equal(count(C.placeLists(page(list())), /<p /g), 0);
});
test('adjacent lists and text between several lists stay valid', () => {
  const out = C.placeLists(page('A' + list() + list('ol') + 'B' + list() + 'C'));
  assert.ok(!/<p[^>]*>\s*<\/p>/.test(out));
  assert.equal(count(out, /<p /g), 3);
  assert.equal(count(out, /<\/p>/g), 3);
  assert.equal(count(out, /<ul /g), 2);
  assert.equal(count(out, /<ol /g), 1);
});
test('rows carry the paragraph styling, class and explicit marker type', () => {
  const out = C.placeLists(page(list()));
  for (const tag of ['<ul ', '<li ']) {
    const open = out.slice(out.indexOf(tag), out.indexOf('>', out.indexOf(tag)));
    assert.match(open, /class="body-copy"/);
    assert.match(open, /color:#333333;/);
    assert.match(open, /font-family:'mulish-variable', Arial, sans-serif !important;/);
    assert.match(open, /font-size:14px;/);
    assert.match(open, /line-height:22px;/);
  }
  assert.match(out, /<ul [^>]*type="disc"[^>]*style="margin:0 0 18px 25px;padding:0;/);
  assert.match(C.placeLists(page(list('ol'))), /<ol [^>]*type="1"/);
  assert.match(C.placeLists(page(list('ol', ' type="A"'))), /<ol [^>]*type="A"/);
  assert.ok(!/margin|padding/.test(out.match(/<li [^>]*>/)[0]));
});
test('AMPscript colours are copied untouched', () => {
  const ampHost = '<p style="color: %%=v(@TextOnPrimaryColour)=%%; font-size: 14px; margin: 0;">';
  const out = C.placeLists(ampHost + 'x' + list() + '</p>');
  assert.equal(count(out, /color:%%=v\(@TextOnPrimaryColour\)=%%;/g), 3);
});
test('lists in a table cell inherit from the nearest styled ancestors without splitting', () => {
  const out = C.placeLists(
    '<table style="font-family: Arial;"><tr><td style="font-size: 16px; color: #111111; padding: 10px;">' +
      list() +
      '</td></tr></table>',
  );
  const row = out.match(/<li [^>]*>/)[0];
  for (const rule of ['color:#111111;', 'font-size:16px;', 'font-family:Arial;'])
    assert.ok(row.includes(rule), rule);
  assert.ok(!/padding:10px/.test(out.slice(out.indexOf('<ul'))));
  assert.equal(count(out, /<\/?p[ >]/g), 0);
});
test('nested lists keep their own indent and only the outer list carries the bottom margin', () => {
  const nested = OPEN + '<ul><li>One<ul type="square"><li>Inner</li></ul></li></ul>' + CLOSE;
  const out = C.placeLists(page(nested));
  assert.equal(count(out, /margin:0 0 18px 25px/g), 1);
  assert.match(out, /<ul [^>]*type="square"[^>]*style="margin:0 0 0 25px;/);
});
test('comments and conditional blocks before a list are ignored when finding its paragraph', () => {
  const out = C.placeLists(
    page('<!--[if mso]><p><![endif]-->Intro' + list()).replace('<td>', '<td><!-- <p> -->'),
  );
  assert.match(out, /Intro<\/p><ul /);
});
test('text without lists is returned unchanged', () => {
  const html = page('Plain <b>text</b>');
  assert.equal(C.placeLists(html), html);
});
