// DOM simulation for workspace navigation. It does not test visual layout.
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
const C = require('../src/core.js'),
  html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
class Element {
  constructor(doc) {
    this.ownerDocument = doc;
    this.parentNode = null;
    this.children = [];
    this.value = '';
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.open = false;
    this.listeners = {};
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.selectionDirection = 'none';
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  append(...children) {
    for (const child of children) {
      if (child.parentNode)
        child.parentNode.children = child.parentNode.children.filter((n) => n !== child);
      child.parentNode = this;
      this.children.push(child);
    }
  }
  prepend(...children) {
    for (const child of children.reverse()) {
      if (child.parentNode)
        child.parentNode.children = child.parentNode.children.filter((n) => n !== child);
      child.parentNode = this;
      this.children.unshift(child);
    }
  }
  insertBefore(child, before) {
    child.parentNode = this;
    this.children.splice(this.children.indexOf(before), 0, child);
  }
  replaceChildren(...children) {
    this.children = [];
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.append(...children);
  }
  setAttribute(name, value) {
    this[name] = value;
  }
  removeAttribute(name) {
    delete this[name];
  }
  addEventListener(name, fn) {
    (this.listeners[name] ||= []).push(fn);
  }
  fire(name, event = {}) {
    for (const fn of this.listeners[name] || []) fn(event);
  }
  querySelector(selector) {
    if (selector.startsWith('.')) {
      const queue = [...this.children];
      while (queue.length) {
        const n = queue.shift();
        if ((n.className || '').split(' ').includes(selector.slice(1))) return n;
        queue.push(...n.children);
      }
    }
    return new Element(this.ownerDocument);
  }
  querySelectorAll() {
    return [];
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
  select() {}
  setSelectionRange(a, b, d = 'none') {
    this.selectionStart = a;
    this.selectionEnd = b;
    this.selectionDirection = d;
  }
}
function setup(initial) {
  const listeners = {},
    downloads = [],
    frames = new Map(),
    timers = new Map();
  let timerId = 0;
  const nodes = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => [m[1], new Element()])),
    storage = new Map();
  if (initial) storage.set('jarrang-block-studio-v1', JSON.stringify(initial));
  const modes = ['desktop', '375'].map((width) => {
      const e = new Element();
      e.dataset.width = width;
      return e;
    }),
    steps = [0, 1, 2, 3].map((step) => {
      const e = new Element();
      e.dataset.step = String(step);
      return e;
    });
  const document = {
    getElementById: (id) => {
      assert.ok(nodes.has(id), 'Missing HTML element ' + id);
      return nodes.get(id);
    },
    createElement: (tag) => {
      const element = new Element(document);
      if (tag === 'canvas') {
        element.getContext = () => ({
          fillRect() {},
          strokeRect() {},
          fillText() {},
          save() {},
          restore() {},
          translate() {},
          scale() {},
          fill() {},
        });
        element.toDataURL = () => 'data:image/png;base64,aWNvbg==';
      }
      if (tag === 'a') element.click = () => downloads.push(element.download);
      return element;
    },
    querySelectorAll: (selector) =>
      selector === '.viewport' ? modes : ['.step', '[data-step]'].includes(selector) ? steps : [],
    querySelector: (selector) =>
      selector === 'dialog[open]'
        ? [...nodes.entries()].find(([id, node]) => id.endsWith('-dialog') && node.open)?.[1] ||
          null
        : new Element(),
  };
  document.createTextNode = (text) => {
    const element = new Element(document);
    element.textContent = text;
    return element;
  };
  const parent = new Element(document);
  for (const node of nodes.values()) {
    node.ownerDocument = document;
    parent.append(node);
  }
  const context = {
    window: {
      BlockCore: C,
      BlockLogic: require('../src/logic.js'),
      addEventListener: (name, fn) => {
        listeners[name] = fn;
      },
    },
    document,
    Path2D: class {
      constructor(path) {
        this.path = path;
      }
    },
    URL,
    Blob,
    requestAnimationFrame: (fn) => {
      frames.set(++timerId, fn);
      return timerId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    crypto: require('node:crypto').webcrypto,
    setTimeout: (fn) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearTimeout: (id) => timers.delete(id),
    localStorage: {
      getItem: (k) => storage.get(k),
      setItem: (k, v) => storage.set(k, v),
    },
  };
  vm.createContext(context);
  for (const name of [
    'controls.js',
    'rich-editor.js',
    'field-catalog.js',
    'template-rules.js',
    'field-transforms.js',
    'field-editor.js',
    'block-icons.js',
    'maintenance.js',
    'exporter.js',
    'workspace.js',
    'quick-edit.js',
    'code-editor.js',
    'preview.js',
    'repeat-builder.js',
    'history.js',
    'app.js',
  ])
    vm.runInContext(fs.readFileSync(__dirname + '/../src/' + name, 'utf8'), context);
  return {
    nodes,
    storage,
    frames,
    flushFrames(time = 16) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((fn) => fn(time));
    },
    flushTimers() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach((fn) => fn());
    },
    context,
    listeners,
    downloads,
    modes,
    steps,
    document,
  };
}
test('workspace boots against actual HTML IDs; create, switch, rename and repository settings persist separately', () => {
  const { nodes: n, storage, context } = setup(),
    W = context.window.BlockWorkspace;
  n.get('module-name').oninput({ target: { value: 'Original draft' } });
  n.get('browse-projects').onclick();
  assert.equal(n.get('projects-dialog').open, true);
  n.get('new-template').onclick();
  assert.equal(n.get('projects-dialog').open, false);
  n.get('template-client').value = 'Hertz';
  n.get('template-name').value = 'Commercial';
  n.get('template-form').onsubmit({ preventDefault() {} });
  assert.equal(n.get('active-client').textContent, 'Hertz');
  assert.equal(n.get('active-template').textContent, 'Commercial');
  let ws = JSON.parse(storage.get(W.KEY));
  assert.equal(ws.projects.length, 2);
  assert.equal(ws.projects[0].modules[0].name, 'Original draft');
  assert.equal(ws.projects[1].settings.templateSlug, 'commercial');
  n.get('module-name').oninput({ target: { value: 'Client hero' } });
  n.get('template-settings').onclick();
  n.get('template-name').value = 'Commercial 2027';
  n.get('template-form').onsubmit({ preventDefault() {} });
  ws = JSON.parse(storage.get(W.KEY));
  assert.equal(ws.projects[1].settings.templateSlug, 'commercial');
  assert.equal(ws.projects[1].modules[0].name, 'Client hero');
  n.get('repository-settings').onclick();
  n.get('repository-url').value = 'https://team.github.io/blocks/';
  n.get('repository-form').onsubmit({ preventDefault() {} });
  assert.equal(JSON.parse(storage.get(W.KEY)).repository.baseUrl, 'https://team.github.io/blocks');
  n.get('browse-projects').onclick();
  const groups = n.get('project-cards').children;
  const unassigned = groups.find((g) => g.children[0].textContent === 'Unassigned');
  unassigned.children[1].children[0].children[0].onclick();
  assert.equal(n.get('module-title').textContent, 'Original draft');
});
test('quick HTML fix is transactional and preserves the selected module fields', () => {
  const source = '<p style="padding:20px">Hello</p>',
    initial = {
      format: 'jarrang-block-studio',
      version: 1,
      settings: {},
      modules: [
        {
          id: 'm',
          name: 'Hero',
          slug: 'hero',
          release: '1.0.0',
          source,
          draftSource: source,
          fields: C.infer(source).fields,
          analysed: true,
          reviewed: true,
        },
      ],
    };
  const { nodes: n, context } = setup(initial);
  n.get('quick-edit-html').onclick();
  n.get('quick-code-source').value = source.replace('20px', '24px');
  n.get('quick-code-source').fire('input');
  assert.equal(context.window.BlockStudio.getProject().modules[0].source, source);
  n.get('quick-code-cancel').onclick();
  assert.equal(n.get('confirm-dialog').open, true);
  n.get('dialog-confirm').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].source, source);
  n.get('quick-edit-html').onclick();
  n.get('quick-code-source').value = source.replace('20px', '28px');
  n.get('quick-code-source').fire('input');
  n.get('quick-code-save').onclick();
  const fixed = context.window.BlockStudio.getProject().modules[0];
  assert.equal(fixed.source, source.replace('20px', '28px'));
  assert.equal(fixed.fields[0].id, initial.modules[0].fields[0].id);
  assert.equal(fixed.reviewed, true);
  assert.equal(n.has('quick-code-dialog'), false);
});
test('an HTML file read cannot overwrite a module selected after the upload started', async () => {
  const { nodes: n, context } = setup();
  let resolve;
  const text = new Promise((r) => (resolve = r));
  const pending = n.get('html-file').onchange({
    target: {
      files: [{ name: 'late.html', size: 10, text: () => text }],
      value: 'x',
    },
  });
  n.get('new-module').onclick();
  const before = context.window.BlockStudio.getProject();
  resolve('<p>Late upload</p>');
  await pending;
  assert.equal(JSON.stringify(context.window.BlockStudio.getProject()), JSON.stringify(before));
  assert.match(n.get('notice').textContent, /cancelled/);
});
test('a rejected HTML file read reports the error without changing the draft', async () => {
  const { nodes: n, context } = setup(),
    before = JSON.stringify(context.window.BlockStudio.getProject());
  await n.get('html-file').onchange({
    target: {
      files: [
        {
          name: 'broken.html',
          size: 10,
          text: async () => {
            throw Error('read failed');
          },
        },
      ],
      value: 'x',
    },
  });
  assert.equal(JSON.stringify(context.window.BlockStudio.getProject()), before);
  assert.match(n.get('notice').textContent, /read failed/);
});
test('closing with a pending quick fix warns; cancelling the fix removes that warning', () => {
  const source = '<p style="padding:20px">Hello</p>',
    initial = {
      format: 'jarrang-block-studio',
      version: 1,
      settings: {},
      modules: [
        {
          id: 'm',
          name: 'Hero',
          slug: 'hero',
          release: '1.0.0',
          source,
          draftSource: source,
          fields: C.infer(source).fields,
          analysed: true,
          reviewed: true,
        },
      ],
    };
  const { nodes: n, listeners } = setup(initial);
  n.get('quick-edit-html').onclick();
  n.get('quick-code-source').value = source.replace('20px', '24px');
  n.get('quick-code-source').fire('input');
  let warned = false;
  listeners.beforeunload({
    preventDefault() {
      warned = true;
    },
  });
  assert.equal(warned, true);
  n.get('quick-code-cancel').onclick();
  n.get('dialog-confirm').onclick();
  warned = false;
  listeners.beforeunload({
    preventDefault() {
      warned = true;
    },
  });
  assert.equal(warned, false);
});
test('stale browser tab leaves persisted data untouched and warns on close', () => {
  const { nodes: n, storage, context, listeners } = setup(),
    key = context.window.BlockWorkspace.KEY;
  const newer = JSON.parse(storage.get(key));
  newer.repository.baseUrl = 'https://newer.example.com';
  const raw = JSON.stringify(newer);
  storage.set(key, raw);
  n.get('module-name').oninput({ target: { value: 'Unsaved edit' } });
  assert.equal(storage.get(key), raw);
  assert.match(n.get('save-state').textContent, /not saved/);
  let warned = false;
  listeners.beforeunload({
    preventDefault() {
      warned = true;
    },
  });
  assert.equal(warned, true);
});
test('export keeps the original filename and snapshot when selection changes while compressing', async () => {
  const source = '<p>Hello</p>',
    initial = {
      format: 'jarrang-block-studio',
      version: 1,
      settings: {
        clientName: 'Hertz',
        name: 'Commercial',
        clientSlug: 'hertz',
        templateSlug: 'commercial',
      },
      modules: [
        {
          id: 'm',
          name: 'Hero',
          slug: 'hero',
          release: '1.0.0',
          source,
          draftSource: source,
          fields: C.infer(source).fields,
          analysed: true,
          reviewed: true,
          acknowledged: true,
        },
      ],
    };
  const { nodes: n, context, downloads } = setup(initial);
  let resolve, captured;
  context.window.BlockExport.build = (p) => {
    captured = p;
    return new Promise((r) => (resolve = r));
  };
  const pending = n.get('download-module-zip').onclick();
  n.get('new-module').onclick();
  assert.equal(captured.modules.length, 1);
  resolve(new Blob(['zip']));
  await pending;
  assert.deepEqual(downloads, ['hero-sfmc.zip']);
  assert.equal(n.get('download-receipt').hidden, false);
  assert.equal(n.get('download-result').textContent, 'Download started: hero-sfmc.zip');
  assert.match(n.get('download-next-step').textContent, /has not published/);
  const result = context.window.BlockStudio.getProject();
  assert.equal(result.modules[0].exportedDefinition.id, 'm');
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.modules[0].published.fields)),
    JSON.parse(JSON.stringify(captured.modules[0].fields)),
  );
  assert.equal(result.modules[1].exportedDefinition, undefined);
});
test('replace all is atomic across protected values and safely updates separate CSS occurrences', () => {
  const source = '<p style="padding:20px">20px</p><div style="padding:20px"></div>',
    initial = {
      format: 'jarrang-block-studio',
      version: 1,
      settings: {},
      modules: [
        {
          id: 'm',
          name: 'Hero',
          slug: 'hero',
          release: '1.0.0',
          source,
          draftSource: source,
          fields: C.infer(source).fields,
          analysed: true,
          reviewed: true,
        },
      ],
    };
  const { nodes: n, context } = setup(initial);
  n.get('quick-edit-html').onclick();
  const surface = n.get('quick-code-source').parentNode.parentNode.parentNode,
    all = [];
  function walk(node) {
    all.push(node);
    node.children.forEach(walk);
  }
  walk(surface);
  const find = all.find((e) => e.type === 'search'),
    replacement = all.find((e) => e.placeholder === 'Replace with'),
    replaceAll = all.find((e) => e.textContent === 'Replace all');
  find.value = '20px';
  find.oninput();
  replacement.value = '24px';
  replaceAll.onclick();
  assert.equal(n.get('quick-code-source').value, source);
  n.get('quick-code-save').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].source, source);
  n.get('quick-edit-html').onclick();
  find.value = 'padding:20px';
  find.oninput();
  replacement.value = 'padding:24px';
  replaceAll.onclick();
  n.get('quick-code-save').onclick();
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].source,
    source.replaceAll('padding:20px', 'padding:24px'),
  );
});
test('selecting preview and sidebar fields preserves the iframe document and scroll position', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields,
        analysed: true,
        reviewed: true,
      },
    ],
  };
  const { nodes: n, listeners } = setup(initial),
    frame = n.get('mapping-preview'),
    messages = [];
  frame.contentWindow = { postMessage: (message) => messages.push(message) };
  Object.defineProperty(frame, 'srcdoc', {
    get: () => '<existing preview>',
    set: () => assert.fail('Selection must not reload the preview'),
  });
  frame.removeAttribute = () => assert.fail('Selection must not clear the preview');
  frame.scrollTop = 180;
  listeners.message({
    source: frame.contentWindow,
    data: { studioFields: [fields[1].id] },
  });
  assert.equal(messages.at(-1).fieldId, fields[1].id);
  assert.equal(n.get('field-list').children[1].className, 'field-row active');
  const first = n
    .get('field-list')
    .children[0].children.find((e) => e.className === 'field-select');
  first.onclick();
  assert.equal(messages.at(-1).fieldId, fields[0].id);
  assert.equal(frame.scrollTop, 180);
  frame.fire('load');
  assert.equal(messages.at(-1).fieldId, fields[0].id);
  const count = messages.length;
  listeners.message({ source: {}, data: { studioFields: [fields[1].id] } });
  assert.equal(messages.length, count);
});
test('preview message bridge updates all matching highlights and accepts only the parent', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(__dirname + '/../src/preview.js', 'utf8'), context);
  const script = '(' + context.window.BlockPreview.previewBridge.toString() + ')();',
    listeners = {},
    parent = { postMessage() {} },
    nodes = [['a'], ['b'], ['b', 'c']].map((ids) => ({
      dataset: { studioFields: JSON.stringify(ids) },
      selected: false,
      toggleAttribute(name, on) {
        assert.equal(name, 'data-studio-selected');
        this.selected = on;
      },
    }));
  vm.runInNewContext(script, {
    parent,
    window: { addEventListener: (type, fn) => (listeners[type] = fn) },
    document: {
      addEventListener() {},
      querySelectorAll: () => nodes,
      querySelector: () => null,
      body: {},
    },
    ResizeObserver: class {
      observe() {}
    },
  });
  listeners.message({
    source: parent,
    data: { type: 'studio-select-field', fieldId: 'b' },
  });
  assert.deepEqual(
    nodes.map((n) => n.selected),
    [false, true, true],
  );
  listeners.message({
    source: {},
    data: { type: 'studio-select-field', fieldId: 'a' },
  });
  assert.deepEqual(
    nodes.map((n) => n.selected),
    [false, true, true],
  );
  listeners.message({
    source: parent,
    data: { type: 'studio-select-field', fieldId: 'a' },
  });
  assert.deepEqual(
    nodes.map((n) => n.selected),
    [true, false, false],
  );
  nodes[1].dataset.studioChildren = JSON.stringify(['b:title']);
  listeners.message({
    source: parent,
    data: { type: 'studio-select-field', fieldId: 'b', childKey: 'title' },
  });
  assert.deepEqual(
    nodes.map((n) => n.selected),
    [false, true, false],
  );
  listeners.message({
    source: parent,
    data: { type: 'studio-select-field', fieldId: null },
  });
  assert.deepEqual(
    nodes.map((n) => n.selected),
    [false, false, false],
  );
});

