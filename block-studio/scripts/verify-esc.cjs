/* Compare real exports with an independently supplied repository ZIP.
 * Usage: node block-studio/scripts/verify-esc.cjs original.zip results-directory
 * Uses DOM simulation. It does not certify browser, SFMC or email-client rendering.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const JSZip = require('../vendor/jszip.min.js');
const root = path.resolve(__dirname, '..');
const clone = (v) => JSON.parse(JSON.stringify(v));
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
const definition = (page) =>
  JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);

async function environment(page = '') {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  if (page) dom.document.write(page);
  const window = { getSelection: dom.getSelection.bind(dom), addEventListener() {} };
  window.parent = window;
  const context = vm.createContext({
    window,
    document: dom.document,
    DOMParser: dom.DOMParser,
    NodeFilter: dom.NodeFilter,
    CustomEvent: dom.CustomEvent,
    URL,
    JSZip,
    Uint8Array,
    btoa,
    crypto: crypto.webcrypto,
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
  });
  return { dom, window, run: (code) => vm.runInContext(code, context) };
}
function fileEntries(zip, prefix = '') {
  return Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => ({
      webkitRelativePath: prefix + f.name,
      size: f._data.uncompressedSize,
      text: () => f.async('string'),
      arrayBuffer: () => f.async('arraybuffer'),
    }));
}
function samples(field) {
  switch (field.type) {
    case 'toggle':
      return ['shown', 'hidden'];
    case 'select':
      return field.options.map((o) => o.value);
    case 'text':
      return [field.maxLength && field.maxLength < 24 ? 'QA' : 'QA & <tag> "é"\nNext'];
    case 'richtext':
      return [
        '<strong>Bold</strong> <em>Italic</em> <u>Underline</u>',
        'H<sub>2</sub>O x<sup>2</sup>',
        '<span style="color:#123456">Colour</span>',
        '<a href="https://example.com/qa?a=1&amp;b=2">Link</a>',
        '<ul style="list-style-type:square"><li>One</li><li>Two</li></ul>',
        '<ol style="list-style-type:upper-roman"><li>One</li><li>Two</li></ol>',
        '<p>Before</p><ul><li>Item</li></ul><p>After</p>',
      ];
    case 'url':
      return ['https://example.com/qa?a=1&b=2'];
    case 'image':
      return ['https://example.com/qa.png'];
    case 'colour':
      return ['#123456'];
    case 'number':
      return ['2'];
    default:
      throw Error('Unhandled sample type: ' + field.type);
  }
}
async function main() {
  const [baselinePath, outputPath] = process.argv.slice(2);
  assert.ok(
    baselinePath && outputPath,
    'Supply the original repository ZIP and a results directory.',
  );
  const originalBytes = fs.readFileSync(baselinePath);
  const original = await JSZip.loadAsync(originalBytes);
  const projectFiles = Object.keys(original.files).filter((n) =>
    /\/projects\/esc\/(newsletter|congress)\.jarrang\.json$/.test(n),
  );
  assert.equal(projectFiles.length, 2, 'Expected the supplied Newsletter and Congress projects.');
  const prefix = projectFiles[0].split('projects/esc/')[0];
  fs.mkdirSync(outputPath, { recursive: true });
  const report = {
    studioVersion: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version,
    baselineSHA256: hash(originalBytes),
    method:
      'Original repository import; full-template ZIP export; exported runtime execution in happy-dom; exact HTML comparison with original exported runtime.',
    limitations: [
      'No live browser layout/painting',
      'No live SFMC messaging or saved-instance test',
      'AMPscript preserved, not executed',
      'No email-client rendering test',
    ],
    modules: [],
    failures: [],
  };
  const author = await environment();
  try {
    for (const name of [
      'logic',
      'runtime-core',
      'html-validation',
      'core',
      'maintenance',
      'workspace',
      'block-icons',
      'export-assets',
      'exporter',
      'rich-editor',
      'controls',
      'field-catalog',
      'template-rules',
      'field-transforms',
      'field-editor',
    ])
      author.run(fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8'));
    const {
      BlockMaintenance: M,
      BlockWorkspace: W,
      BlockExport: E,
      BlockHTMLValidation: H,
    } = author.window;
    const imported = await M.readRepository(fileEntries(original), W);
    assert.equal(imported.length, 2);
    for (const project of imported) {
      const template = project.settings.templateSlug;
      const bytes = Buffer.from(
        await (
          await E.build(project, project.modules, { ...project.settings, fullTemplate: true })
        ).arrayBuffer(),
      );
      const exported = await JSZip.loadAsync(bytes);
      fs.writeFileSync(path.join(outputPath, 'ESC-' + template + '-roundtrip.zip'), bytes);
      const reopened = await M.readRepository(fileEntries(exported, 'repository/'), W);
      assert.equal(reopened.length, 1);
      assert.equal(reopened[0].modules.length, project.modules.length);
      for (const module of project.modules) {
        const folder = 'docs/clients/esc/' + template + '/modules/' + module.slug + '/';
        const beforePage = await original.file(prefix + folder + 'index.html').async('string');
        const afterPage = await exported.file(folder + 'index.html').async('string');
        const beforeDef = definition(beforePage),
          afterDef = definition(afterPage);
        assert.deepEqual(
          afterDef,
          beforeDef,
          template + '/' + module.slug + ': definition changed',
        );
        assert.deepEqual(
          clone(E.definition(reopened[0].modules.find((m) => m.id === module.id))),
          beforeDef,
        );
        let maintained = clone(module);
        for (const id of module.fields.map((f) => f.id)) {
          let saved;
          author.window.BlockFieldEditor.open(
            maintained,
            maintained.fields.find((f) => f.id === id),
            (field, result) => {
              saved = result?.draft || {
                ...maintained,
                fields: maintained.fields.map((f) => (f.id === field.id ? field : f)),
              };
            },
          );
          const dialog = author.dom.document.querySelector('dialog');
          for (const text of ['Where it applies', 'Advanced', 'Save field']) {
            const button = [...dialog.querySelectorAll('button')].find(
              (b) => b.textContent === text,
            );
            assert.ok(button, 'Missing field editor action: ' + text);
            button.click();
          }
          assert.ok(
            saved,
            module.slug +
              ': field save failed: ' +
              dialog.querySelector('[role=alert]').textContent,
          );
          maintained = saved;
          dialog.remove();
        }
        assert.deepEqual(
          clone(E.problems(maintained)),
          [],
          'Maintained module must remain exportable',
        );
        for (const name of ['icon.png', 'dragIcon.png'])
          assert.deepEqual(
            await exported.file(folder + name).async('nodebuffer'),
            await original.file(prefix + folder + name).async('nodebuffer'),
          );
        for (const ref of afterPage.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g))
          assert.ok(
            exported.file(path.posix.normalize(folder + ref[1])),
            'Missing exported asset: ' + ref[1],
          );
        const runtimeRef = (page) =>
          page.match(/<script src="([^"]+runtime(?:\.rich)?\.bundle\.js)"/)[1];
        const before = await environment(beforePage),
          after = await environment(afterPage);
        const result = {
          template,
          slug: module.slug,
          definitionIdentical: true,
          iconsIdentical: true,
          cases: 0,
          editedCases: 0,
          conditionalCombinations: 0,
          structureChecks: 0,
          fieldEditorSaves: module.fields.length,
          fieldTypes: [
            ...new Set(
              module.fields.flatMap((f) => [f.type, ...(f.itemFields || []).map((c) => c.type)]),
            ),
          ],
          originalSourceSHA256: hash(beforeDef.source),
          runtimeChanged: runtimeRef(beforePage) !== runtimeRef(afterPage),
        };
        try {
          before.run(
            await original
              .file(path.posix.normalize(prefix + folder + runtimeRef(beforePage)))
              .async('string'),
          );
          after.run(
            await exported
              .file(path.posix.normalize(folder + runtimeRef(afterPage)))
              .async('string'),
          );
          for (const env of [before, after]) {
            assert.notEqual(env.dom.document.getElementById('status').className, 'status error');
            for (const field of module.fields.filter((f) => f.enabled))
              assert.ok(
                env.dom.document.getElementById(field.id),
                module.slug + ': unmounted ' + field.id,
              );
          }
          const originalCore = before.window.BlockCore,
            currentCore = after.window.BlockCore;
          const checkedHTML = new Set();
          function check(label, values, edited = false) {
            try {
              const expected = originalCore.render(beforeDef, clone(values), {
                blockId: 'bs_roundtrip',
              });
              const actual = currentCore.render(afterDef, clone(values), {
                blockId: 'bs_roundtrip',
              });
              assert.equal(actual, expected, 'Email HTML differs from supplied runtime');
              assert.equal(
                currentCore.render(E.definition(maintained), clone(values), {
                  blockId: 'bs_roundtrip',
                }),
                expected,
                'Opening/saving field settings changed the email HTML',
              );
              assert.ok(!/{[{%]/.test(actual), 'Unresolved template syntax');
              if (!checkedHTML.has(actual)) {
                assert.deepEqual(clone(H.check(actual)), [], 'Rendered tag structure');
                checkedHTML.add(actual);
                result.structureChecks++;
              }
              result.cases++;
              if (edited) result.editedCases++;
            } catch (e) {
              report.failures.push({
                template,
                module: module.slug,
                scenario: label,
                message: e.message.slice(0, 600),
                values,
              });
            }
          }
          check('defaults', {});
          const controls = module.fields.filter((f) => ['select', 'toggle'].includes(f.type));
          function combinations(i, values) {
            if (i === controls.length) {
              if (i) {
                check('conditional combination', values);
                result.conditionalCombinations++;
              }
              return;
            }
            const field = controls[i];
            for (const value of samples(field))
              combinations(i + 1, { ...values, [field.id]: value });
          }
          combinations(0, {});
          for (const field of module.fields) {
            if (field.type === 'list') {
              const item = Object.fromEntries(field.itemFields.map((c) => [c.key, c.defaultValue]));
              for (let length = field.minItems ?? 0; length <= (field.maxItems ?? 50); length++) {
                const rows = Array.from({ length }, (_, i) =>
                  clone(field.defaultValue[i % field.defaultValue.length] || item),
                );
                check(field.key + ': ' + length + ' items', { [field.id]: rows });
              }
              for (const child of field.itemFields)
                for (const value of samples(child)) {
                  assert.equal(
                    currentCore.validate(child, value),
                    '',
                    child.label + ': invalid test data',
                  );
                  const rows = Array.from({ length: Math.max(1, field.minItems || 0) }, () => ({
                    ...clone(item),
                    [child.key]: value,
                  }));
                  check(field.key + '.' + child.key + ': edited value', { [field.id]: rows }, true);
                }
            } else {
              for (const value of samples(field)) {
                assert.equal(
                  currentCore.validate(field, value),
                  '',
                  field.label + ': invalid test data',
                );
                check(field.key || field.id, { [field.id]: value }, true);
              }
            }
          }
          const originalSource = JSON.stringify(beforeDef);
          assert.equal(
            JSON.stringify(afterDef),
            originalSource,
            'Rendering mutated the definition',
          );
          report.modules.push(result);
          console.log(template + '/' + module.slug + ': ' + result.cases + ' matched cases');
        } finally {
          await before.dom.happyDOM.close();
          await after.dom.happyDOM.close();
        }
      }
    }
  } finally {
    await author.dom.happyDOM.close();
    report.totals = {
      modules: report.modules.length,
      cases: report.modules.reduce((n, m) => n + m.cases, 0),
      conditionalCombinations: report.modules.reduce((n, m) => n + m.conditionalCombinations, 0),
      editedCases: report.modules.reduce((n, m) => n + m.editedCases, 0),
      fieldEditorSaves: report.modules.reduce((n, m) => n + m.fieldEditorSaves, 0),
      uniqueStructureChecks: report.modules.reduce((n, m) => n + m.structureChecks, 0),
      failures: report.failures.length,
    };
    fs.writeFileSync(
      path.join(outputPath, 'ESC-verification-results.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(JSON.stringify(report.totals));
  }
  assert.equal(report.failures.length, 0, 'See ESC-verification-results.json for failures');
  assert.equal(report.modules.length, 40);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
