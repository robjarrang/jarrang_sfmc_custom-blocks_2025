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
    downloads = [];
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
    querySelector: () => new Element(),
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
    crypto: require('node:crypto').webcrypto,
    setTimeout: () => 0,
    clearTimeout() {},
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
    'field-editor.js',
    'block-icons.js',
    'exporter.js',
    'workspace.js',
    'quick-edit.js',
    'code-editor.js',
    'preview.js',
    'repeat-builder.js',
    'app.js',
  ])
    vm.runInContext(fs.readFileSync(__dirname + '/../src/' + name, 'utf8'), context);
  return {
    nodes,
    storage,
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
  unassigned.children[1].children[0].onclick();
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
  const pending = n.get('download-module').onclick();
  n.get('new-module').onclick();
  assert.equal(captured.modules.length, 1);
  resolve(new Blob(['zip']));
  await pending;
  assert.deepEqual(downloads, ['hero-sfmc.zip']);
  assert.equal(n.get('download-receipt').hidden, false);
  assert.equal(n.get('download-result').textContent, 'Download started: hero-sfmc.zip');
  assert.match(n.get('download-next-step').textContent, /has not published/);
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
  assert.equal(context.window.BlockStudio.getProject().modules[0].reviewed, true);
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
  assert.equal(n.get('code-view-context').hidden, false);
  n.get('edit-code-from-view').onclick();
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
