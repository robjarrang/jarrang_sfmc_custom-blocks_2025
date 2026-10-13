// CSS cascade regressions. happy-dom does not perform browser layout or painting.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

async function studio(width, height = 780) {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    width,
    height,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
    },
  });
  dom.document.write(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  // Use the real stylesheet order, including the generated brand overrides.
  for (const link of [...dom.document.querySelectorAll('link[rel=stylesheet]')]) {
    const style = dom.document.createElement('style');
    style.textContent = fs.readFileSync(path.join(root, link.getAttribute('href')), 'utf8');
    link.replaceWith(style);
  }
  return dom;
}

test('radio controls stay compact through the complete Studio CSS cascade', async () => {
  for (const width of [320, 552, 1024]) {
    const dom = await studio(width);
    try {
      const dialog = dom.document.createElement('dialog');
      dialog.className = 'field-dialog ux-field-dialog';
      dialog.innerHTML = `<fieldset class="item-behaviour">
        <legend>Content behaviour</legend>
        <label class="item-mode-option"><input type="radio" name="mode"><span><strong>Single item</strong><small>One item with editable fields.</small></span></label>
        <label class="item-mode-option"><input type="radio" name="mode" checked><span><strong>Repeating items</strong><small>Clients can add, remove and reorder items.</small></span></label>
      </fieldset><div class="choice-row"><input type="radio"><input type="text" value="A choice"></div>
      <input type="checkbox"><input type="checkbox" class="toggle-switch">`;
      dom.document.body.append(dialog);
      dialog.showModal();
      for (const radio of dialog.querySelectorAll('input[type=radio]')) {
        const css = dom.getComputedStyle(radio);
        assert.equal(css.width, '17px', 'radio must not inherit full-width input styling');
        assert.equal(css.height, '17px');
        assert.equal(css.padding, '0px', 'choice-row text padding must not enlarge radios');
      }
      const options = [...dialog.querySelectorAll('.item-mode-option')];
      assert.equal(dom.getComputedStyle(options[0]).gridTemplateColumns, '17px minmax(0, 1fr)');
      assert.notEqual(
        dom.getComputedStyle(options[0]).borderColor,
        dom.getComputedStyle(options[1]).borderColor,
      );
      assert.equal(dom.getComputedStyle(dialog.querySelector('.toggle-switch')).width, '40px');
      assert.equal(dom.getComputedStyle(dialog.querySelector('input[type=text]')).width, '100%');
    } finally {
      await dom.happyDOM.close();
    }
  }
});

test('template colour sample does not inherit the exported editor full-screen height', async () => {
  const dom = await studio(552);
  try {
    dom.document.querySelector('#template-dialog').showModal();
    assert.equal(
      Number.parseFloat(
        dom.getComputedStyle(dom.document.querySelector('#theme-sample')).minHeight,
      ),
      0,
    );
    const actualEditor = dom.document.createElement('div');
    actualEditor.className = 'editor';
    dom.document.body.append(actualEditor);
    assert.equal(dom.getComputedStyle(actualEditor).minHeight, '780px');
  } finally {
    await dom.happyDOM.close();
  }
});

