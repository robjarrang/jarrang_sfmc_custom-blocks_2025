const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const C = require('../src/core.js');
const context = {
  URL,
  window: { BlockCore: C },
  crypto: require('node:crypto').webcrypto,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/../src/workspace.js', 'utf8'), context);
const W = context.window.BlockWorkspace;
const project = () => ({
  format: 'jarrang-block-studio',
  version: 1,
  settings: { name: 'Original' },
  modules: [
    {
      id: 'hero',
      name: 'Hero',
      slug: 'hero',
      source: '<p>Hello</p>',
      draftSource: '<p>Hello</p>',
      fields: [],
    },
  ],
});
const add = (ws, client, name) => {
  const p = W.normalise(project());
  p.settings = W.naming(ws, p, client, name);
  ws.projects.push(p);
  return p;
};
test('legacy migration preserves module identity, fields and the original project', () => {
  const old = project(),
    ws = W.create(old);
  assert.ok(ws.activeId);
  assert.equal(ws.projects[0].modules[0].id, 'hero');
  assert.equal(old.projectId, undefined);
  assert.equal(W.path(ws.projects[0]), null);
  assert.equal(W.validate(JSON.parse(JSON.stringify(ws))).activeId, ws.activeId);
});
test('templates have independent objects and module slugs can repeat across clients', () => {
  const ws = W.create(project()),
    a = add(ws, 'Hertz', 'Commercial'),
    b = add(ws, 'Milwaukee', 'Newsletter');
  a.modules[0].source = 'changed';
  assert.equal(b.modules[0].source, '<p>Hello</p>');
  assert.equal(W.path(a), 'clients/hertz/commercial');
  assert.equal(W.path(b), 'clients/milwaukee/newsletter');
});
test('renaming retains published paths and collisions are rejected', () => {
  const ws = W.create(project()),
    p = add(ws, 'Hertz', 'Commercial');
  p.settings = W.naming(ws, p, 'Hertz', 'Commercial 2027');
  assert.equal(W.path(p), 'clients/hertz/commercial');
  assert.throws(() => add(ws, 'Hertz', 'Commercial'), /already has/);
  assert.throws(() => add(ws, 'HERTZ!', 'Loyalty'), /existing client folder/);
});
test('import requires confirmation for matching identity or path and preserves other drafts', () => {
  const ws = W.create(project()),
    p = add(ws, 'Hertz', 'Commercial'),
    other = add(ws, 'Milwaukee', 'Newsletter');
  const incoming = JSON.parse(JSON.stringify(p));
  incoming.modules[0].source = '<p>Updated</p>';
  assert.throws(() => W.importProject(ws, incoming), /Confirm/);
  W.importProject(ws, incoming, p.projectId);
  assert.equal(ws.projects.length, 3);
  assert.equal(other.modules[0].source, '<p>Hello</p>');
  assert.equal(
    ws.projects.find((x) => x.projectId === p.projectId).modules[0].source,
    '<p>Updated</p>',
  );
});
test('import cannot redirect one project into another project folder', () => {
  const ws = W.create(project()),
    a = add(ws, 'Hertz', 'Commercial'),
    b = add(ws, 'Hertz', 'Loyalty');
  const incoming = JSON.parse(JSON.stringify(a));
  incoming.settings.templateSlug = b.settings.templateSlug;
  assert.throws(
    () => W.importProject(ws, incoming, a.projectId),
    /different templates|overwrite another/,
  );
});
test('unsafe publishing paths and repository URLs are rejected', () => {
  const p = project();
  p.settings.clientSlug = '../escape';
  p.settings.templateSlug = 'x';
  assert.throws(() => W.normalise(p), /invalid publishing/);
  for (const url of ['http://example.com', 'https://a:b@example.com', 'https://example.com/?x=1'])
    assert.throws(() => W.repositoryURL(url));
  assert.equal(W.repositoryURL('https://team.github.io/blocks/'), 'https://team.github.io/blocks');
});
test('stale tab save cannot overwrite a newer saved workspace', () => {
  const data = new Map(),
    storage = {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, v),
    },
    ws = W.create(project());
  const first = W.save(storage, ws, null);
  const newer = JSON.parse(first);
  newer.projects[0].settings.name = 'Newer draft';
  const latest = W.save(storage, newer, first);
  assert.throws(() => W.save(storage, ws, first), /Another tab/);
  assert.equal(storage.getItem(W.KEY), latest);
});
test('ambiguous identity and path imports are rejected regardless of project order', () => {
  for (const reverse of [false, true]) {
    const ws = W.create(project()),
      a = add(ws, 'Hertz', 'Commercial'),
      b = add(ws, 'Hertz', 'Loyalty'),
      incoming = JSON.parse(JSON.stringify(a));
    incoming.settings.templateSlug = b.settings.templateSlug;
    if (reverse) ws.projects.reverse();
    assert.throws(() => W.importConflict(ws, incoming), /different templates/);
  }
});
test('old projects receive missing draft HTML; malformed drafts fail before opening', () => {
  const p = project();
  delete p.modules[0].draftSource;
  assert.equal(W.normalise(p).modules[0].draftSource, p.modules[0].source);
  p.modules[0].draftSource = {};
  assert.throws(() => W.normalise(p), /Invalid draft HTML/);
});