test('preview sizing, field reordering and repeated navigation preserve the loaded preview', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields,
        analysed: true,
        reviewed: true,
      },
    ],
  };
  const { nodes: n, modes, steps, context, document } = setup(initial);
  steps[1].onclick();
  const frame = n.get('mapping-preview');
  frame.contentWindow = { postMessage() {} };
  Object.defineProperty(frame, 'srcdoc', {
    get: () => '<loaded>',
    set: () => assert.fail('Navigation must preserve the preview'),
  });
  frame.removeAttribute = () => assert.fail('Navigation must not clear the preview');
  modes[1].onclick();
  assert.equal(frame.style.width, '375px');
  assert.equal(modes[1]['aria-pressed'], 'true');
  n.get('show-map-source').onclick();
  assert.equal(n.get('mapping-canvas').hidden, true);
  modes[0].onclick();
  assert.equal(frame.style.width, '800px');
  assert.equal(n.get('mapping-canvas').hidden, false);
  const list = n.get('field-list');
  list.children[1].querySelector('.field-select').onclick();
  assert.equal(document.activeElement, list.children[1].querySelector('.field-select'));
  const selectedButton = document.activeElement;
  selectedButton.onclick();
  assert.equal(document.activeElement, selectedButton);
  assert.equal(list.children[1].querySelector('.field-select'), selectedButton);
  list.children[1]
    .querySelector('.field-drag-handle')
    .onkeydown({ key: 'ArrowUp', preventDefault() {} });
  assert.equal(context.window.BlockStudio.getProject().modules[0].fields[0].id, fields[1].id);
  steps[1].onclick();
  n.get('module-list').children[0].onclick();
  assert.equal(n.get('step-map').hidden, false);
});

