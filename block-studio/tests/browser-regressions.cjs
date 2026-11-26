/* Current browser checks, separate from DOM simulations. Requires Playwright. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function checkRichTextEnter(page) {
  for (const file of ['logic', 'runtime-core', 'rich-editor'])
    await page.addScriptTag({ path: path.resolve(__dirname, '../src', file + '.js') });
  const editor = page.getByRole('textbox', { name: 'Body' });
  const saved = () => page.locator('body').getAttribute('data-saved');
  const start = (html, selector, offset) =>
    page.evaluate(
      ({ html, selector, offset }) => {
        const field = document.createElement('div');
        document.body.replaceChildren(field);
        const input = window.BlockRichText.mount(field, { label: 'Body' }, html, (value) => {
          document.body.dataset.saved = value;
        });
        field.append(input);
        input.focus();
        const selection = window.getSelection();
        selection.collapse((selector ? input.querySelector(selector) : input).firstChild, offset);
      },
      { html, selector, offset },
    );

  await start('Firstsecond', '', 5);
  await editor.press('Enter');
  assert.equal(await saved(), 'First<br>second');
  await page.keyboard.insertText('new ');
  assert.equal(await saved(), 'First<br>new second');

  await start('<b>Firstsecond</b>', 'b', 5);
  await editor.press('Enter');
  assert.equal(await saved(), '<b>First<br>second</b>');

  await start('First', '', 5);
  await editor.press('Enter');
  await page.keyboard.insertText('second');
  assert.equal(await saved(), 'First<br>second');

  await start('<ul><li>Firstsecond</li></ul>', 'li', 5);
  await editor.press('Enter');
  assert.equal(await saved(), '<ul><li>First</li><li>second</li></ul>');
  console.log(
    'PASS: Enter splits rich text, preserves the caret and formatting, and splits list items',
  );
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await checkRichTextEnter(page);
    if (process.argv.includes('--rich-text-only')) {
      assert.deepEqual(errors, []);
      return;
    }
    await page.goto(pathToFileURL(path.resolve(__dirname, '../Open-Block-Studio.html')).href);
    await page.locator('#source-html').fill('<h1>Heading</h1><p>Body text</p>');
    await page.locator('#analyse').click();
    const frame = page.frameLocator('#mapping-preview');
    await frame.locator('h1').waitFor();
    await frame.locator('body').evaluate((n) => (n.dataset.documentIdentity = 'preserved'));
    await frame.locator('p').click();
    await frame.locator('p[data-studio-selected]').waitFor();
    await page.locator('#step-map .viewport[data-width="375"]').click();
    await page.locator('#show-map-source').click();
    await page.locator('#step-map .viewport[data-width="desktop"]').click();
    assert.equal(await frame.locator('body').getAttribute('data-document-identity'), 'preserved');
    const buttons = page.locator('.field-select');
    await buttons.first().click();
    assert.equal(await buttons.first().evaluate((n) => n === document.activeElement), true);
    await page.locator('.field-drag-handle').last().focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await frame.locator('body').getAttribute('data-document-identity'), 'preserved');
    await page.locator('#task-test').click();
    await page.locator('#test-fields-panel').waitFor({ state: 'visible' });
    const testInput = page.locator('#trial-fields textarea').first();
    await testInput.fill('Temporary test heading');
    await frame.getByText('Temporary test heading', { exact: true }).waitFor();
    await page.locator('#task-fields').click();
    await page.locator('#task-test').click();
    assert.equal(await testInput.inputValue(), 'Temporary test heading');
    assert.equal(await frame.locator('body').getAttribute('data-document-identity'), 'preserved');
    await page.locator('#task-fields').click();
    await page.locator('#show-map-source').click();
    const span = page
        .locator('#mapping-source .code-paint-content > span')
        .filter({ hasText: /^<h1/ })
        .first(),
      box = await span.boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x + 8, box.y + box.height / 2);
    const caret = await page
      .locator('#mapping-source .code-input')
      .evaluate((n) => n.selectionStart);
    assert.ok(caret >= 0 && caret < 4, 'Click must land inside the visible opening tag');
    assert.ok((await page.locator('#mapping-source .code-pair').count()) >= 2);
    assert.deepEqual(errors, []);
    console.log(
      'PASS: live preview identity, selection, resizing, focus, reordering and code hit testing',
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
