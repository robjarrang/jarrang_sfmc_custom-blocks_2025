const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../src/core.js');
const root = path.resolve(__dirname, '../..');
const project = JSON.parse(
  fs.readFileSync(path.join(root, 'projects/esc/email-settings.jarrang.json')),
);
const original = project.modules[0];
const clone = (x) => JSON.parse(JSON.stringify(x));
test('settings output contains only the selected assignments; existing AMPscript stays opaque', () => {
  assert.doesNotThrow(() => C.assertProject(project));
  assert.equal(
    C.render(original),
    '%%[\nSET @BrandKey = "ESC"\nSET @FooterLogoMode = "BRAND"\n]%%',
  );
  assert.match(C.render(original, { 'footer-logo': 'ESC' }), /SET @FooterLogoMode = "ESC"/);
  const existing = { ...clone(original), settingsOnly: false };
  assert.equal(C.render(existing), existing.source);
  assert.deepEqual(C.htmlProblems(original), []);
  const extra = clone(original);
  extra.fields[0].options.push({ label: 'Example association', value: 'TEST_BRAND' });
  assert.match(C.render(extra, { brand: 'TEST_BRAND' }), /SET @BrandKey = "TEST_BRAND"/);
});
test('settings validation rejects script injection, unconfigured choices and ambiguous fields', () => {
  assert.throws(() => C.render(original, { brand: 'OTHER' }), /configured dropdown/);
  for (const value of ['ESC" ENDIF', 'ESC%%', 'ESC\n', '', '<script>', 'a'.repeat(81)]) {
    const m = clone(original);
    m.fields[0].options.push({ label: 'Unsafe', value });
    assert.throws(() => C.render(m), /option values/);
  }
  for (const change of [
    (m) => (m.source += '<p>Visible</p>'),
    (m) => (m.source = m.source.replace(']%%', 'RaiseError("bad", true) ]%%')),
    (m) => (m.source = m.source.replace('@BrandKey', '@WrongKey')),
    (m) => (m.fields[0].enabled = false),
    (m) => (m.fields[0].type = 'text'),
    (m) => m.fields.push({ ...m.fields[0], id: 'duplicate' }),
  ]) {
    const m = clone(original);
    change(m);
    assert.throws(() => C.render(m));
  }
});
test('editor summary uses readable labels, escapes markup and never enters email content', () => {
  const m = clone(original);
  m.name = '<img src=x>';
  m.fields[0].label = '<b>Brand</b>';
  m.fields[0].options[0].label = 'ESC & partners';
  const output = C.render(m),
    summary = C.settingsSummary(m, output);
  assert.match(summary, /Selected brand/);
  assert.match(summary, /ESC &amp; partners/);
  assert.match(summary, /&lt;img/);
  assert.doesNotMatch(summary, /<img|<b>/);
  assert.doesNotMatch(output, /Editor only|<div|partners/);
  assert.equal(C.settingsSummary({ settingsOnly: false }, '<p>Unchanged</p>'), '<p>Unchanged</p>');
});
test('new footer choice overrides categories while preserving the legacy fallback', () => {
  const setup = fs.readFileSync(
    path.join(root, 'integrations/esc/email-settings/ESC_SNIP_Master_Setup.ampscript'),
    'utf8',
  );
  assert.match(setup, /IF NOT EMPTY\(@FooterLogoMode\) THEN[\s\S]*ELSEIF @EmailType == "COUNCIL"/);
  assert.match(setup, /@FooterLogoMode != "BRAND" AND @FooterLogoMode != "ESC"/);
  assert.match(setup, /IF @FooterLogoMode == "ESC" THEN\s+SET @UseESCFooter = "true"/);
  assert.match(setup, /SET @FooterURL = @DefaultESCURL/);
  assert.match(setup, /LookupRows\("BrandSettings", "BrandKey", @BrandKey\)/);
  const email = fs.readFileSync(
    path.join(root, 'integrations/esc/email-settings/ESC-Email-Example.html'),
    'utf8',
  );
  const init = email.indexOf('ContentBlockByKey("ESC_SNIP_Master_Setup")');
  assert.ok(email.indexOf('SET @FooterLogoMode') < init);
  assert.ok(email.indexOf('%%=v(@PrimaryColour)=%%') > init);
  assert.doesNotMatch(email.slice(0, email.indexOf('</head>')), /%%/);
});
test('exported settings editor saves through the real SDK and restores both selections', async () => {
  const { Window } = await import('happy-dom');
  const page = path.join(root, 'docs/clients/esc/email-settings/modules/email-settings/index.html');
  const html = fs.readFileSync(page, 'utf8');
  const bundle = path.resolve(path.dirname(page), html.match(/<script[^>]+src="([^"]+)"/)[1]);
  let stored = {},
    content = '',
    summary = '';
  async function open(edit) {
    const dom = new Window({
      settings: {
        disableJavaScriptEvaluation: true,
        disableCSSFileLoading: true,
        disableJavaScriptFileLoading: true,
      },
    });
    try {
      dom.document.write(html);
      const queue = [],
        listeners = [],
        timers = new Map();
      let serial = 0,
        closeHandler;
      const origin = 'https://mc.s7.exacttarget.com';
      const window = {
        location: { origin: 'https://example.github.io' },
        parent: { postMessage: (data) => queue.push(data) },
        addEventListener: (name, fn) => {
          if (name === 'message') listeners.push(fn);
        },
        getSelection: dom.getSelection.bind(dom),
      };
      const context = vm.createContext({
        window,
        document: dom.document,
        DOMParser: dom.DOMParser,
        NodeFilter: dom.NodeFilter,
        CustomEvent: dom.CustomEvent,
        URL,
        crypto: require('node:crypto').webcrypto,
        console,
        setTimeout: (fn, ms) => {
          const id = ++serial;
          timers.set(id, { fn, ms });
          return id;
        },
        clearTimeout: (id) => timers.delete(id),
      });
      vm.runInContext(fs.readFileSync(bundle, 'utf8'), context);
      const pump = () => {
        while (queue.length) {
          const message = queue.shift();
          let payload;
          if (message.method === 'handShake') {
            listeners.forEach((fn) => fn({ origin, data: { method: 'handShake', origin } }));
            continue;
          }
          if (message.method === 'getData') payload = stored;
          if (message.method === 'getContent') payload = content;
          if (message.method === 'setData')
            payload = stored = JSON.parse(JSON.stringify(message.payload));
          if (message.method === 'setContent') payload = content = message.payload;
          if (message.method === 'setSuperContent') payload = summary = message.payload;
          listeners.forEach((fn) => fn({ origin, data: { id: message.id, payload } }));
        }
      };
      pump();
      const controls = dom.document.querySelectorAll('select');
      assert.equal(controls.length, 2);
      assert.equal(controls[0].value, edit ? 'ESC' : 'WG-CP');
      assert.equal(
        controls[0].querySelector('option[value="WG-CP"]').textContent,
        'Working group: Cardiovascular pharmacotherapy',
      );
      if (edit) {
        controls[0].value = 'WG-CP';
        controls[0].dispatchEvent(new dom.Event('change'));
        controls[1].value = 'ESC';
        controls[1].dispatchEvent(new dom.Event('change'));
      } else assert.equal(controls[1].value, 'ESC');
      for (const [id, t] of [...timers])
        if (t.ms === 200) {
          timers.delete(id);
          t.fn();
          pump();
        }
      assert.equal(content, '%%[\nSET @BrandKey = "WG-CP"\nSET @FooterLogoMode = "ESC"\n]%%');
      assert.match(summary, /Working group: Cardiovascular pharmacotherapy/);
      assert.equal(stored.studio.values.brand, 'WG-CP');
      assert.match(summary, /Editor only/);
      assert.match(summary, /Footer logo: <strong>ESC/);
      assert.equal(stored.studio.values['footer-logo'], 'ESC');
      assert.equal(
        dom.document.getElementById('status').textContent,
        edit ? 'Saved in Content Builder' : 'Ready to edit',
      );
    } finally {
      await dom.happyDOM.close();
    }
  }
  await open(true);
  await open(false);
});