test('configure and test share one preview, retain test values across modes, and export starting values', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  fields.forEach((f) => (f.type = 'text'));
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields,
        analysed: true,
        reviewed: false,
      },
    ],
  };
  const { nodes: n, context, steps } = setup(initial),
    frame = n.get('mapping-preview'),
    sent = [];
  context.window.BlockPreview.documentHTML = (html, module, interactive) =>
    JSON.stringify({ html, interactive });
  frame.removeAttribute = () => {};
  let loads = 0;
  Object.defineProperty(frame, 'srcdoc', {
    set() {
      loads++;
    },
    get() {
      return 'loaded';
    },
  });
  frame.contentWindow = { postMessage: (m) => sent.push(m) };
  steps[0].onclick();
  steps[1].onclick();
  frame.fire('load');
  assert.equal(loads, 1);
  n.get('task-test').onclick();
  assert.equal(n.get('test-fields-panel').hidden, false);
  assert.equal(n.get('configure-fields-panel').hidden, true);
  function input(id) {
    const todo = [n.get('trial-fields')];
    while (todo.length) {
      const e = todo.shift();
      if (e.id === 'trial-' + id) return e;
      todo.push(...e.children);
    }
    throw Error('Missing control');
  }
  input(fields[0].id).value = 'Temporary heading';
  input(fields[0].id).oninput();
  assert.ok(sent.at(-1).html.includes('Temporary heading'));
  n.get('show-map-source').onclick();
  assert.equal(n.get('trial-source').hidden, false);
  assert.equal(n.get('mapping-source').hidden, true);
  n.get('task-fields').onclick();
  assert.equal(n.get('mapping-source').hidden, true);
  assert.equal(n.get('mapping-canvas').hidden, false);
  assert.equal(n.get('trial-source').hidden, true);
  assert.ok(!sent.at(-1).html.includes('Temporary heading'));
  n.get('task-test').onclick();
  assert.equal(input(fields[0].id).value, 'Temporary heading');
  assert.equal(loads, 1);
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].fields[0].defaultValue,
    fields[0].defaultValue,
  );
  input(fields[1].id).value = 'Keep this test';
  input(fields[1].id).oninput();
  n.get('task-fields').onclick();
  context.window.BlockFieldEditor.open = (module, field, save) =>
    save({ ...field, label: 'Updated heading' });
  n.get('field-list')
    .children[0].querySelector('.field-edit-shortcut')
    .onclick({ stopPropagation() {} });
  n.get('task-test').onclick();
  assert.equal(input(fields[0].id).value, fields[0].defaultValue);
  assert.equal(input(fields[1].id).value, 'Keep this test');
  assert.equal(loads, 1);
  n.get('reset-values').onclick();
  assert.equal(input(fields[0].id).value, fields[0].defaultValue);
  assert.equal(loads, 1);
  n.get('task-export').onclick();
  assert.equal(n.get('step-export').hidden, false);
  assert.equal(context.window.BlockStudio.getProject().modules[0].reviewed, false);
});