test('narrow Studio keeps module creation available and hidden panels hidden', async () => {
  const dom = await studio(375);
  try {
    assert.notEqual(
      dom.getComputedStyle(dom.document.querySelector('.new-module')).display,
      'none',
    );
    for (const id of ['code-view-context', 'inline-code-actions', 'mapping-source']) {
      const panel = dom.document.getElementById(id);
      assert.equal(panel.hidden, true);
      assert.equal(dom.getComputedStyle(panel).display, 'none');
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('a long module sidebar cannot vertically centre the workspace', async () => {
  for (const width of [375, 1024, 2048]) {
    const dom = await studio(width);
    try {
      const list = dom.document.querySelector('#module-list');
      for (let i = 0; i < 40; i++) {
        const row = dom.document.createElement('button');
        row.className = 'module-button';
        row.textContent = 'Module ' + (i + 1);
        list.append(row);
      }
      const css = dom.getComputedStyle(dom.document.querySelector('main'));
      assert.equal(css.marginTop, '0px');
      assert.equal(css.marginBottom, '0px');
      assert.equal(css.marginLeft, 'auto');
      assert.equal(css.marginRight, 'auto');
      assert.equal(css.alignSelf, width > 900 ? 'stretch' : 'start');
    } finally {
      await dom.happyDOM.close();
    }
  }
});

test('standalone and hosted builds contain the radio layout and workspace alignment fixes', async () => {
  const standalone = fs.readFileSync(path.join(root, 'Open-Block-Studio.html'), 'utf8');
  assert.equal(standalone, fs.readFileSync(path.join(root, '../docs/studio/index.html'), 'utf8'));
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  try {
    dom.document.write(standalone);
    const main = dom.getComputedStyle(dom.document.querySelector('main'));
    assert.equal(main.marginTop, '0px');
    assert.equal(main.alignSelf, 'stretch');
    const fieldset = dom.document.createElement('fieldset');
    fieldset.className = 'item-behaviour';
    fieldset.innerHTML =
      '<label class="item-mode-option"><input type="radio" name="behaviour" checked><span><strong>Repeating items</strong><small>Clients can add, remove and reorder items.</small></span></label>';
    dom.document.body.append(fieldset);
    const option = dom.getComputedStyle(fieldset.querySelector('label'));
    const radio = dom.getComputedStyle(fieldset.querySelector('input'));
    assert.equal(option.display, 'grid');
    assert.equal(option.gridTemplateColumns, '17px minmax(0, 1fr)');
    assert.equal(radio.width, '17px');
    assert.equal(radio.height, '17px');
    assert.equal(radio.padding, '0px');
  } finally {
    await dom.happyDOM.close();
  }
});

test('button hover states retain contrasting text in the header and workspace', async () => {
  const dom = await studio(1280);
  try {
    // happy-dom has no pointer layout. Substitute an equally specific attribute
    // for :hover so the actual stylesheet cascade can still be exercised.
    for (const style of dom.document.querySelectorAll('style')) {
      style.textContent = style.textContent.replaceAll(':hover', '[data-test-hover]');
    }
    const cases = [
      ['#save-repository', '#080043', '#fff'],
      ['#browse-projects', 'white', '#28215e'],
      ['#upload-html', 'white', '#080043'],
    ];
    for (const [selector, colour, background] of cases) {
      const button = dom.document.querySelector(selector);
      button.setAttribute('data-test-hover', '');
      const css = dom.getComputedStyle(button);
      assert.equal(css.color, colour, selector + ' text');
      assert.equal(css.backgroundColor, background, selector + ' background');
    }
    for (const variant of ['primary', 'secondary', 'quiet', 'quiet danger']) {
      const button = dom.document.createElement('button');
      button.className = 'button ' + variant;
      button.textContent = variant;
      dom.document.querySelector('main').append(button);
      for (const hovered of [false, true]) {
        button.toggleAttribute('data-test-hover', hovered);
        const css = dom.getComputedStyle(button);
        assert.notEqual(css.color, css.backgroundColor, variant + ' must remain visible');
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('repository status and its action share baseline alignment without inherited bottom padding', async () => {
  for (const width of [375, 1024]) {
    const dom = await studio(width);
    try {
      const row = dom.getComputedStyle(dom.document.querySelector('.draft-status-bar'));
      const group = dom.getComputedStyle(dom.document.querySelector('.repository-status'));
      const button = dom.getComputedStyle(dom.document.querySelector('#connect-repository'));
      assert.equal(row.alignItems, 'baseline');
      assert.equal(group.display, 'flex');
      assert.equal(group.alignItems, 'baseline');
      assert.equal(group.flexWrap, 'wrap');
      assert.equal(button.paddingTop, button.paddingBottom);
      assert.equal(button.fontSize, row.fontSize);
    } finally {
      await dom.happyDOM.close();
    }
  }
});

test('desktop workspace bounds both lists, test controls and preview without fixed header offsets', async () => {
  for (const width of [1024, 1440]) {
    const dom = await studio(width);
    try {
      const doc = dom.document;
      doc.querySelector('#step-map').hidden = false;
      doc.querySelector('#test-fields-panel').hidden = false;
      doc.querySelector('#mapping-source').hidden = false;
      doc.querySelector('#mapping-source').innerHTML =
        '<div class="code-surface"><div class="code-tools"></div><div class="code-stage"></div></div>';
      const css = (selector) => dom.getComputedStyle(doc.querySelector(selector));
      assert.equal(css('body').overflow, 'hidden');
      for (const selector of [
        '.app-layout',
        'main',
        '#step-map',
        '.mapping-grid',
        '.workspace-controls',
        '.field-panel',
        '.preview-column',
        '.preview-panel',
        '#source-preview-layout',
        '.code-surface',
        '.code-stage',
      ])
        assert.equal(
          parseFloat(css(selector).minHeight),
          0,
          selector + ' must allow its content to shrink',
        );
      for (const selector of ['#module-list', '#field-list', '#trial-fields', '#mapping-canvas']) {
        assert.equal(css(selector).overflow, 'auto');
        assert.equal(parseFloat(css(selector).minHeight), 0);
        assert.equal(doc.querySelector(selector).tabIndex, 0);
        assert.equal(doc.querySelector(selector).getAttribute('role'), 'region');
      }
      assert.equal(css('#step-import').overflow, 'auto');
      assert.equal(css('#step-export').overflow, 'auto');
      assert.equal(css('#step-map').overflow, 'visible');
      assert.equal(css('.code-stage').height, 'auto');
      assert.equal(css('.compact-heading').flexShrink, '0');
      assert.equal(css('.preview-toolbar').flexShrink, '0');
      assert.equal(css('.advanced-tools-menu').position, 'absolute');
      assert.equal(css('.advanced-tools-menu').overflow, 'auto');
    } finally {
      await dom.happyDOM.close();
    }
  }
});

test('narrow and short windows release the fixed shell so content remains reachable at zoom', async () => {
  for (const [width, height] of [
    [320, 780],
    [800, 780],
    [1280, 600],
  ]) {
    const dom = await studio(width, height);
    try {
      const css = (selector) => dom.getComputedStyle(dom.document.querySelector(selector));
      assert.notEqual(css('body').overflow, 'hidden');
      assert.notEqual(css('#field-list').overflow, 'auto');
      if (width <= 900) {
        assert.equal(css('.app-layout').display, 'block');
        assert.equal(css('#module-list').overflow, 'auto');
        assert.equal(css('.sidebar-bottom').display, 'block');
      }
    } finally {
      await dom.happyDOM.close();
    }
  }
});

test('preview chrome stays compact and dependency notes start collapsed', async () => {
  const dom = await studio(1440);
  try {
    const doc = dom.document,
      css = (selector) => dom.getComputedStyle(doc.querySelector(selector));
    assert.equal(css('.topbar').height, '64px');
    const toolbar = doc.querySelector('.workspace-heading');
    assert.equal(doc.querySelector('#module-task-navigation').parentElement, toolbar);
    assert.equal(doc.querySelector('#setup-navigation').parentElement, toolbar);
    assert.equal(
      toolbar.children[1].id,
      'module-task-navigation',
      'DOM order follows title, tasks, then actions',
    );
    assert.equal(css('.workspace-heading').flexWrap, 'wrap');
    assert.equal(css('#module-title').fontSize, '22px');
    assert.equal(css('#module-task-navigation').marginBottom, '0px');
    assert.equal(css('.workspace-footer').display, 'none');
    assert.equal(css('#mapping-canvas').padding, '12px');
    assert.equal(
      css('#preview-size').overflow,
      'hidden',
      'unscaled iframe bounds must not create extra canvas scrollbars',
    );
    assert.equal(parseFloat(css('#mapping-preview').minHeight), 0);
    const notes = doc.querySelector('#mapping-warnings');
    notes.hidden = false;
    assert.equal(notes.tagName, 'DETAILS');
    assert.equal(notes.open, false);
    assert.ok(notes.querySelector('summary'));
    assert.equal(doc.querySelector('#preview-scale').value, 'fit');
  } finally {
    await dom.happyDOM.close();
  }
});
