const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(__dirname + '/../src/preview.js', 'utf8'), context);
class Node {
  constructor(name, value = '', attrs = {}, children = []) {
    this.nodeName = name;
    this.nodeType = name === '#text' ? 3 : 1;
    this.nodeValue = value;
    this.attrs = { ...attrs };
    this.childNodes = [];
    this.writes = 0;
    children.forEach((n) => this.append(n));
  }
  get attributes() {
    return Object.entries(this.attrs).map(([name, value]) => ({ name, value }));
  }
  hasAttribute(n) {
    return n in this.attrs;
  }
  getAttribute(n) {
    return this.attrs[n] ?? null;
  }
  setAttribute(n, v) {
    this.attrs[n] = v;
    this.writes++;
  }
  removeAttribute(n) {
    delete this.attrs[n];
  }
  append(n) {
    n.parent = this;
    this.childNodes.push(n);
  }
  remove() {
    this.parent.childNodes.splice(this.parent.childNodes.indexOf(this), 1);
  }
  replaceWith(n) {
    n.parent = this.parent;
    this.parent.childNodes.splice(this.parent.childNodes.indexOf(this), 1, n);
  }
  cloneNode() {
    return new Node(
      this.nodeName,
      this.nodeValue,
      this.attrs,
      this.childNodes.map((n) => n.cloneNode()),
    );
  }
  shape() {
    return [this.nodeName, this.nodeValue, this.attrs, this.childNodes.map((n) => n.shape())];
  }
  isEqualNode(n) {
    return JSON.stringify(this.shape()) === JSON.stringify(n.shape());
  }
}
test('preview updates text and attributes without replacing unchanged images or containers', () => {
  const image = new Node('IMG', '', { src: 'https://example.com/image.png' }),
    text = new Node('#text', 'Before'),
    p = new Node('P', '', {}, [text]);
  const current = new Node('DIV', '', {}, [image, p]),
    next = current.cloneNode();
  next.childNodes[1].childNodes[0].nodeValue = 'After';
  next.childNodes[1].attrs.style = 'color:red';
  context.window.BlockPreview.reconcile(current, next);
  assert.equal(current.childNodes[0], image);
  assert.equal(image.writes, 0);
  assert.equal(current.childNodes[1], p);
  assert.equal(p.childNodes[0], text);
  assert.equal(text.nodeValue, 'After');
  assert.equal(p.attrs.style, 'color:red');
});
test('preview handles added, removed and changed element types', () => {
  const current = new Node('DIV', '', {}, [new Node('P'), new Node('IMG')]),
    next = new Node('DIV', '', {}, [new Node('H1')]);
  context.window.BlockPreview.reconcile(current, next);
  assert.deepEqual(current.shape(), next.shape());
  next.append(new Node('P', '', {}, [new Node('#text', 'New')]));
  context.window.BlockPreview.reconcile(current, next);
  assert.deepEqual(current.shape(), next.shape());
});
test('trial preview loads once and keeps the latest edit while its document is loading', () => {
  const app = fs.readFileSync(__dirname + '/../src/app.js', 'utf8'),
    start = app.indexOf('  let workspacePreviewHTML'),
    end = app.indexOf('  function renderTrialPreview', start),
    sent = [],
    loads = [];
  const frame = {
    contentWindow: { postMessage: (m) => sent.push(m) },
    addEventListener: (event, fn) => (frame[event] = fn),
  };
  const ctx = { $: () => frame, setFrame: (id, html) => loads.push(html) };
  vm.createContext(ctx);
  vm.runInContext(app.slice(start, end), ctx);
  ctx.updateWorkspacePreview('first');
  ctx.updateWorkspacePreview('latest');
  assert.deepEqual(loads, ['first']);
  assert.equal(sent.length, 0);
  frame.load();
  assert.equal(sent.at(-1).html, 'latest');
  ctx.updateWorkspacePreview('changed');
  assert.equal(sent.at(-1).html, 'changed');
  assert.equal(loads.length, 1);
  const count = sent.length;
  ctx.updateWorkspacePreview('changed');
  assert.equal(sent.length, count);
});

test('preview alias resolution separates sibling loops and restores an outer alias after nesting', () => {
  const source =
    '{% for item in buttons %}{{ item.label }}{% endfor %}{% for item in cards %}{{ item.title }}{% for item in images %}{{ item.alt }}{% endfor %}{{ item.footer }}{% endfor %}';
  const scopes = context.window.BlockPreview.loopScopes(source);
  const resolve = (text) => {
    const at = source.indexOf(text);
    return [...scopes].reverse().find((s) => s.alias === 'item' && at >= s.start && at < s.end)
      ?.key;
  };
  assert.equal(resolve('{{ item.label }}'), 'buttons');
  assert.equal(resolve('{{ item.title }}'), 'cards');
  assert.equal(resolve('{{ item.alt }}'), 'images');
  assert.equal(resolve('{{ item.footer }}'), 'cards');
});