test('project download has persistent next steps and does not change browser-save status', () => {
  const { nodes: n, downloads } = setup();
  const status = n.get('save-state').textContent;
  n.get('save-project').onclick();
  assert.ok(downloads[0].endsWith('.jarrang.json'));
  assert.equal(n.get('download-result').textContent, 'Download started: ' + downloads[0]);
  assert.match(n.get('download-next-step').textContent, /Editable project JSON/);
  assert.equal(n.get('save-state').textContent, status);
  assert.equal(n.get('download-receipt').hidden, false);
  n.get('dismiss-download').onclick();
  assert.equal(n.get('download-receipt').hidden, true);
});

test('Advanced field tab selects its panel without exporting, and open dialogs block ZIP export', async () => {
  const { context, document, nodes, downloads } = setup();
  document.body = new Element(document);
  const source = '<p>Editable copy</p>',
    module = { source, fields: C.infer(source).fields };
  context.window.BlockFieldEditor.open(module, module.fields[0], () => {});
  const dialog = document.body.children[0];
  function find(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = find(child, id);
      if (found) return found;
    }
  }
  let stopped = false;
  find(dialog, 'field-tab-advanced').onclick({
    preventDefault() {},
    stopPropagation() {
      stopped = true;
    },
  });
  assert.equal(stopped, true);
  assert.equal(find(dialog, 'field-panel-advanced').hidden, false);
  assert.equal(find(dialog, 'field-panel-setup').hidden, true);
  assert.equal(find(dialog, 'field-tab-advanced')['aria-selected'], 'true');
  assert.deepEqual(downloads, []);
  const query = document.querySelectorAll;
  document.querySelectorAll = (selector) => (selector === 'dialog' ? [dialog] : query(selector));
  let builds = 0;
  context.window.BlockExport.build = async () => {
    builds++;
    return new Blob([]);
  };
  await nodes.get('download-module').onclick();
  await nodes.get('export-all').onclick();
  assert.equal(builds, 0);
  assert.deepEqual(downloads, []);
});

test('content behaviour is staged inside the field editor and requires confirmation before removing rows', () => {
  const { context, document } = setup();
  document.body = new Element(document);
  const source = '<div><p>Button text</p></div>',
    module = { source, fields: C.infer(source).fields };
  const group = C.repeatSelection(module, 0, source.length);
  group.defaultValue.push({ ...group.defaultValue[0] });
  const before = JSON.stringify(module);
  let result;
  context.window.BlockFieldEditor.open(module, group, (_, conversion) => (result = conversion));
  const dialog = document.body.children[0];
  function all(node) {
    return [node, ...node.children.flatMap(all)];
  }
  const single = () => all(dialog).find((n) => n.type === 'radio' && n.value === 'single');
  single().onchange();
  assert.equal(JSON.stringify(module), before);
  all(dialog)
    .find((n) => n.textContent === 'Save as single item')
    .onclick();
  assert.equal(result, undefined);
  const confirm = all(dialog).find((n) => n.type === 'checkbox');
  confirm.checked = true;
  confirm.onchange();
  all(dialog)
    .find((n) => n.textContent === 'Save as single item')
    .onclick();
  assert.ok(result);
  assert.equal(
    result.draft.fields.some((f) => f.type === 'list'),
    false,
  );
  assert.equal(JSON.stringify(module), before);
});

test('template colours are staged until saved, persisted once and inherited by new modules', () => {
  const { nodes: n, storage, context } = setup(),
    W = context.window.BlockWorkspace;
  n.get('template-settings').onclick();
  n.get('theme-enabled').onchange({ target: { checked: true } });
  n.get('cancel-template').onclick();
  let ws = JSON.parse(storage.get(W.KEY));
  assert.equal(Object.hasOwn(ws.projects[0].settings, 'editorTheme'), false);
  n.get('template-settings').onclick();
  assert.equal(n.get('theme-enabled').checked, false);
  n.get('theme-enabled').onchange({ target: { checked: true } });
  n.get('template-client').value = 'Client';
  n.get('template-name').value = 'Newsletter';
  n.get('template-form').onsubmit({ preventDefault() {} });
  ws = JSON.parse(storage.get(W.KEY));
  assert.equal(ws.projects[0].settings.editorTheme.accent, '#080043');
  n.get('new-module').onclick();
  ws = JSON.parse(storage.get(W.KEY));
  assert.ok(ws.projects[0].modules.every((m) => !Object.hasOwn(m, 'editorTheme')));
  for (const m of ws.projects[0].modules)
    assert.equal(
      context.window.BlockExport.themedModule(ws.projects[0], m).editorTheme.accent,
      '#080043',
    );
});

