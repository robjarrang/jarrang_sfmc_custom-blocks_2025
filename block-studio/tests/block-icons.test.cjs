const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const calls = [];
const ctx = {
  fillRect(...args) {
    calls.push(['background', this.fillStyle, ...args]);
  },
  save() {},
  restore() {},
  translate(...args) {
    calls.push(['translate', ...args]);
  },
  scale(...args) {
    calls.push(['scale', ...args]);
  },
  fill(path, rule) {
    calls.push(['path', path.value, rule, this.fillStyle]);
  },
  strokeRect() {},
  fillText() {},
};
const canvas = { getContext: () => ctx, toDataURL: () => 'data:image/png;base64,cG5n' };
const context = {
  window: {},
  document: { createElement: () => canvas },
  Path2D: class {
    constructor(value) {
      this.value = value;
    }
  },
};
vm.createContext(context);
for (const name of ['block-icons.js', 'exporter.js'])
  vm.runInContext(fs.readFileSync(__dirname + '/../src/' + name, 'utf8'), context);
const I = context.window.BlockIcons,
  E = context.window.BlockExport;
test('bundled icons use contrasting foregrounds and reject unknown symbols and unsafe colours', () => {
  assert.equal(I.foreground({ iconColour: '#ffffff' }), '#000000');
  assert.equal(I.foreground({ iconColour: '#080043' }), '#ffffff');
  assert.equal(I.background({ iconColour: 'url(https://example.com)' }), '#080043');
  assert.equal(I.selected({ iconSymbol: '__proto__' }), undefined);
  assert.equal(
    I.license,
    fs.readFileSync(__dirname + '/../vendor/BOOTSTRAP-ICONS-LICENSE.txt', 'utf8'),
  );
});
test('every icon draws its bundled paths at both PNG export sizes with the chosen colour', () => {
  for (const choice of I.choices)
    for (const size of [60, 120]) {
      calls.length = 0;
      assert.equal(
        E.icon({ name: 'Module', iconSymbol: choice.id, iconColour: '#ffffff' }, size),
        'cG5n',
      );
      assert.equal(canvas.width, size);
      assert.equal(canvas.height, size);
      assert.deepEqual(calls[0], ['background', '#ffffff', 0, 0, size, size]);
      assert.deepEqual(calls[1], ['translate', size * 0.2, size * 0.2]);
      const paths = calls.filter((c) => c[0] === 'path');
      assert.equal(paths.length, choice.paths.length);
      paths.forEach((p, i) =>
        assert.deepEqual(p, ['path', choice.paths[i], choice.rule || 'nonzero', '#000000']),
      );
    }
});
test('existing projects without an icon selection retain the original artwork', () => {
  calls.length = 0;
  E.icon({ name: 'Existing module', iconColour: '#080043' }, 60);
  assert.equal(
    calls.some((c) => c[0] === 'path'),
    false,
  );
});
