const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../src/history.js');
const C = require('../src/core.js');
require('../src/maintenance.js');
const M = globalThis.BlockMaintenance;
const copy = (value) => JSON.parse(JSON.stringify(value));
function moduleFixture() {
  const source = '<ul><li><a href="https://example.com">Button</a></li></ul>';
  return {
    id: 'one',
    name: 'Buttons',
    slug: 'buttons',
    release: '1.0.0',
    source,
    draftSource: source,
    fields: C.infer(source).fields,
    analysed: true,
    width: 600,
    reviewed: true,
    acknowledged: true,
    iconColour: '#080043',
    iconSymbol: 'grid',
  };
}

test('undo and redo restore repeat conversions and mapped fields as one complete change', () => {
  const m = moduleFixture(),
    h = H.create();
  h.track(m);
  const original = H.snapshot(m);
  C.repeatSelection(m, m.source.indexOf('<li>'), m.source.indexOf('</li>') + 5);
  const repeated = H.snapshot(m);
  assert.notEqual(repeated, original);
  h.capture(m);
  assert.ok(h.undo(m));
  assert.equal(H.snapshot(m), original);
  assert.equal(m.reviewed, false);
  assert.equal(m.acknowledged, false);
  assert.ok(h.redo(m));
  assert.equal(H.snapshot(m), repeated);
  assert.equal(C.render(m), C.render(JSON.parse(original)));
  assert.notEqual(m.fields, JSON.parse(repeated).fields);
});

test('field order, removal and icon changes recover exact nested values without sharing references', () => {
  const m = moduleFixture(),
    h = H.create();
  h.track(m);
  const original = H.snapshot(m);
  m.fields.reverse();
  h.capture(m);
  assert.equal(h.status(m).undo, 'field order');
  const reordered = H.snapshot(m);
  m.fields.pop();
  h.capture(m);
  assert.equal(h.status(m).undo, 'field removal');
  h.undo(m);
  assert.equal(H.snapshot(m), reordered);
  h.undo(m);
  assert.equal(H.snapshot(m), original);
  m.iconAssets = { icon: 'new', dragIcon: 'new drag' };
  h.capture(m);
  h.undo(m);
  assert.equal(Object.hasOwn(m, 'iconAssets'), false);
  h.redo(m);
  assert.equal(m.iconAssets.icon, 'new');
  m.slug = 'changed';
  h.capture(m);
  assert.equal(h.status(m).undo, 'module settings');
});

test('typing coalesces until a boundary and a new change clears redo', () => {
  const m = moduleFixture(),
    h = H.create();
  h.track(m);
  m.name = 'A';
  h.capture(m, 'name', 'name-input');
  m.name = 'AB';
  h.capture(m, 'name', 'name-input');
  h.endGroup();
  m.name = 'ABC';
  h.capture(m, 'name', 'name-input');
  h.undo(m);
  assert.equal(m.name, 'AB');
  h.undo(m);
  assert.equal(m.name, 'Buttons');
  assert.equal(h.status(m).undo, '');
  h.redo(m);
  assert.equal(m.name, 'AB');
  m.name = 'Different';
  h.capture(m);
  assert.equal(h.status(m).redo, '');
});

test('histories are isolated by module object even with matching template IDs; replacements start fresh', () => {
  const a = moduleFixture(),
    b = moduleFixture(),
    h = H.create();
  h.track(a);
  h.track(b);
  a.name = 'First';
  h.capture(a);
  b.name = 'Second';
  h.capture(b);
  h.undo(a);
  assert.equal(a.name, 'Buttons');
  assert.equal(b.name, 'Second');
  const replacement = copy(b);
  h.prune([a, replacement]);
  assert.deepEqual(h.status(replacement), { undo: '', redo: '' });
  assert.deepEqual(h.status(b), { undo: '', redo: '' });
  assert.equal(h.status(a).redo, 'module name');
});