test('existing module tasks distinguish read-only connections and output and route code fixes to export', () => {
  const source = '<p style="padding:20px">Hello</p>';
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields: C.infer(source).fields,
        analysed: true,
        reviewed: true,
      },
    ],
  };
  const { nodes: n, context } = setup(initial);
  assert.equal(n.get('module-task-navigation').hidden, false);
  for (const id of [
    'configure-fields',
    'confirm-fields',
    'review-export',
    'quick-code-save-review',
    'add-module',
    'switch-template',
  ])
    assert.equal(n.has(id), false);
  n.get('task-fields').onclick();
  assert.equal(n.get('task-fields')['aria-current'], 'page');
  assert.equal(n.get('setup-navigation').hidden, true);
  n.get('quick-edit-html').onclick();
  assert.equal(n.get('show-map-source').hidden, true);
  assert.equal(n.get('code-view-context').hidden, true);
  assert.equal(n.get('quick-code-preview-state').textContent, 'No changes');
  assert.equal(n.get('inline-code-actions').hidden, false);
  assert.equal(n.get('quick-edit-html')['aria-current'], 'page');
  assert.equal(n.get('mapping-canvas').hidden, true);
  n.get('quick-code-source').value = source.replace('20px', '24px');
  n.get('quick-code-source').fire('input');
  n.get('quick-code-save').onclick();
  n.get('task-export').onclick();
  assert.equal(n.has('quick-code-dialog'), false);
  assert.equal(n.get('step-export').hidden, false);
  n.get('icon-symbol').onchange({ target: { value: 'play-btn' } });
  n.get('icon-colour').oninput({ target: { value: '#ffffff' } });
  assert.equal(context.window.BlockStudio.getProject().modules[0].iconSymbol, 'play-btn');
  assert.equal(context.window.BlockStudio.getProject().modules[0].iconColour, '#ffffff');
  assert.match(n.get('block-icon-preview').src, /^data:image\/png;base64,/);
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].source,
    source.replace('20px', '24px'),
  );
  context.window.BlockPreview.documentHTML = (html) => html;
  n.get('task-test').onclick();
  assert.equal(n.get('show-map-source').textContent, 'Generated HTML');
  n.get('source-setup').onclick();
  assert.equal(n.get('step-import').hidden, false);
});

test('inline HTML drafts survive module switches and block exports until applied or discarded', async () => {
  const source = '<p style="padding:20px">Hello</p>',
    make = (id) => ({
      id,
      name: id,
      slug: id,
      release: '1.0.0',
      source,
      draftSource: source,
      fields: C.infer(source).fields,
      analysed: true,
      reviewed: true,
    });
  const {
    nodes: n,
    context,
    downloads,
    listeners,
  } = setup({
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [make('first'), make('second')],
  });
  n.get('quick-edit-html').onclick();
  const input = n.get('quick-code-source');
  input.value = source.replace('20px', '24px');
  input.fire('input');
  assert.equal(n.get('quick-code-save').disabled, false);
  n.get('module-list').children[1].onclick();
  n.get('quick-edit-html').onclick();
  assert.equal(input.value, source);
  n.get('save-project').onclick();
  await n.get('export-all').onclick();
  assert.deepEqual(downloads, []);
  n.get('module-list').children[0].onclick();
  assert.equal(n.get('quick-code-source'), input);
  assert.equal(input.value, source.replace('20px', '24px'));
  let warned = false;
  listeners.beforeunload({
    preventDefault() {
      warned = true;
    },
  });
  assert.equal(warned, true);
  n.get('quick-code-save').onclick();
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].source,
    source.replace('20px', '24px'),
  );
  assert.equal(context.window.BlockStudio.getProject().modules[1].source, source);
  assert.equal(n.has('quick-code-dialog'), false);
});

function historyProject() {
  const source = '<h1>Title</h1><p style="padding:20px">Body</p>';
  const make = (id) => ({
    id,
    name: id,
    slug: id,
    release: '1.0.0',
    source,
    draftSource: source,
    fields: C.infer(source).fields,
    analysed: true,
    reviewed: true,
  });
  const project = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [make('first'), make('second')],
  };
  require('../src/maintenance.js');
  globalThis.BlockMaintenance.recordExport(project, JSON.parse(JSON.stringify(project.modules)));
  return project;
}

test('module undo restores field removal, reordering and applied HTML fixes in persisted drafts', () => {
  const initial = historyProject(),
    { nodes: n, context, storage } = setup(initial);
  const current = () => context.window.BlockStudio.getProject().modules[0];
  const original = current();
  n.get('field-list')
    .children[1].querySelector('.field-drag-handle')
    .onkeydown({ key: 'ArrowUp', preventDefault() {} });
  assert.equal(current().fields[0].id, original.fields[1].id);
  n.get('module-undo').onclick();
  assert.deepEqual(current().fields, original.fields);
  n.get('module-redo').onclick();
  assert.equal(current().fields[0].id, original.fields[1].id);
  n.get('field-list').children[0].querySelector('.field-remove').onclick();
  n.get('dialog-confirm').onclick();
  assert.equal(current().fields.length, 1);
  n.get('module-undo').onclick();
  assert.equal(current().fields.length, 2);
  n.get('quick-edit-html').onclick();
  const input = n.get('quick-code-source');
  input.value = input.value.replace('20px', '24px');
  input.fire('input');
  assert.equal(n.get('module-undo').disabled, true);
  const pending = current();
  n.get('module-undo').onclick();
  assert.deepEqual(current(), pending);
  n.get('quick-code-save').onclick();
  const edited = current();
  assert.match(edited.source, /24px/);
  n.get('module-undo').onclick();
  assert.equal(current().source, original.source);
  n.get('module-redo').onclick();
  assert.equal(current().source, edited.source);
  assert.deepEqual(current().fields, edited.fields);
  assert.deepEqual(current().exportedDefinition, original.exportedDefinition);
  const saved = JSON.parse(storage.get(context.window.BlockWorkspace.KEY));
  assert.equal(saved.projects[0].modules[0].source, edited.source);
});

