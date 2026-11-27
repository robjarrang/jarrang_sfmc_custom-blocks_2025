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
  // Settings-only preview adds about 2.8 KB, output minification about 6 KB,
  // and checklist paste about 3 KB. Inline checklist links and legacy row migration
  // add about 2 KB, and automatic descriptions with saved visibility add about 1 KB.
  // Handling Enter in rich text adds about 0.5 KB without extra requests or dependencies.
  // Alignment and email-safe font sizes add about 3 KB to rendering and 5 KB to the rich editor.
  // Strikethrough, highlighting and list indentation add about 1 KB and 4 KB respectively.
  // Optional field disclosures add about 0.3 KB.
  // Moving saved single sponsors into a repeatable list adds about 0.8 KB.
  // Repeatable speaker rows and migration of saved speakers add about 0.9 KB.
  // Detecting email addresses and giving destination feedback adds about 1.6 KB.
  'runtime.bundle.js': 93500,
  'runtime.rich.bundle.js': 120600,
  'runtime.bundle.css': 11100,
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
