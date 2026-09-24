/* Dependency-free checks. Browser and live SFMC checks are separate. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const name of fs
  .readdirSync(path.join(root, 'src'))
  .filter((name) => name.endsWith('.js'))
  .sort()) {
  run(['--check', path.join('src', name)]);
}
const browserSuites = new Set([
  'browser.test.cjs',
  'field-ux.test.cjs',
  'logic-browser.test.cjs',
  'richtext-browser.test.cjs',
]);
const suites = fs
  .readdirSync(path.join(root, 'tests'))
  .filter((name) => name.endsWith('.test.cjs') && !browserSuites.has(name))
  .sort()
  .map((name) => path.join('tests', name));
run(['--test', ...suites]);