test('undo coalesces name typing, isolates modules and leaves native editing and dialogs in charge of shortcuts', () => {
  const { nodes: n, context, listeners } = setup(historyProject());
  const modules = () => context.window.BlockStudio.getProject().modules;
  const rename = (value) => n.get('module-name').oninput({ target: { value } });
  rename('A');
  rename('AB');
  n.get('module-list').children[1].onclick();
  assert.equal(n.get('module-undo').disabled, true);
  rename('Second changed');
  n.get('module-list').children[0].onclick();
  const key = (target) => {
    let prevented = false;
    listeners.keydown({
      key: 'z',
      ctrlKey: true,
      target,
      preventDefault() {
        prevented = true;
      },
    });
    return prevented;
  };
  assert.equal(key({ closest: () => ({}) }), false);
  assert.equal(modules()[0].name, 'AB');
  n.get('confirm-dialog').showModal();
  assert.equal(key({ closest: () => null }), false);
  n.get('confirm-dialog').close();
  assert.equal(key({ closest: () => null }), true);
  assert.equal(modules()[0].name, 'first');
  assert.equal(modules()[1].name, 'Second changed');
  n.get('module-redo').onclick();
  assert.equal(modules()[0].name, 'AB');
  listeners.focusout();
  rename('ABC');
  n.get('module-undo').onclick();
  assert.equal(modules()[0].name, 'AB');
});

test('recovery is reviewable, cancellable and reversible; reopening keeps the export reference but starts new session history', () => {
  const initial = historyProject(),
    { nodes: n, context } = setup(initial);
  const current = () => context.window.BlockStudio.getProject().modules[0];
  assert.equal(n.get('restore-export').disabled, true);
  n.get('module-name').oninput({ target: { value: 'Working draft' } });
  assert.equal(n.get('restore-export').disabled, false);
  n.get('restore-export').onclick();
  assert.equal(n.get('recovery-dialog').open, true);
  assert.match(n.get('recovery-current').textContent, /Working draft/);
  assert.match(n.get('recovery-exported').textContent, /first/);
  n.get('recovery-cancel').onclick();
  assert.equal(current().name, 'Working draft');
  n.get('restore-export').onclick();
  n.get('recovery-confirm').onclick();
  assert.equal(current().name, 'first');
  assert.equal(n.get('restore-export').disabled, true);
  n.get('module-undo').onclick();
  assert.equal(current().name, 'Working draft');
  assert.equal(
    JSON.stringify(current().exportedDefinition),
    JSON.stringify(initial.modules[0].exportedDefinition),
  );
  const reopened = setup(context.window.BlockStudio.getProject());
  assert.equal(reopened.nodes.get('module-undo').disabled, true);
  assert.equal(reopened.nodes.get('restore-export').disabled, false);
  reopened.nodes.get('restore-export').onclick();
  reopened.nodes.get('recovery-confirm').onclick();
  assert.equal(reopened.context.window.BlockStudio.getProject().modules[0].name, 'first');
});

test('a recovery confirmation cannot overwrite a changed module, and local save failures retain undo', () => {
  const { nodes: n, context } = setup(historyProject());
  n.get('module-name').oninput({ target: { value: 'Draft' } });
  n.get('restore-export').onclick();
  n.get('module-name').oninput({ target: { value: 'Newer draft' } });
  n.get('recovery-confirm').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].name, 'Newer draft');
  assert.equal(n.get('recovery-dialog').open, false);
  context.localStorage.setItem = () => {
    throw Error('Storage is full');
  };
  n.get('module-name').oninput({ target: { value: 'Unsaved' } });
  assert.equal(n.get('module-undo').disabled, false);
  n.get('module-undo').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].name, 'first');
});

test('undoing and redoing initial field detection returns to the appropriate workspace', () => {
  const { nodes: n, context } = setup();
  const source = '<h1>Hello</h1>';
  n.get('source-html').value = source;
  n.get('source-html').oninput({ target: { value: source } });
  n.get('analyse').onclick();
  assert.equal(n.get('step-map').hidden, false);
  n.get('module-undo').onclick();
  assert.equal(n.get('step-import').hidden, false);
  assert.equal(context.window.BlockStudio.getProject().modules[0].analysed, false);
  n.get('module-redo').onclick();
  assert.equal(n.get('step-map').hidden, false);
  assert.equal(context.window.BlockStudio.getProject().modules[0].analysed, true);
});

test('typing in HTML leaves the hidden preview alone and validates/renders when Desktop is opened', () => {
  const { nodes: n, context, modes, flushTimers, listeners } = setup(historyProject());
  const original = context.window.BlockStudio.getProject().modules[0].source;
  n.get('quick-edit-html').onclick();
  const render = context.window.BlockPreview.documentHTML;
  const rendered = [];
  context.window.BlockPreview.documentHTML = (...args) => {
    rendered.push(args[0]);
    return render(...args);
  };
  const input = n.get('quick-code-source');
  input.value = original.replace('20px', '24px');
  input.fire('input');
  flushTimers();
  assert.equal(rendered.length, 0, 'no document generation for a hidden preview');
  modes[0].onclick();
  assert.equal(rendered.length, 1);
  assert.match(rendered[0], /24px/);
  assert.equal(context.window.BlockStudio.getProject().modules[0].source, original);
  n.get('quick-edit-html').onclick();
  input.value = original;
  input.fire('input');
  assert.equal(n.get('quick-code-save').disabled, true);
  let warned = false;
  listeners.beforeunload({
    preventDefault() {
      warned = true;
    },
  });
  assert.equal(warned, false, 'returning to saved HTML releases the pending draft');
});

test('invalid pending code remains unapplied when the user opens the visual preview', () => {
  const { nodes: n, context, modes } = setup(historyProject());
  const original = context.window.BlockStudio.getProject().modules[0].source;
  n.get('quick-edit-html').onclick();
  n.get('quick-code-source').value = original + '<table>';
  n.get('quick-code-source').fire('input');
  modes[0].onclick();
  assert.ok(n.get('quick-code-error').textContent);
  n.get('quick-code-save').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].source, original);
});

test('removing an unassigned draft requires confirmation and preserves the client template', () => {
  const { nodes: n, storage, context } = setup();
  const W = context.window.BlockWorkspace;
  n.get('new-template').onclick();
  n.get('template-client').value = 'ESC';
  n.get('template-name').value = 'Newsletter';
  n.get('template-form').onsubmit({ preventDefault() {} });
  const before = JSON.parse(storage.get(W.KEY));
  n.get('browse-projects').onclick();
  const group = n
    .get('project-cards')
    .children.find((g) => g.children[0].textContent === 'Unassigned');
  const remove = group.children[1].children[0].children[1];
  remove.onclick();
  assert.equal(n.get('confirm-dialog').open, true);
  n.get('dialog-cancel').onclick();
  assert.equal(JSON.parse(storage.get(W.KEY)).projects.length, 2);
  remove.onclick();
  n.get('dialog-confirm').onclick();
  const after = JSON.parse(storage.get(W.KEY));
  assert.equal(after.projects.length, 1);
  assert.deepEqual(after.projects[0], before.projects[1]);
  assert.equal(after.activeId, before.activeId);
  assert.equal(n.get('project-cards').children.length, 1);
});

