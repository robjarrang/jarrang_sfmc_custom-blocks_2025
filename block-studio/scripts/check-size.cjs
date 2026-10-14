/* Project-specific raw-byte budgets. Increase deliberately after reviewing the added payload. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/export-assets.js'), 'utf8'), context);
const assets = context.window.EXPORT_ASSETS;
const limits = {
  // Optional Title/Alias controls add about 5 KB shared with conversion settings; no new requests or dependencies.
  'runtime.bundle.js': 72000,
  'runtime.rich.bundle.js': 94000,
  'runtime.bundle.css': 11000,
};
let failed = false;
for (const [name, limit] of Object.entries(limits)) {
  const size = Buffer.byteLength(assets[name]);
  console.log(`${name}: ${size.toLocaleString('en-GB')} / ${limit.toLocaleString('en-GB')} bytes`);
  if (size > limit) failed = true;
}
const standalone = fs.statSync(path.join(root, 'Open-Block-Studio.html')).size;
console.log(
  `Standalone Studio (includes offline templates/assets): ${standalone.toLocaleString('en-GB')} bytes`,
);
// Studio's offline client data varies with the repository; do not apply the SFMC runtime budget to it.
if (failed) {
  console.error('Runtime payload budget exceeded. Review the change before updating a limit.');
  process.exitCode = 1;
}