test('all 31 supported brand keys render exactly with either explicit footer choice', () => {
  const keys =
    'ACNAP,ACVC,EACVI,EAPC,EAPCI,EHRA,ESC,HFA,E365,C-CS,C-CP,C-CO,C-Gen,C-H,C-S,C-VHD,WG-ACHD,WG-PVD,WG-AVB,WG-CCE,WG-CP,WG-CRRM,WG-CS,WG-CBH,WG-CPM,WG-DAP,WG-EC,WG-MF,WG-MPD,WG-PCRVF,WG-T'.split(
      ',',
    );
  assert.deepEqual(original.fields[0].options.map((o) => o.value).sort(), [...keys].sort());
  for (const brand of keys)
    for (const footer of ['BRAND', 'ESC']) {
      const html = C.render(original, { brand, 'footer-logo': footer });
      assert.equal(
        html,
        '%%[\nSET @BrandKey = "' + brand + '"\nSET @FooterLogoMode = "' + footer + '"\n]%%',
      );
    }
});

test('settings mode participates in undo, dirty-state detection and exported-content recovery', () => {
  const H = require('../src/history.js');
  const m = clone(original),
    history = H.create();
  history.track(m);
  m.settingsOnly = false;
  assert.equal(H.hasRecoveryChanges(m), true);
  history.capture(m);
  history.undo(m);
  assert.equal(m.settingsOnly, true);
  assert.equal(H.hasRecoveryChanges(m), false);
  history.redo(m);
  assert.equal(m.settingsOnly, false);
  H.restoreExportedContent(m);
  assert.equal(m.settingsOnly, true);
  assert.equal(C.render(m), C.render(original));
});

test('confirmed council names retain keys and the non-working brand is rejected', () => {
  const options = original.fields[0].options;
  assert.equal(
    options.find((o) => o.value === 'C-CS').label,
    'Council: Basic Cardiovascular Science',
  );
  assert.equal(
    options.find((o) => o.value === 'C-Gen').label,
    'Council: Generic (ESC Councils banner)',
  );
  assert.ok(!options.some((o) => o.value === 'C-CG'));
  assert.throws(() => C.render(original, { brand: 'C-CG' }), /configured dropdown/);
});