test('connected repository Save writes generated files and updates the reference only after success', async () => {
  const source = '<p style="padding:20px">Hello</p>';
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    projectId: 'p',
    settings: {
      clientName: 'ESC',
      name: 'Newsletter',
      clientSlug: 'esc',
      templateSlug: 'newsletter',
    },
    modules: [
      {
        id: 'hero',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields: [],
        analysed: true,
        reviewed: false,
        acknowledged: false,
      },
    ],
  };
  const { nodes: n, context, storage } = setup(initial);
  let filesSaved = false,
    fail = false;
  context.window.showDirectoryPicker = async () => ({
    name: 'blocks',
    requestPermission: async () => 'granted',
  });
  context.window.BlockRepository = {
    remembered: async () => null,
    connect: async (handle) => ({
      name: handle.name,
      files: [],
      save: async (entries, options) => {
        assert.equal(options.templateSlug, 'newsletter');
        assert.ok(entries.has('project'));
        if (fail) throw Error('External edit detected');
        filesSaved = true;
      },
    }),
  };
  context.window.BlockMaintenance.readRepository = async () => [
    JSON.parse(JSON.stringify(initial)),
  ];
  context.window.BlockExport.files = async () => new Map([['project', new Uint8Array([1])]]);
  await n.get('open-repository').onclick();
  if (n.get('confirm-dialog').open) n.get('dialog-confirm').onclick();
  n.get('module-release').oninput({ target: { value: 'invalid' } });
  await n.get('save-repository').onclick();
  assert.equal(filesSaved, false, 'real validation still blocks all writes');
  assert.equal(n.get('save-issues').hidden, false);
  const issue = n
    .get('save-issues-list')
    .children.find((row) => /version/.test(row.children[0].textContent));
  issue.children[1].onclick();
  assert.equal(n.get('step-export').hidden, false);
  assert.equal(n.get('save-issues').hidden, true);
  assert.equal(context.document.activeElement, n.get('module-release'));
  n.get('module-release').oninput({ target: { value: '1.0.0' } });
  await n.get('save-repository').onclick();
  assert.equal(filesSaved, true, 'valid unreviewed modules save without acknowledgement');
  assert.match(n.get('repository-state').textContent, /Saved to repository/);
  const saved = context.window.BlockStudio.getProject();
  assert.equal(saved.modules[0].exportedDefinition.source, source);
  assert.match(n.get('notice').textContent, /Ready to commit/);
  n.get('quick-edit-html').onclick();
  n.get('quick-code-source').value = source.replace('20px', '24px');
  n.get('quick-code-source').fire('input');
  n.get('quick-code-save').onclick();
  filesSaved = false;
  await n.get('save-repository').onclick();
  assert.equal(filesSaved, true, 'an applied CSS fix saves without a second review step');
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].exportedDefinition.source,
    source.replace('20px', '24px'),
  );
  n.get('module-name').oninput({ target: { value: 'Updated hero' } });
  assert.match(n.get('repository-state').textContent, /Unsaved/);
  fail = true;
  await n.get('save-repository').onclick();
  assert.equal(context.window.BlockStudio.getProject().modules[0].exportedDefinition.name, 'Hero');
  assert.match(n.get('notice').textContent, /Save failed/);
  assert.equal(
    JSON.parse(storage.get(context.window.BlockWorkspace.KEY)).projects[0].modules[0].name,
    'Updated hero',
  );
});

test('scrolling lists retain position across field selection, reordering and module navigation', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: ['one', 'two'].map((id) => ({
      id,
      name: id,
      slug: id,
      release: '1.0.0',
      source,
      draftSource: source,
      fields,
      analysed: true,
      reviewed: true,
    })),
  };
  const { nodes: n, steps, document, context } = setup(initial);
  steps[1].onclick();
  const list = n.get('field-list'),
    modules = n.get('module-list');
  list.scrollTop = 650;
  modules.scrollTop = 500;
  modules.scrollLeft = 180;
  list.children[1].querySelector('.field-select').onclick();
  assert.equal(list.scrollTop, 650, 'selection must restore position after rebuilding rows');
  list.children[1]
    .querySelector('.field-drag-handle')
    .onkeydown({ key: 'ArrowUp', preventDefault() {} });
  assert.equal(list.scrollTop, 650);
  assert.equal(modules.scrollTop, 500, 'field changes also refresh module metadata');
  assert.equal(modules.scrollLeft, 180);
  assert.equal(context.window.BlockStudio.getProject().modules[0].fields[0].id, fields[1].id);
  modules.children[1].focus();
  modules.children[1].onclick();
  assert.equal(modules.scrollTop, 500);
  assert.equal(modules.scrollLeft, 180);
  assert.equal(
    document.activeElement,
    modules.children[1],
    'keyboard focus survives sidebar rebuild',
  );
  assert.equal(list.scrollTop, 0, 'a different module starts at its first field');
});

test('field dragging scrolls at the list edges and stops on leaving, dropping or cancelling', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Test',
        slug: 'test',
        release: '1.0.0',
        source,
        draftSource: source,
        fields,
        analysed: true,
        reviewed: true,
      },
    ],
  };
  const { nodes: n, steps, frames, flushFrames, context } = setup(initial);
  steps[1].onclick();
  const list = n.get('field-list');
  list.getBoundingClientRect = () => ({ top: 100, bottom: 400, height: 300 });
  list.scrollHeight = 1800;
  list.clientHeight = 300;
  list.contains = (el) => el === list;
  list.scrollTop = 200;
  const handle = list.children[0].querySelector('.field-drag-handle');
  const transfer = { setData() {} };
  const over = (y) => list.ondragover({ clientY: y, preventDefault() {} });
  over(398);
  assert.equal(frames.size, 0, 'external drags do not start scrolling');
  handle.ondragstart({ dataTransfer: transfer });
  over(398);
  flushFrames();
  assert.ok(list.scrollTop > 200);
  over(250);
  assert.equal(frames.size, 0, 'middle of the list stops scrolling');
  over(102);
  flushFrames();
  assert.equal(list.scrollTop, 200);
  list.ondragleave({ relatedTarget: null });
  assert.equal(frames.size, 0);
  over(398);
  handle.ondragend();
  assert.equal(frames.size, 0);
  handle.ondragstart({ dataTransfer: transfer });
  over(398);
  const target = list.children[1];
  target.getBoundingClientRect = () => ({ top: 300, height: 80 });
  target.ondrop({ clientY: 370, preventDefault() {} });
  assert.equal(frames.size, 0, 'drop cancels the animation before replacing rows');
  assert.equal(context.window.BlockStudio.getProject().modules[0].fields[1].id, fields[0].id);
});

