// DOM/event simulation with supplied geometry, not a browser layout or screen-reader test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

async function setup({ app = false, fresh = false } = {}) {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  const d = dom.document;
  d.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  const frames = new Map(),
    bounds = new Map();
  let sequence = 0;
  const context = vm.createContext({
    window: {
      addEventListener: dom.addEventListener.bind(dom),
      removeEventListener: dom.removeEventListener.bind(dom),
      getComputedStyle: dom.getComputedStyle.bind(dom),
      innerWidth: 1200,
      innerHeight: 800,
    },
    document: d,
    DOMParser: dom.DOMParser,
    NodeFilter: dom.NodeFilter,
    URL,
    Blob,
    Uint8Array,
    btoa,
    JSZip: require('../vendor/jszip.min.js'),
    localStorage: dom.localStorage,
    crypto: require('node:crypto').webcrypto,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame: (fn) => {
      frames.set(++sequence, fn);
      return sequence;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    getComputedStyle: dom.getComputedStyle.bind(dom),
  });
  if (app) {
    const C = require('../src/core.js'),
      source = '<p style="padding:20px">Hello</p>';
    dom.localStorage.setItem(
      'jarrang-block-studio-v1',
      JSON.stringify({
        format: 'jarrang-block-studio',
        version: 1,
        settings: {},
        modules: [
          {
            id: 'hero',
            name: 'Hero',
            slug: 'hero',
            release: '1.0.0',
            source: fresh ? '' : source,
            draftSource: source,
            analysed: !fresh,
            fields: fresh ? [] : C.infer(source).fields,
          },
        ],
      }),
    );
  }
  const scripts = app
    ? [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map((m) => m[1])
    : ['src/tour.js'];
  for (const file of scripts)
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  const $ = (id) => d.getElementById(id);
  const rectangle = (left, top, width, height) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
  for (const id of [
    'connect-repository',
    'browse-projects',
    'new-module',
    'module-list',
    'save-repository',
    'task-fields',
    'task-test',
    'task-export',
    'analyse',
  ]) {
    const el = $(id);
    bounds.set(id, rectangle(50, 60, 150, 36));
    el.getBoundingClientRect = () => bounds.get(id);
    el.scrollIntoView = () => {};
  }
  $('tour-card').getBoundingClientRect = () =>
    rectangle(
      0,
      0,
      Math.min(380, context.window.innerWidth - 24),
      Math.min(360, context.window.innerHeight - 24),
    );
  const flush = () => {
    const queue = [...frames.values()];
    frames.clear();
    queue.forEach((fn) => fn());
  };
  return { dom, d, $, context, bounds, rectangle, frames, flush };
}

test('tour only starts on request, completes both routes and restarts at the chooser', async () => {
  const { dom, $, d } = await setup();
  try {
    assert.equal($('studio-tour').open, false);
    for (const [route, count] of [
      ['create', 8],
      ['maintain', 5],
    ]) {
      $('start-tour').click();
      assert.equal($('studio-tour').open, true);
      assert.equal($('tour-choices').hidden, false);
      assert.equal(d.activeElement, $('tour-title'));
      $('tour-' + route).click();
      for (let i = 1; i <= count; i++) {
        assert.equal($('tour-progress').textContent, `Step ${i} of ${count}`);
        assert.ok($('tour-description').textContent.length);
        assert.equal($('tour-next').textContent, i === count ? 'Finish' : 'Next');
        $('tour-next').click();
      }
      assert.equal($('studio-tour').open, false);
      assert.equal(d.activeElement, $('start-tour'));
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('Back revisits steps or changes route; Exit and native-dialog close return focus', async () => {
  const { dom, $, d } = await setup();
  try {
    $('start-tour').click();
    $('tour-create').click();
    $('tour-next').click();
    $('tour-back').click();
    assert.equal($('tour-progress').textContent, 'Step 1 of 8');
    $('tour-back').click();
    assert.equal($('tour-choices').hidden, false);
    $('tour-maintain').click();
    assert.equal($('tour-progress').textContent, 'Step 1 of 5');
    $('tour-exit').click();
    assert.equal($('studio-tour').open, false);
    assert.equal(d.activeElement, $('start-tour'));
    $('start-tour').click();
    // Native Escape closes the dialog; invoke that close path without emulating a browser keyboard.
    $('studio-tour').close();
    assert.equal(d.activeElement, $('start-tour'));
    assert.equal($('studio-tour').getAttribute('aria-labelledby'), 'tour-title');
    assert.equal($('tour-title').getAttribute('tabindex'), '-1');
  } finally {
    await dom.happyDOM.close();
  }
});

test('tour handles hidden targets, narrow viewports and scroll restoration without stale callbacks', async () => {
  const { dom, $, context, bounds, rectangle, frames, flush } = await setup();
  try {
    const bar = $('connect-repository').parentElement;
    bar.scrollTop = 18;
    bar.scrollLeft = 9;
    $('connect-repository').scrollIntoView = () => {
      bar.scrollTop = 70;
      bar.scrollLeft = 30;
    };
    $('start-tour').click();
    $('tour-create').click();
    assert.equal($('tour-spotlight').dataset.target, 'true');
    assert.equal(bar.scrollTop, 70);
    context.window.innerWidth = 320;
    context.window.innerHeight = 480;
    bounds.set('connect-repository', rectangle(225, 380, 85, 30));
    dom.dispatchEvent(new dom.Event('resize'));
    flush();
    const card = $('tour-card'),
      r = card.getBoundingClientRect();
    assert.ok(parseFloat(card.style.left) >= 12);
    assert.ok(parseFloat(card.style.left) + r.width <= 308);
    assert.ok(parseFloat(card.style.top) + r.height <= 468);
    $('browse-projects').hidden = true;
    $('tour-next').click();
    assert.equal($('tour-spotlight').dataset.target, 'false');
    assert.equal($('tour-location').textContent, 'Clients & templates → New template');
    dom.dispatchEvent(new dom.Event('resize'));
    assert.equal(frames.size, 1);
    $('tour-back').click();
    $('tour-exit').click();
    assert.equal(frames.size, 0);
    assert.equal(bar.scrollTop, 18);
    assert.equal(bar.scrollLeft, 9);
    dom.dispatchEvent(new dom.Event('resize'));
    assert.equal(frames.size, 0);
  } finally {
    await dom.happyDOM.close();
  }
});

test('tour cannot open over another modal or a busy application surface', async () => {
  const { dom, $ } = await setup();
  try {
    $('projects-dialog').showModal();
    $('start-tour').click();
    assert.equal($('studio-tour').open, false);
    $('projects-dialog').close();
    $('start-tour').parentElement.inert = true;
    $('start-tour').click();
    assert.equal($('studio-tour').open, false);
  } finally {
    await dom.happyDOM.close();
  }
});

test('complete tour preserves pending HTML, selection, preview document and saved drafts', async () => {
  const { dom, $, context } = await setup({ app: true });
  try {
    const W = context.window.BlockWorkspace;
    $('quick-edit-html').click();
    const code = $('quick-code-source');
    code.value = code.value.replace('20px', '24px');
    code.dispatchEvent(new dom.Event('input'));
    code.setSelectionRange(8, 18);
    const source = code.value,
      project = JSON.stringify(context.window.BlockStudio.getProject()),
      storage = dom.localStorage.getItem(W.KEY),
      preview = $('mapping-preview').srcdoc;
    $('start-tour').click();
    $('tour-maintain').click();
    for (let i = 0; i < 5; i++) $('tour-next').click();
    assert.equal(JSON.stringify(context.window.BlockStudio.getProject()), project);
    assert.equal(dom.localStorage.getItem(W.KEY), storage);
    assert.equal(code.value, source);
    assert.equal(code.selectionStart, 8);
    assert.equal(code.selectionEnd, 18);
    assert.equal($('mapping-preview').srcdoc, preview);
    assert.equal($('quick-edit-html').getAttribute('aria-current'), 'page');
    assert.equal($('quick-code-save').disabled, false);
  } finally {
    await dom.happyDOM.close();
  }
});

test('new-module tour never analyses source, adds fields or advances setup', async () => {
  const { dom, $, context } = await setup({ app: true, fresh: true });
  try {
    const before = JSON.stringify(context.window.BlockStudio.getProject());
    assert.equal($('studio-tour').open, false);
    $('start-tour').click();
    $('tour-create').click();
    for (let i = 0; i < 8; i++) $('tour-next').click();
    assert.equal(JSON.stringify(context.window.BlockStudio.getProject()), before);
    assert.equal($('step-import').hidden, false);
    assert.equal($('module-task-navigation').hidden, true);
    assert.equal($('studio-tour').open, false);
  } finally {
    await dom.happyDOM.close();
  }
});

test('tour preserves temporary test values and the current preview without remounting controls', async () => {
  const { dom, $, context } = await setup({ app: true });
  try {
    $('task-test').click();
    const input = $('trial-fields').querySelector('input, textarea');
    assert.ok(input);
    input.value = 'Temporary client copy';
    input.dispatchEvent(new dom.Event('input'));
    const project = JSON.stringify(context.window.BlockStudio.getProject());
    const preview = $('mapping-preview').srcdoc;
    $('start-tour').click();
    $('tour-create').click();
    for (let i = 0; i < 8; i++) $('tour-next').click();
    assert.equal($('trial-fields').querySelector('input, textarea'), input);
    assert.equal(input.value, 'Temporary client copy');
    assert.equal($('mapping-preview').srcdoc, preview);
    assert.equal($('task-test').getAttribute('aria-current'), 'page');
    assert.equal(JSON.stringify(context.window.BlockStudio.getProject()), project);
  } finally {
    await dom.happyDOM.close();
  }
});
