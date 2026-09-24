const { test } = require('node:test'),
  assert = require('node:assert/strict');
const E = require('../src/code-editor.js');
test('pairs nested tags without treating quoted angle brackets, comments or void tags as nesting', () => {
  const s =
      '<table><tr><td title="x > y"><!-- <td>fake</td> --><p>A<br>B<img src="a"></p></td></tr></table>',
    m = E.scan(s),
    groups = m.groups.filter((g) => g.kind === 'html');
  assert.deepEqual(
    groups.map((g) => g.label),
    ['<p>', '<td>', '<tr>', '<table>'],
  );
  for (const g of groups) {
    assert.equal(g.members.length, 2);
    assert.equal(m.tokens[g.members[0]].group, g);
    assert.equal(m.tokens[g.members[1]].group, g);
  }
  assert.ok(m.colours.some((c) => c.kind === 'value' && s.slice(c.start, c.end) === '"x > y"'));
});
test('matches nested template statements and assigns branches to the correct block', () => {
  const s =
      '{% if show %}{% for item in list %}{{ item.text }}{% else %}Empty{% endfor %}{% elsif other %}Other{% else %}No{% endif %}',
    m = E.scan(s);
  const loop = m.groups.find((g) => g.kind === 'for'),
    condition = m.groups.find((g) => g.kind === 'if');
  assert.deepEqual(
    loop.members.map((i) => m.tokens[i].text),
    ['{% for item in list %}', '{% else %}', '{% endfor %}'],
  );
  assert.deepEqual(
    condition.members.map((i) => m.tokens[i].text),
    ['{% if show %}', '{% elsif other %}', '{% else %}', '{% endif %}'],
  );
});
test('search is literal, case-aware and preserves indices around Unicode characters', () => {
  assert.deepEqual(E.matches('a.b A.B', 'a.b'), [
    { start: 0, end: 3 },
    { start: 4, end: 7 },
  ]);
  assert.equal(E.matches('a.b A.B', 'a.b', true).length, 1);
  assert.deepEqual(E.matches('İ <p>Hello</p>', '<p>'), [{ start: 2, end: 5 }]);
  assert.deepEqual(E.matches('[x] (a) \\', '['), [{ start: 0, end: 1 }]);
  assert.deepEqual(E.matches('abc', ''), []);
});
test('fold projection maps following text back to the original source and collapses nested regions once', () => {
  const s = '<table>\n<tr>\n<td>Hello</td>\n</tr>\n</table>\n<p>After</p>',
    groups = E.scan(s).groups,
    p = E.projection(
      s,
      groups.filter((g) => ['<table>', '<tr>'].includes(g.label)),
    );
  assert.equal((p.text.match(/folded/g) || []).length, 1);
  assert.equal(p.toSource(p.text.indexOf('After')), s.indexOf('After'));
  assert.equal(s.slice(p.toSource(p.text.indexOf('<p>'))), '<p>After</p>');
});
// Small DOM harness exercises the real shared component, without claiming browser layout coverage.
class Node {
  constructor(doc, tag = '', text = '') {
    this.ownerDocument = doc;
    this.tagName = tag;
    this.children = [];
    this.parentNode = null;
    this._value = '';
    this.textContent = text;
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.hidden = false;
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.selectionDirection = 'none';
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.classList = { toggle() {} };
  }
  set value(v) {
    this._value = this.tagName === 'textarea' ? v.replace(/\r\n?/g, '\n') : v;
    this.selectionStart = this.selectionEnd = this._value.length;
  }
  get value() {
    return this._value;
  }
  append(...nodes) {
    for (let n of nodes) {
      if (typeof n === 'string') n = new Node(this.ownerDocument, 'text', n);
      if (n.parentNode) n.parentNode.children = n.parentNode.children.filter((c) => c !== n);
      n.parentNode = this;
      this.children.push(n);
    }
  }
  prepend(...nodes) {
    for (const n of nodes.reverse()) {
      if (n.parentNode) n.parentNode.children = n.parentNode.children.filter((c) => c !== n);
      n.parentNode = this;
      this.children.unshift(n);
    }
  }
  insertBefore(n, other) {
    n.parentNode = this;
    this.children.splice(this.children.indexOf(other), 0, n);
  }
  replaceChildren(...nodes) {
    this.children.forEach((n) => (n.parentNode = null));
    this.children = [];
    this.append(...nodes);
  }
  setAttribute(k, v) {
    this[k] = v;
  }
  addEventListener(k, v) {
    (this.listeners[k] ||= []).push(v);
  }
  focus() {}
  setSelectionRange(a, b, d = 'none') {
    this.selectionStart = a;
    this.selectionEnd = b;
    this.selectionDirection = d;
  }
  fire(type, event = {}) {
    for (const cb of this.listeners[type] || []) cb(event);
  }
}
function mount(options = {}) {
  const doc = {
      createElement: (tag) => new Node(doc, tag),
      createTextNode: (text) => new Node(doc, 'text', text),
    },
    host = new Node(doc, 'div'),
    editor = E.mount(host, options);
  const all = () => {
    const result = [];
    function walk(n) {
      result.push(n);
      n.children.forEach(walk);
    }
    walk(host);
    return result;
  };
  return {
    host,
    editor,
    all,
    button: (text) => all().find((n) => n.tagName === 'button' && n.textContent === text),
  };
}
test('shared component highlights matching tags and keeps raw CRLF selections accurate', () => {
  const source = '<p>First</p>\r\n<div>Second</div>',
    { editor, all } = mount({ readOnly: true, value: source });
  editor.input.setSelectionRange(1, 1);
  editor.input.fire('mouseup');
  assert.equal(all().filter((n) => n.className.includes('code-pair')).length, 2);
  const start = editor.input.value.indexOf('Second');
  editor.input.setSelectionRange(start, start + 6, 'backward');
  editor.input.fire('keyup');
  assert.deepEqual(editor.getSelection(), {
    start: source.indexOf('Second'),
    end: source.indexOf('Second') + 6,
  });
  assert.equal(editor.input.selectionDirection, 'backward');
});
test('folding preserves source and expands before copying or editing; line numbers retain original positions', () => {
  const source = '<table>\n<tr>\n<td>Hello</td>\n</tr>\n</table>\n<p>After</p>',
    { editor, button, all } = mount({ value: source, onInput: (v) => v });
  button('▾').onclick();
  assert.equal(editor.input.readOnly, true);
  assert.equal(editor.getSelection(), null);
  assert.ok(editor.input.value.includes('folded'));
  let prevented = false;
  editor.input.fire('copy', {
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.ok(all().some((n) => n.tagName === 'span' && n.textContent === 6));
  button('Expand all').onclick();
  assert.equal(editor.input.value, source);
  assert.equal(editor.input.readOnly, false);
});
test('field activation uses source offsets and rejected edits restore code and cursor', () => {
  let selected;
  const { editor } = mount({
    value: '<p>Hello</p>',
    fields: [{ start: 3, end: 8, id: 'hello', label: 'Greeting' }],
    onField: (ids) => (selected = ids),
    onInput: () => {
      throw Error('Protected field');
    },
  });
  editor.input.setSelectionRange(4, 4);
  editor.input.fire('click');
  assert.deepEqual(selected, ['hello']);
  editor.input.fire('beforeinput');
  editor.input.value = '<p>Hxello</p>';
  editor.input.fire('input');
  assert.equal(editor.input.value, '<p>Hello</p>');
  assert.equal(editor.input.selectionStart, 4);
});
test('find navigation and replace callbacks use exact CRLF offsets', () => {
  let edits;
  const { editor, all, button } = mount({
    value: '<p>A</p>\r\n<p>B</p>',
    onReplace: (e) => {
      edits = e;
      return '<p>A</p>\r\n<p>C</p>';
    },
  });
  const find = all().find((n) => n.type === 'search'),
    replace = all().find((n) => n.placeholder === 'Replace with');
  find.value = 'B';
  find.oninput();
  button('Previous').onclick();
  assert.deepEqual(editor.getSelection(), { start: 13, end: 14 });
  replace.value = 'C';
  button('Replace').onclick();
  assert.deepEqual(edits, [{ start: 13, end: 14, value: 'C' }]);
  assert.equal(editor.input.value, '<p>A</p>\n<p>C</p>');
});
test('all displayed cursor positions map correctly when CRLF occurs at the beginning', () => {
  const source = '\r\n<p>A</p>\r\n<p>B</p>\r\n',
    { editor } = mount({ value: source, readOnly: true });
  const text = editor.input.value;
  for (let i = 0; i <= text.length; i++) {
    editor.input.setSelectionRange(i, i);
    assert.equal(editor.getSelection().start, E.rawOffset(source, i), 'offset ' + i);
  }
});
test('template conditions inside attributes have matching branches and distinct syntax tokens', () => {
  const source = '<td style="color:{% if dark %}black{% else %}white{% endif %}">{{ title }}</td>',
    m = E.scan(source);
  const condition = m.groups.find((g) => g.kind === 'if');
  assert.equal(condition.members.length, 3);
  assert.equal(m.groups.filter((g) => g.kind === 'html').length, 1);
  assert.ok(
    m.colours.some((c) => c.kind === 'logic' && source.slice(c.start, c.end) === '{% if dark %}'),
  );
});

test('decoration follows native scrolling exactly without a separately clamped scroll range', () => {
  const { editor, all } = mount({
    value: '<div>\n' + '  <p>Text</p>\n'.repeat(100) + '</div>',
  });
  const paint = all().find((n) => n.className === 'code-paint-content');
  const gutter = all().find((n) => n.className === 'code-gutter').children[0];
  for (const [top, left] of [
    [0, 0],
    [21, 70],
    [1763.5, 402.25],
    [0, 0],
  ]) {
    editor.input.scrollTop = top;
    editor.input.scrollLeft = left;
    editor.input.fire('scroll');
    assert.equal(paint.style.transform, `translate(${-left}px,${-top}px)`);
    assert.equal(gutter.style.transform, `translateY(${-top}px)`);
  }
  assert.equal(paint.children.map((n) => n.textContent).join(''), editor.input.value + ' ');
  editor.input.setSelectionRange(1, 1);
  editor.input.fire('mouseup');
  assert.equal(all().filter((n) => n.className.includes('code-pair')).length, 2);
});

test('Make repeating toolbar passes raw cursor offsets after CRLF without dragging a selection', () => {
  const source = '<p>First</p>\r\n<div>Second</div>';
  let selected;
  const { editor, button } = mount({
    value: source,
    readOnly: true,
    onRepeat: (range) => (selected = range),
  });
  const offset = editor.input.value.indexOf('Second') + 2;
  editor.input.setSelectionRange(offset, offset);
  editor.input.fire('mouseup');
  button('Make repeating').onclick();
  assert.deepEqual(selected, {
    start: source.indexOf('Second') + 2,
    end: source.indexOf('Second') + 2,
  });
  assert.equal(editor.input.value, source.replace(/\r\n/g, '\n'));
});
