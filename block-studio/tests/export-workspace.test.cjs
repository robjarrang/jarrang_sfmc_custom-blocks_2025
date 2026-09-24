const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm'),
  path = require('node:path');
const C = require('../src/core.js'),
  JSZip = require('jszip');
const canvas = {
  getContext: () => ({
    fillRect() {},
    strokeRect() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    fill() {},
  }),
  toDataURL: () => 'data:image/png;base64,aWNvbg==',
};
const context = {
  window: { BlockCore: C },
  JSZip,
  Path2D: class {},
  URL,
  document: { createElement: () => canvas },
};
vm.createContext(context);
for (const name of ['export-assets.js', 'block-icons.js', 'exporter.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../src/' + name, 'utf8'), context);
const E = context.window.BlockExport;
const moduleData = (id = 'hero') => ({
  id,
  name: id,
  slug: id,
  release: '1.0.0',
  source: '<p>Hello</p>',
  draftSource: '<p>Hello</p>',
  fields: [],
  reviewed: true,
  acknowledged: true,
});
const project = () => ({
  format: 'jarrang-block-studio',
  version: 1,
  projectId: 'p1',
  settings: {
    name: 'Commercial',
    clientName: 'Hertz',
    clientSlug: 'hertz',
    templateSlug: 'commercial',
  },
  modules: [moduleData(), moduleData('footer')],
});
async function build(p, all) {
  const blob = await E.build(p, all ? p.modules : [p.modules[0]], {
    ...p.settings,
    baseUrl: 'https://team.github.io/blocks',
    fullTemplate: all,
  });
  return JSZip.loadAsync(await blob.arrayBuffer());
}
test('full template export isolates paths and all editor dependencies resolve within ZIP', async () => {
  const p = project(),
    zip = await build(p, true),
    files = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  assert.ok(files.includes('docs/clients/hertz/commercial/index.html'));
  assert.ok(!files.includes('docs/index.html'));
  assert.ok(!files.includes('docs/studio/index.html'));
  for (const file of files.filter((n) => n.endsWith('/modules/hero/index.html'))) {
    const html = await zip.file(file).async('string');
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      assert.ok(
        zip.file(path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1]))),
        match[1],
      );
    }
  }
  const source = JSON.parse(
    await zip.file('projects/hertz/commercial.jarrang.json').async('string'),
  );
  assert.equal(source.modules.length, 2);
  assert.equal(source.projectId, 'p1');
  assert.equal(
    E.endpoint(p.modules[0], 'https://team.github.io/blocks', p.settings),
    'https://team.github.io/blocks/clients/hertz/commercial/modules/hero/',
  );
  assert.ok(
    (await zip.file('projects/hertz/commercial-PUBLISHING.md').async('string')).includes('\n\n'),
  );
});
test('single module update preserves catalogue and retains full editable project', async () => {
  const p = project(),
    zip = await build(p, false);
  assert.equal(zip.file('docs/clients/hertz/commercial/index.html'), null);
  assert.equal(zip.file('docs/clients/hertz/commercial/modules/footer/index.html'), null);
  assert.equal(
    JSON.parse(await zip.file('projects/hertz/commercial.jarrang.json').async('string')).modules
      .length,
    2,
  );
});
test('same module names for different clients cannot collide', async () => {
  const a = project(),
    b = project();
  b.settings.clientSlug = 'milwaukee';
  const za = await build(a, true),
    zb = await build(b, true);
  const common = Object.keys(za.files).filter((n) => !za.files[n].dir && zb.file(n));
  assert.ok(
    common.every(
      (n) =>
        n === 'docs/.nojekyll' ||
        n === 'BOOTSTRAP-ICONS-LICENSE.txt' ||
        n.startsWith('docs/shared-assets/'),
    ),
  );
});
test('duplicate sibling module folders and traversal paths fail export', async () => {
  const p = project();
  p.modules[1].slug = 'hero';
  await assert.rejects(() => build(p, false), /same folder/);
  p.settings.clientSlug = '../other';
  await assert.rejects(() => build(p, true), /valid client/);
});

test('all exported module forms use template colours while editable JSON retains the shared setting', async () => {
  const p = project();
  p.settings.editorTheme = {
    accent: '#003366',
    background: '#ffffff',
    text: '#111111',
    field: '#eeeeee',
  };
  p.modules[0].editorTheme = { accent: '#aa0000' };
  const zip = await build(p, true);
  for (const m of p.modules) {
    const html = await zip
      .file('docs/clients/hertz/commercial/modules/' + m.slug + '/index.html')
      .async('string');
    assert.ok(html.includes('background:#003366'));
    assert.ok(!html.includes('background:#aa0000'));
  }
  const saved = JSON.parse(
    await zip.file('projects/hertz/commercial.jarrang.json').async('string'),
  );
  assert.equal(saved.settings.editorTheme.accent, '#003366');
  assert.equal(p.modules[0].editorTheme.accent, '#aa0000');
});

test('single and full packages include both case-sensitive PNG names and preserve icon settings', async () => {
  for (const all of [false, true]) {
    const p = project();
    p.modules[0].iconSymbol = 'image';
    p.modules[0].iconColour = '#fedcba';
    const zip = await build(p, all);
    for (const module of all ? p.modules : [p.modules[0]]) {
      const base = 'docs/clients/hertz/commercial/modules/' + module.slug + '/';
      assert.ok(zip.file(base + 'icon.png'));
      assert.ok(zip.file(base + 'dragIcon.png'));
      assert.equal(zip.file(base + 'dragicon.png'), null);
    }
    const saved = JSON.parse(
      await zip.file('projects/hertz/commercial.jarrang.json').async('string'),
    );
    assert.equal(saved.modules[0].iconSymbol, 'image');
    assert.equal(saved.modules[0].iconColour, '#fedcba');
    assert.match(
      await zip.file('BOOTSTRAP-ICONS-LICENSE.txt').async('string'),
      /Bootstrap Authors/,
    );
  }
});
