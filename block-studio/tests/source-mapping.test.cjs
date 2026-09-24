const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(__dirname + '/../src/app.js', 'utf8');
const start = app.indexOf('  function sourceFieldRanges('),
  end = app.indexOf('  let mappingCode', start);
const context = {};
vm.createContext(context);
vm.runInContext(app.slice(start, end), context);
const ranges = (m) => JSON.parse(JSON.stringify(context.sourceFieldRanges(m)));
test('HTML connections preserve overlapping targets and ignore disabled or invalid mappings', () => {
  const module = {
    source: '<p>Hello 🌍</p>',
    fields: [
      { id: 'section', enabled: true, targets: [{ start: 0, end: 15 }] },
      { id: 'text', enabled: true, targets: [{ start: 3, end: 11 }] },
      { id: 'off', enabled: false, targets: [{ start: 3, end: 11 }] },
      { id: 'bad', enabled: true, targets: [{ start: -1, end: 20 }] },
    ],
  };
  assert.deepEqual(ranges(module), [
    { start: 0, end: 15, id: 'section' },
    { start: 3, end: 11, id: 'text' },
  ]);
});
test('template code connects conditional, scalar and scoped repeated references without changing source', () => {
  const source =
    '{% if show %}{{ title }}{% endif %}{% for item in buttons %}{{ item.text }}{% endfor %}{{ item }}';
  const module = {
    source,
    templateMode: true,
    fields: ['show', 'title', 'buttons', 'item'].map((id) => ({
      id,
      key: id,
      enabled: true,
      targets: [],
    })),
  };
  const before = JSON.stringify(module),
    result = ranges(module);
  assert.deepEqual(
    result.map((r) => [source.slice(r.start, r.end), r.id]),
    [
      ['{% if show %}', 'show'],
      ['{{ title }}', 'title'],
      ['{% for item in buttons %}', 'buttons'],
      ['{{ item.text }}', 'buttons'],
      ['{{ item }}', 'item'],
    ],
  );
  assert.equal(JSON.stringify(module), before);
});
test('loop boundaries pair nested and adjacent loops and leave incomplete loops unboxed', () => {
  const source =
    '{% for item in cards %}A{% for child in item.children %}B{% endfor %}C{% endfor %}{% for link in links %}D{% endfor %}{% for x in unfinished %}';
  const module = {
    source,
    templateMode: true,
    fields: [
      { id: 'cards', label: 'Cards', enabled: true },
      { id: 'links', label: 'Links', enabled: true },
    ],
  };
  const loops = JSON.parse(JSON.stringify(context.sourceLoopRanges(module)));
  assert.equal(loops.length, 3);
  assert.equal(
    source.slice(loops[0].start, loops[0].end),
    '{% for item in cards %}A{% for child in item.children %}B{% endfor %}C{% endfor %}',
  );
  assert.equal(
    source.slice(loops[1].start, loops[1].end),
    '{% for child in item.children %}B{% endfor %}',
  );
  assert.deepEqual(
    loops.map((l) => l.label),
    ['Cards', 'Cards', 'Links'],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.sourceLoopRanges({ ...module, templateMode: false }))),
    [],
  );
});
