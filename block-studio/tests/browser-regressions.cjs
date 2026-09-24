/* Current browser checks, separate from DOM simulations. Requires Playwright. */
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
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