test('undo never rewinds the latest export reference, identity or template colours', () => {
  const m = moduleFixture(),
    h = H.create();
  h.track(m);
  m.name = 'Exported now';
  h.capture(m);
  M.recordExport({ modules: [m] }, [copy(m)]);
  const exported = copy(m.exportedDefinition),
    published = copy(m.published);
  m.editorTheme = { accent: '#222222' };
  assert.equal(h.capture(m), false);
  h.undo(m);
  assert.equal(m.name, 'Buttons');
  assert.equal(m.id, 'one');
  assert.deepEqual(m.exportedDefinition, exported);
  assert.deepEqual(m.published, published);
  assert.equal(m.editorTheme.accent, '#222222');
});

test('last exported content restores exactly and remains undoable while keeping icons, width and export references', () => {
  const m = moduleFixture();
  M.recordExport({ modules: [m] }, [copy(m)]);
  // Optional properties absent from older exported definitions must be removed too.
  delete m.exportedDefinition.contextCss;
  delete m.exportedDefinition.templateMode;
  m.contextCss = '.client{color:red}';
  m.templateMode = true;
  m.width = 800;
  m.iconAssets = { icon: 'current', dragIcon: 'current drag' };
  m.fields[0].label = 'Edited field';
  const h = H.create();
  h.track(m);
  const before = H.snapshot(m);
  const reference = copy(m.exportedDefinition),
    published = copy(m.published);
  H.restoreExportedContent(m);
  h.capture(m, 'restore last exported content');
  assert.equal(m.fields[0].label, reference.fields[0].label);
  assert.equal(Object.hasOwn(m, 'contextCss'), false);
  assert.equal(Object.hasOwn(m, 'templateMode'), false);
  assert.equal(m.width, 800);
  assert.equal(m.iconAssets.icon, 'current');
  assert.deepEqual(m.exportedDefinition, reference);
  assert.deepEqual(m.published, published);
  h.undo(m);
  assert.equal(H.snapshot(m), before);
  h.redo(m);
  assert.equal(m.fields[0].label, reference.fields[0].label);
});

test('invalid or missing recovery references fail without mutating the module', () => {
  const m = moduleFixture();
  assert.throws(() => H.restoreExportedContent(m), /No exported content/);
  m.exportedDefinition = { ...copy(m), id: 'another module' };
  const before = JSON.stringify(m);
  assert.throws(() => H.restoreExportedContent(m), /invalid/);
  assert.equal(JSON.stringify(m), before);
});

test('retained history is bounded across modules and by snapshot size', () => {
  const a = moduleFixture(),
    b = moduleFixture(),
    h = H.create({ limit: 2 });
  h.track(a);
  h.track(b);
  a.name = '1';
  h.capture(a);
  b.name = '2';
  h.capture(b);
  a.name = '3';
  h.capture(a);
  h.undo(a);
  assert.equal(a.name, '1');
  assert.equal(h.undo(a), null);
  h.undo(b);
  assert.equal(b.name, 'Buttons');
  const small = H.create({ maxBytes: 1 });
  small.track(a);
  a.name = '4';
  small.capture(a);
  a.name = '5';
  small.capture(a);
  small.undo(a);
  assert.equal(a.name, '4');
  assert.equal(small.undo(a), null);
});

test('an uncaptured change is never silently overwritten by undo', () => {
  const m = moduleFixture(),
    h = H.create();
  h.track(m);
  m.name = 'Saved';
  h.capture(m);
  m.name = 'Uncaptured';
  assert.throws(() => h.undo(m), /module changed/);
  assert.equal(m.name, 'Uncaptured');
});

test('recovery availability reads only recoverable content, without copying icons or export metadata', () => {
  const m = moduleFixture();
  m.exportedDefinition = copy(m);
  for (const object of [m, m.exportedDefinition])
    for (const key of ['iconAssets', 'published'])
      Object.defineProperty(object, key, {
        enumerable: true,
        get() {
          throw Error('Unnecessary metadata read');
        },
      });
  assert.equal(H.hasRecoveryChanges(m), false);
  m.fields[0].label = 'Changed';
  assert.equal(H.hasRecoveryChanges(m), true);
  m.exportedDefinition.fields[0].label = 'Changed';
  assert.equal(H.hasRecoveryChanges(m), false, 'a newer export must be considered immediately');
});