test('fit and actual-size preview keep the email viewport and loaded document intact', () => {
  const source = '<h1>Title</h1><p>Body</p>',
    fields = C.infer(source).fields;
  const initial = {
    format: 'jarrang-block-studio',
    version: 1,
    settings: {},
    modules: [
      {
        id: 'm',
        name: 'Hero',
        slug: 'hero',
        release: '1.0.0',
        source,
        draftSource: source,
        fields,
        analysed: true,
        reviewed: true,
      },
    ],
  };
  const { nodes: n, context, listeners, modes, steps } = setup(initial);
  steps[1].onclick();
  const canvas = n.get('mapping-canvas'),
    frame = n.get('mapping-preview'),
    box = n.get('preview-size');
  canvas.clientWidth = 624;
  canvas.clientHeight = 424;
  context.window.getComputedStyle = () => ({
    paddingLeft: '12px',
    paddingRight: '12px',
    paddingTop: '12px',
    paddingBottom: '12px',
  });
  context.window.matchMedia = () => ({ matches: true });
  frame.contentWindow = { postMessage() {} };
  Object.defineProperty(frame, 'srcdoc', {
    get: () => '<loaded>',
    set: () => assert.fail('Fitting must not reload the iframe'),
  });
  n.get('preview-scale').value = 'fit';
  listeners.message({ source: frame.contentWindow, data: { studioHeight: 1200 } });
  assert.equal(frame.style.width, '800px');
  assert.equal(frame.style.height, '1200px');
  assert.equal(box.style.height, '400px');
  assert.ok(parseFloat(box.style.width) <= 600);
  assert.equal(n.get('preview-fit-option').textContent, 'Fit module (33%)');
  n.get('preview-scale').value = 'actual';
  n.get('preview-scale').onchange();
  assert.equal(frame.style.transform, 'scale(1)');
  assert.equal(box.style.width, '800px');
  assert.equal(box.style.height, '1200px');
  n.get('preview-scale').value = 'fit';
  listeners.message({ source: frame.contentWindow, data: { studioHeight: 80 } });
  assert.equal(box.style.height, '60px');
  assert.equal(frame.style.width, '800px');
  listeners.message({ source: {}, data: { studioHeight: 900 } });
  assert.equal(frame.style.height, '80px');
  modes[1].onclick();
  assert.equal(frame.style.width, '375px');
  assert.equal(box.style.width, '375px');
  canvas.clientWidth = 300;
  listeners.resize();
  assert.equal(box.style.width, '276px');
  n.get('show-map-source').onclick();
  assert.equal(n.get('preview-scale').hidden, true);
  modes[0].onclick();
  assert.equal(n.get('preview-scale').hidden, false);
});

async function connectedSaveScenario() {
  const initial = historyProject();
  initial.settings = {
    clientName: 'ESC',
    name: 'Newsletter',
    clientSlug: 'esc',
    templateSlug: 'newsletter',
  };
  const scenario = setup(initial),
    { nodes: n, context } = scenario;
  const writes = [];
  const gate = { duringSave: async () => {} };
  context.window.showDirectoryPicker = async () => ({
    name: 'blocks',
    requestPermission: async () => 'granted',
  });
  context.window.BlockRepository = {
    remembered: async () => null,
    connect: async () => ({
      name: 'blocks',
      files: [],
      save: async (entries) => {
        writes.push(entries);
        await gate.duringSave();
      },
    }),
  };
  context.window.BlockMaintenance.readRepository = async () => [
    JSON.parse(JSON.stringify(initial)),
  ];
  context.window.BlockExport.files = async (p, modules) => JSON.parse(JSON.stringify(modules));
  await n.get('open-repository').onclick();
  if (n.get('confirm-dialog').open) n.get('dialog-confirm').onclick();
  return { ...scenario, writes, gate };
}

test('Undo cannot change the module while a repository save is in progress', async () => {
  const { nodes: n, context, listeners, writes, gate } = await connectedSaveScenario();
  n.get('module-name').oninput({ target: { value: 'Ready to save' } });
  gate.duringSave = async () => {
    listeners.keydown({ key: 'z', ctrlKey: true, target: {}, preventDefault() {} });
    assert.equal(context.window.BlockStudio.getProject().modules[0].name, 'Ready to save');
  };
  await n.get('save-repository').onclick();
  assert.equal(writes[0][0].name, 'Ready to save');
  assert.equal(context.window.BlockStudio.getProject().modules[0].name, 'Ready to save');
  assert.match(n.get('repository-state').textContent, /Saved to repository/);
  n.get('module-undo').onclick();
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].name,
    'first',
    'Undo works again once saving finishes',
  );
});

test('undo back to saved content does not show unsaved changes for obsolete review flags', async () => {
  const { nodes: n } = await connectedSaveScenario();
  await n.get('save-repository').onclick();
  assert.match(n.get('repository-state').textContent, /Saved to repository/);
  n.get('module-name').oninput({ target: { value: 'Draft name' } });
  assert.match(n.get('repository-state').textContent, /Unsaved/);
  n.get('module-undo').onclick();
  assert.match(n.get('repository-state').textContent, /Saved to repository/);
});

test('a completed repository save does not hide a failed browser recovery-draft write', async () => {
  const { nodes: n, context, gate, writes } = await connectedSaveScenario();
  n.get('module-name').oninput({ target: { value: 'Saved file name' } });
  gate.duringSave = async () => {
    context.localStorage.setItem = () => {
      throw Error('Storage quota exceeded');
    };
  };
  await n.get('save-repository').onclick();
  assert.equal(writes.length, 1);
  assert.equal(
    context.window.BlockStudio.getProject().modules[0].exportedDefinition.name,
    'Saved file name',
  );
  assert.match(n.get('notice').textContent, /Saved to repository/);
  assert.match(n.get('notice').textContent, /recovery draft.*not.*saved/i);
  assert.match(n.get('save-state').textContent, /Draft not saved/);
});

test('compatibility errors open the affected field instead of unrelated module settings', async () => {
  const { nodes: n, context, writes } = await connectedSaveScenario();
  const module = context.window.BlockStudio.getProject().modules[0];
  const field = module.fields[0];
  // Simulate a saved field draft through the same authoring callback.
  let apply;
  context.window.BlockFieldEditor.open = (m, f, onSave) => {
    apply = onSave;
  };
  n.get('field-list')
    .children[0].querySelector('.field-edit-shortcut')
    .onclick({ stopPropagation() {} });
  apply({ ...field, required: true });
  await n.get('save-repository').onclick();
  assert.equal(writes.length, 0);
  const issue = n
    .get('save-issues-list')
    .children.find((row) => /Tighter validation/.test(row.children[0].textContent));
  assert.ok(issue);
  let opened;
  context.window.BlockFieldEditor.open = (m, f) => {
    opened = f.id;
  };
  issue.children[1].onclick();
  assert.equal(opened, field.id);
});
