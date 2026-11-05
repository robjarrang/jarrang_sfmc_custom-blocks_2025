const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const { minify } = require('../src/runtime-core.js');

async function environment() {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  const context = vm.createContext({
    window: { getSelection: dom.getSelection.bind(dom) },
    document: dom.document,
    DOMParser: dom.DOMParser,
    URL,
    JSZip: require('../vendor/jszip.min.js'),
    Uint8Array,
    btoa,
    crypto: require('node:crypto').webcrypto,
    setTimeout,
    clearTimeout,
  });
  for (const file of [
    'logic',
    'runtime-core',
    'html-validation',
    'core',
    'maintenance',
    'export-assets',
    'block-icons',
    'exporter',
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, '../src/' + file + '.js'), 'utf8'),
      context,
    );
  return { ...context.window, dom };
}

test('removes indentation, tabs and line breaks beside layout boundaries', () => {
  assert.equal(
    minify('<table>\n\t<tr>\n    <td>\n      Hello\n      world\n    </td>\n  </tr>\n</table>\n'),
    '<table><tr><td>Hello world</td></tr></table>',
  );
  assert.equal(minify('<td\n  class="a"\n  width="8"\n>x</td>'), '<td class="a" width="8">x</td>');
  assert.equal(
    minify('<div>\n  <img src="a.png" style="display: block;">\n</div>'),
    '<div><img src="a.png" style="display: block;"></div>',
  );
});

test('keeps one space between inline content', () => {
  assert.equal(minify('<p>a <b>x</b>\n    <i>y</i>\n</p>'), '<p>a <b>x</b> <i>y</i></p>');
  assert.equal(
    minify('<a href="#">\n  <img src="a.png">\n</a>'),
    '<a href="#"> <img src="a.png"> </a>',
  );
  assert.equal(
    minify('<a style="display: block">\n  <img src="a.png">\n</a>'),
    '<a style="display: block"><img src="a.png"></a>',
  );
});

test('leaves spaces without a line break, non-breaking spaces and empty elements alone', () => {
  assert.equal(minify('<td>a  b</td> <td>c</td>'), '<td>a  b</td> <td>c</td>');
  assert.equal(minify('<td>a\u00a0\n\u00a0b</td>'), '<td>a\u00a0 \u00a0b</td>');
  assert.equal(minify('<td>\n</td><td>&nbsp;</td>'), '<td>\n</td><td>&nbsp;</td>');
});

test('copies AMPscript, comments and raw-text elements unchanged', () => {
  const amp = '%%[\n  SET @a = 1\n    IF @a > 0 THEN\n]%%';
  assert.equal(
    minify('<td>\n  ' + amp + '\n  %%=v(@a)=%%\n</td>'),
    '<td>' + amp + '%%=v(@a)=%%</td>',
  );
  assert.equal(
    minify('<td\n  data-x="%%=v(@a)=%%"\n  title="a\n  b"\n>x</td>'),
    '<td data-x="%%=v(@a)=%%" title="a\n  b">x</td>',
  );
  assert.equal(minify('<td>\n<!-- keep\n   this -->\n</td>'), '<td><!-- keep\n   this --></td>');
  const raw = '<style>\n  a { color: red }\n</style>\n<pre>\n  keep\n</pre>';
  assert.equal(minify(raw), '<style>\n  a { color: red }\n</style><pre>\n  keep\n</pre>');
});

test('minifies Outlook conditional content and keeps revealed comments', () => {
  assert.equal(
    minify(
      '<!--[if mso]>\n  <table>\n    <tr><td>\n<![endif]-->\n<div>\n  a\n</div>\n<!--[if !mso]><!-->\n <span>q</span>\n<!--<![endif]-->',
    ),
    '<!--[if mso]><table><tr><td><![endif]--><div>a</div><!--[if !mso]><!--><span>q</span><!--<![endif]-->',
  );
});

test('does not fail on text that only looks like markup', () => {
  assert.equal(minify('<p>1 < 2\n and 3</p>'), '<p>1 < 2 and 3</p>');
  assert.equal(minify('<td>\n  open %%[ unterminated'), '<td>open %%[ unterminated');
  assert.equal(minify('<td>\n  <a href="x'), '<td><a href="x');
  assert.equal(minify(''), '');
});

const words = (html) => html.replace(/[ \t\r\n\f]+/g, ' ').replace(/ ?([<>]) ?/g, '$1');
// AMPscript and plain comments must be byte-identical; conditional comments are minified inside.
const opaque = /%%[\s\S]*?%%|<!--\[if[^\]]*\]><!-->|<!--(?!\[if)[\s\S]*?-->/g;

test('exported definitions carry the project minify setting', async () => {
  const { BlockExport: E } = await environment();
  const module = {
    id: 'a',
    name: 'A',
    slug: 'a',
    release: '1.0.0',
    source: '<p>x</p>',
    fields: [],
  };
  assert.equal('minifyOutput' in E.definition(E.themedModule({ settings: {} }, module)), false);
  assert.equal(
    E.definition(E.themedModule({ settings: { minifyOutput: true } }, module)).minifyOutput,
    true,
  );
});

for (const template of ['newsletter', 'congress']) {
  test(
    'ESC ' + template + ' output differs from the authored output only in whitespace',
    async () => {
      const { BlockCore: C, dom } = await environment();
      const project = JSON.parse(
        fs.readFileSync(path.join(root, 'projects/esc/' + template + '.jarrang.json'), 'utf8'),
      );
      assert.equal(project.settings.minifyOutput, true);
      let before = 0,
        after = 0;
      try {
        for (const module of project.modules) {
          const variants = [{}];
          const text = module.fields.filter((f) => f.type === 'text' && f.targets.length);
          if (text.length)
            variants.push(Object.fromEntries(text.map((f) => [f.id, 'Changed <&> value'])));
          for (const values of variants) {
            const full = C.render(module, values);
            const small = C.render({ ...module, minifyOutput: true }, values);
            const label = module.name + ' ' + JSON.stringify(values).slice(0, 40);
            assert.deepEqual(
              small.match(opaque) || [],
              full.match(opaque) || [],
              label + ': opaque',
            );
            assert.equal(words(small), words(full.trim()), label + ': content');
            assert.doesNotMatch(small.replace(opaque, ''), /[\n\t]/, label + ': whitespace left');
            before += full.length;
            after += small.length;
          }
        }
      } finally {
        await dom.happyDOM.close();
      }
      assert.ok(after < before);
    },
  );
}
