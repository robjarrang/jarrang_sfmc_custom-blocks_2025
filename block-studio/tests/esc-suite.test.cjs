const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const JSZip = require('../vendor/jszip.min.js');
const root = path.resolve(__dirname, '../..');
const projects = ['newsletter', 'congress'].map((t) =>
  JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/' + t + '.jarrang.json'))),
);
async function environment() {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  const context = vm.createContext({
    window: { getSelection: dom.getSelection.bind(dom) },
    document: dom.document,
    DOMParser: dom.DOMParser,
    URL,
    JSZip,
    Uint8Array,
    btoa,
    crypto: require('node:crypto').webcrypto,
    setTimeout,
    clearTimeout,
  });
  for (const file of [
    'logic',
    'runtime-core',
    'html-validation',
    'core',
    'maintenance',
    'workspace',
    'quick-edit',
    'block-icons',
    'export-assets',
    'exporter',
    'rich-editor',
    'controls',
    'field-catalog',
    'template-rules',
    'field-transforms',
    'field-editor',
    'code-editor',
    'repeat-builder',
  ])
    vm.runInContext(
      fs.readFileSync(path.join(root, 'block-studio/src/' + file + '.js'), 'utf8'),
      context,
    );
  return { ...context.window, dom };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
test('dropdown arrow wrapper preserves native selection, labels and change handling', async () => {
  const { dom, BlockControls } = await environment();
  try {
    const container = dom.document.createElement('div');
    dom.document.body.append(container);
    const values = {};
    const changes = [];
    const refs = BlockControls.mount(
      container,
      [
        {
          id: 'theme',
          label: 'Theme',
          type: 'select',
          defaultValue: 'light',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
        },
      ],
      values,
      (field, value) => changes.push([field.id, value]),
      { prefix: 'test-' },
    );
    const select = refs.get('theme').input;
    assert.equal(select.tagName, 'SELECT');
    assert.equal(select.parentElement.className, 'select-control');
    assert.equal(container.querySelector('label').htmlFor, select.id);
    assert.equal(select.id, 'test-theme');
    assert.equal(select.value, 'light');
    select.value = 'dark';
    select.dispatchEvent(new dom.Event('change', { bubbles: true }));
    assert.equal(values.theme, 'dark');
    assert.deepEqual(changes, [['theme', 'dark']]);
    const css = fs.readFileSync(path.join(root, 'block-studio/src/controls.css'), 'utf8');
    assert.match(css, /padding-right: 40px/);
    assert.match(css, /right: 16px/);
    assert.match(css, /pointer-events: none/);
    assert.match(css, /forced-colors: active/);
  } finally {
    await dom.happyDOM.close();
  }
});
const landscapePlaceholder =
  'https://image.info.escardio.org/lib/fe89127277620d7570/m/1/4fcce3d7-6f50-466b-a889-68d38120a9f9.jpg';
const click = (container, text) => {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent === text);
  assert.ok(button, 'Button: ' + text);
  button.click();
};
const labelled = (container, text) => {
  const label = [...container.querySelectorAll('label')].find((l) => l.textContent === text);
  assert.ok(label, 'Label: ' + text);
  return container.querySelector('#' + label.htmlFor);
};
test('ESC landscape defaults use the supplied placeholder without changing optional image behaviour', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const excluded = new Set(['journal-section', 'signature', 'speaker-grid', 'sponsor']);
    let defaults = 0;
    for (const p of projects)
      for (const m of p.modules) {
        for (const f of m.fields.filter((f) => f.type === 'image')) {
          if (!f.defaultValue) continue;
          if (excluded.has(m.slug) || (m.slug === 'lead-editorial' && f.id === 'field5')) {
            assert.notEqual(f.defaultValue, landscapePlaceholder);
            continue;
          }
          assert.equal(f.defaultValue, landscapePlaceholder, m.slug + ': ' + f.id);
          assert.equal(f.originalValue, landscapePlaceholder);
          for (const t of f.targets)
            assert.equal(m.source.slice(t.start, t.end), landscapePlaceholder);
          defaults++;
        }
      }
    const editorial = projects[0].modules.find((m) => m.slug === 'editorials');
    const list = editorial.fields.find((f) => f.type === 'list');
    assert.equal(list.defaultValue[0].image, landscapePlaceholder);
    defaults++;
    assert.equal(list.defaultValue[1].image, '');
    assert.equal(list.defaultValue[2].image, '');
    assert.equal(list.itemFields.find((f) => f.key === 'image').defaultValue, '');
    assert.equal(defaults, 20);
    const lead = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    assert.equal(lead.fields.find((f) => f.id === 'field10').defaultValue, '');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(lead);
    assert.equal(
      host.querySelector('.esc-lead-visual-desktop').getAttribute('src'),
      landscapePlaceholder,
    );
    assert.equal(
      host.querySelector('.esc-lead-visual-mobile').getAttribute('src'),
      landscapePlaceholder,
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC plain-text defaults, repeater rows and guidance contain decoded characters', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const check = (value, label) => {
      if (typeof value === 'string') assert.equal(value, C.decode(value), label);
    };
    const checkFields = (fields, module) => {
      for (const f of fields) {
        check(f.label, module + ': label');
        check(f.help, module + ': help');
        if (f.type === 'text') {
          check(f.defaultValue, module + ': ' + f.id + ' default');
          check(f.originalValue, module + ': ' + f.id + ' original');
        }
        if (f.type === 'list') {
          checkFields(f.itemFields, module);
          for (const key of ['defaultValue', 'originalValue'])
            for (const row of Array.isArray(f[key]) ? f[key] : [])
              for (const child of f.itemFields.filter((child) => child.type === 'text'))
                check(row[child.key], module + ': ' + f.id + '.' + child.key);
        }
      }
    };
    for (const p of projects)
      for (const m of p.modules) {
        checkFields(m.fields, m.slug);
        const host = dom.document.createElement('div');
        host.innerHTML = C.render(m);
        assert.doesNotMatch(host.textContent, /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i, m.slug);
      }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC punctuation remains readable after editing mapped fields and adding repeating rows', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const text = (m, values) => {
      const host = dom.document.createElement('div');
      host.innerHTML = C.render(m, values);
      return host.textContent;
    };
    for (const [template, slug, fieldId, expected] of [
      [0, 'journal-section', 'field6', 'Volume 121 Issue 15 • 9 December 2025'],
      [0, 'quote', 'field1', '“Add a quotation or editorial callout here.”'],
      [0, 'social-block', 'field3', 'View post →'],
      [1, 'deadlines-list', 'field2', 'Don’t miss these deadlines'],
      [1, 'lead-editorial', 'field2', '28 Aug – 31 Aug 2026'],
      [1, 'lead-poster', 'field4', '23 – 25 Apr 2026'],
    ]) {
      const m = projects[template].modules.find((m) => m.slug === slug);
      assert.equal(m.fields.find((f) => f.id === fieldId).defaultValue, expected);
      assert.ok(text(m, {}).includes(expected), slug + ': default');
      assert.ok(text(m, { [fieldId]: expected + '!' }).includes(expected + '!'), slug + ': edited');
    }
    const m = projects[1].modules.find((m) => m.slug === 'deadlines-list');
    const list = m.fields.find((f) => f.type === 'list');
    const rows = clone(list.defaultValue);
    rows.push(Object.fromEntries(list.itemFields.map((f) => [f.key, f.defaultValue])));
    const result = text(m, { [list.id]: rows });
    for (const label of ['Submit ›', 'Register ›', 'Book ›', 'Submit\u00a0›'])
      assert.ok(result.includes(label), label);
  } finally {
    await dom.happyDOM.close();
  }
});
test('plain-text escaping preserves intentionally literal entities and prevents HTML injection', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    const value = 'A & B <b>text</b> &ndash;';
    const output = C.render(m, { field2: value });
    assert.ok(output.includes('A &amp; B &lt;b&gt;text&lt;/b&gt; &amp;ndash;'));
    const host = dom.document.createElement('div');
    host.innerHTML = output;
    assert.ok(host.textContent.includes(value));
    assert.equal(host.querySelector('b'), null);
  } finally {
    await dom.happyDOM.close();
  }
});
test('congress landscape header retains side-by-side composition and proportional imagery', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    const content = host.querySelector('.esc-lead-content');
    const visual = host.querySelector('.esc-lead-visual');
    assert.equal(content.parentElement, visual.parentElement, 'shared desktop row');
    assert.equal(content.nextElementSibling, visual);
    assert.equal(content.getAttribute('width'), '320');
    assert.equal(visual.getAttribute('width'), '300');
    assert.equal(visual.getAttribute('valign'), 'middle');
    assert.equal(visual.style.verticalAlign, 'middle');
    const frame = visual.querySelector('.esc-lead-image-frame');
    assert.equal(frame.getAttribute('width'), '274');
    assert.equal(frame.style.width, '274px');
    assert.equal(frame.style.maxWidth, '', 'master template can expand the frame on mobile');
    const desktop = visual.querySelector('.esc-lead-visual-desktop');
    assert.equal(desktop.getAttribute('width'), '274', 'explicit Outlook display width');
    assert.equal(desktop.getAttribute('height'), '156', 'whole-pixel Outlook height');
    assert.equal(desktop.style.height, 'auto');
    assert.equal(desktop.style.maxHeight, '');
    assert.equal(desktop.style.width, '100%');
    assert.equal(desktop.style.maxWidth, '274px');
    assert.equal(desktop.style.borderRadius, '8px');
    assert.equal(desktop.src, landscapePlaceholder);
    assert.match(m.source, /<!--\[if !mso\]><!-->.*esc-lead-visual-mobile/s);
    assert.match(m.source, /%%=v\(@PrimaryColour\)=%%/);
    assert.match(m.source, /%%=v\(@TextOnPrimaryColour\)=%%/);
    assert.ok(host.querySelector('.esc-lead-organiser-table'));
    assert.equal(C.htmlProblems(m).length, 0);
  } finally {
    await dom.happyDOM.close();
  }
});
test('congress image fallback honours saved mobile values and keeps URLs and alt text escaped', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const p = projects[1];
    const m = p.modules.find((m) => m.slug === 'lead-editorial');
    // Use the actual serialised definition consumed by an existing SFMC block.
    const page = E.moduleHtml(E.themedModule(p, m));
    const definition = JSON.parse(page.match(/id="block-definition">([\s\S]*?)<\/script>/)[1]);
    const check = (values, src, alt) => {
      const output = C.render(definition, values);
      const host = dom.document.createElement('div');
      host.innerHTML = output.replace(/<!--\[if !mso\]><!-->|<!--<!\[endif\]-->/g, '');
      const mobile = host.querySelector('.esc-lead-visual-mobile');
      assert.equal(mobile.getAttribute('src'), src);
      assert.equal(mobile.getAttribute('alt'), alt);
      assert.equal(mobile.hasAttribute('onerror'), false);
      assert.equal(
        host.querySelector('.esc-lead-visual-desktop').getAttribute('src'),
        values.field8,
      );
      assert.doesNotMatch(output, /\{%|\{\{/);
    };
    const main = {
      field8: 'https://example.com/1920x1080.jpg?a=1&b=2',
      field9: 'Congress "2026" & science',
    };
    check(main, main.field8, main.field9);
    check({ ...main, field10: '', field11: 'Old mobile caption' }, main.field8, main.field9);
    check(
      { ...main, field10: 'https://example.com/mobile.jpg', field11: 'Mobile "visual"' },
      'https://example.com/mobile.jpg',
      'Mobile "visual"',
    );
    check(
      { ...main, field10: 'https://example.com/mobile.jpg', field11: '' },
      'https://example.com/mobile.jpg',
      '',
    );
    assert.equal(definition.fields.length, 18);
    assert.equal(definition.id, 'c5a8e174-6d3b-4f92-8a5c-1e7d9b4f2a86');
    assert.equal(definition.slug, 'lead-editorial');
    assert.equal(definition.release, '1.0.0');
  } finally {
    await dom.happyDOM.close();
  }
});
test('newsletter story cards use proportional images in every light and dark variant', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    for (const m of projects[0].modules.filter((m) =>
      ['story-card-2col', 'story-card-3col'].includes(m.slug),
    )) {
      const images = [...m.source.matchAll(/<img\b(?:[^>"]|"[^"]*")*>/g)].map((match) => match[0]);
      assert.ok(images.length >= 4);
      for (const image of images) {
        // Outlook uses the height attribute; every other client keeps the inline height: auto.
        assert.match(
          image,
          /\sheight="\{% if (card\d_image_height) > 0 %\}\{\{ \1 \}\}\{% else %\}\d+\{% endif %\}"/,
        );
        assert.match(image, /height: auto;/);
        assert.match(image, /\swidth="\d+"/);
      }
      assert.equal(C.htmlProblems(m).length, 0);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC headings and CTAs can be left blank without rendering empty headings or links', async () => {
  const { BlockCore: C, dom } = await environment();
  const escTv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  try {
    const output = dom.document.createElement('div');
    for (const [project, slug, heading, label, url, cta] of [
      [projects[0], 'story-card-1col', 'field6', 'field11', 'field10', '.news-card-link'],
      [projects[0], 'cta', 'field1', 'field4', 'field3', '.esc-btn-white'],
      [projects[1], 'story-2col', 'field5', 'field7', 'field1', '.news-card-link'],
      [escTv, 'esc-tv-story-card', 'headline', 'button_text', 'button_link', '.esc-btn'],
    ]) {
      const module = project.modules.find((item) => item.slug === slug);
      const definition = module.exportedDefinition;
      const field = (key) => definition.fields.find((item) => (item.key || item.id) === key);
      const render = (values) => (output.innerHTML = C.render(definition, values));
      render({});
      const links = output.querySelectorAll(cta).length;
      const headings = output.querySelectorAll('h1, h2, h3').length;
      const images = output.querySelectorAll('img').length;
      assert.ok(links > 0 && headings > 0, slug);
      for (const missing of [label, url]) {
        assert.equal(C.validate(field(heading), ''), '', slug);
        assert.equal(C.validate(field(missing), ''), '', slug);
        render({ [field(heading).id]: '', [field(missing).id]: '' });
        assert.equal(output.querySelectorAll(cta).length, links - 1, slug);
        assert.equal(output.querySelectorAll('h1, h2, h3').length, headings - 1, slug);
        assert.equal(output.querySelectorAll('img').length, images, slug);
        assert.ok(!output.querySelector('a[href=""]'), slug);
      }
    }

    const links = projects[0].modules.find((module) => module.slug === 'link-list');
    const list = links.fields.find((field) => field.key === 'items');
    for (const rows of [[], [{ ...list.defaultValue[0], link_text: '' }]]) {
      assert.equal(C.validate(list, rows), '');
      assert.doesNotMatch(
        C.render(links.exportedDefinition, { [list.id]: rows }),
        /class="text-link"/,
      );
    }

    const events = projects[0].modules.find((module) => module.slug === 'events');
    const eventFieldId = (key) => events.fields.find((field) => field.key === key).id;
    output.innerHTML = C.render(events.exportedDefinition, {
      [eventFieldId('intro_title')]: '',
      [eventFieldId('intro_subtitle')]: 'Event details',
    });
    assert.ok(!output.querySelector('h2.events-title'));
    assert.match(output.textContent, /Event details/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('Congress Attribution supports a brand logo, custom logo and text-only layout', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[1].modules.find(
    (module) => module.slug === 'attribution',
  );
  const output = dom.document.createElement('div');
  try {
    output.innerHTML = C.render(definition, { field1: 'Previously saved body text' });
    assert.equal(output.querySelector('.attribution-title').textContent.trim(), 'Organised by');
    const body = output.querySelector('.attribution-text');
    assert.equal(body.textContent.trim(), 'Previously saved body text');
    assert.equal(body.style.fontSize, '13px');
    assert.equal(body.style.lineHeight, '20px');
    assert.match(body.getAttribute('style'), /mso-line-height-rule: exactly/);
    const brandLogo = output.querySelector('a > img');
    assert.equal(brandLogo.getAttribute('src'), '%%=v(@LogoURL)=%%');
    assert.equal(brandLogo.getAttribute('alt'), '%%=v(@BrandName)=%%');
    assert.equal(brandLogo.parentElement.getAttribute('href'), '%%=RedirectTo(@BrandURL)=%%');

    const values = {
      attribution_heading: 'Supported by Heart & Science',
      field1: '',
      attribution_logo: 'https://example.com/logo.png',
      attribution_logo_alt: 'Heart & Science logo',
    };
    output.innerHTML = C.render(definition, values);
    assert.equal(
      output.querySelector('.attribution-title').textContent.trim(),
      values.attribution_heading,
    );
    assert.ok(!output.querySelector('.attribution-text, a'));
    assert.equal(output.querySelector('img').getAttribute('src'), values.attribution_logo);
    assert.equal(output.querySelector('img').getAttribute('alt'), values.attribution_logo_alt);

    const href = 'https://example.com/organiser';
    output.innerHTML = C.render(definition, { ...values, attribution_logo_link: href });
    assert.equal(output.querySelector('a > img').parentElement.getAttribute('href'), href);
    assert.doesNotMatch(output.innerHTML, /%%=/);
    const textOnly = C.render(definition, {
      ...values,
      field1: 'Body copy',
      attribution_logo_link: href,
      show_attribution_logo: 'hidden',
    });
    output.innerHTML = textOnly;
    assert.equal(output.querySelector('.attribution-text').textContent.trim(), 'Body copy');
    assert.ok(!output.querySelector('img, a'));
    assert.doesNotMatch(textOnly, /height:16px/);
    assert.doesNotMatch(
      C.render(definition, { field1: '', show_attribution_logo: 'hidden' }),
      /height:8px/,
    );
    assert.equal(
      C.render(definition, {
        attribution_heading: '',
        field1: '',
        show_attribution_logo: 'hidden',
      }),
      '',
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC text links and button styles preserve the entered casing', async () => {
  const { BlockCore: C, dom } = await environment();
  const escTv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  try {
    for (const project of [...projects, escTv]) {
      for (const module of project.modules) {
        const source = module.exportedDefinition.source;
        const nodes = C.parse(source).nodes;
        const textLinks = nodes.filter(
          (node) =>
            node.tag === 'a' && !/<img\b/i.test(source.slice(node.innerStart, node.innerEnd)),
        );
        for (const node of nodes) {
          if (!textLinks.some((link) => node.start <= link.start && node.end >= link.end)) continue;
          assert.doesNotMatch(
            source.slice(node.start, node.innerStart),
            /text-transform:\s*(?:uppercase|lowercase|capitalize)\b/i,
            module.slug,
          );
        }
      }
    }

    const hero = projects[0].modules.find((module) => module.slug === 'hero-story');
    const buttonText = hero.fields.find((field) => field.key === 'button1_text');
    const label = 'Join ESC today';
    const output = dom.document.createElement('div');
    output.innerHTML = C.render(hero.exportedDefinition, { [buttonText.id]: label });
    assert.equal(output.querySelector('.esc-btn a, .esc-btn-outline a').textContent, label);
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC text CTAs use fixed red in both layout themes while brand buttons retain their colours', async () => {
  const { BlockCore: C, dom } = await environment();
  const suites = [
    [
      projects[0],
      [
        'story-card-1col',
        'story-card-2col',
        'story-card-3col',
        'feature-card',
        'link-list',
        'social-block',
        'editorials',
      ],
    ],
    [projects[1], ['conversation', 'deadlines-list', 'story-2col']],
    [
      JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json'))),
      ['esc-tv-2-col'],
    ],
  ];
  try {
    const output = dom.document.createElement('div');
    for (const [project, slugs] of suites) {
      for (const slug of slugs) {
        const module = project.modules.find((candidate) => candidate.slug === slug);
        const theme = module.fields.find((field) => field.key === 'theme');
        const deadlines = module.fields.find((field) => field.key === 'deadlines');
        const values = deadlines
          ? {
              [deadlines.id]: [
                {
                  ...deadlines.defaultValue[0],
                  link_text: 'Submit',
                  link_url: 'https://example.com/',
                },
              ],
            }
          : {};
        for (const option of theme ? theme.options : [{ value: 'default' }]) {
          if (theme) values[theme.id] = option.value;
          output.innerHTML = C.render(module.exportedDefinition, values);
          const links = output.querySelectorAll(
            'a.news-card-link, a.text-link, a[style*="text-decoration: underline"]',
          );
          const label = `${slug} (${option.value})`;
          assert.ok(links.length, label);
          for (const link of links) {
            const style = link.getAttribute('style');
            assert.match(style, /(?:^|;\s*)color: #AE1022 !important;/, label);
            assert.match(style, /-webkit-text-fill-color: #AE1022 !important;/, label);
            assert.match(style, /text-decoration-color: #AE1022 !important;/, label);
          }
        }
      }
    }
    const membership = projects[0].modules.find((module) => module.slug === 'membership-card');
    output.innerHTML = C.render(membership.exportedDefinition);
    const profile = output.querySelector('a[href*="MemberProfileURL"]');
    assert.match(profile.getAttribute('style'), /(?:^|;\s*)color: #ffffff !important;/);
    assert.match(profile.getAttribute('style'), /text-decoration-color: #ffffff !important;/);
    assert.equal(profile.querySelector('font').getAttribute('color'), '#ffffff');

    const button = projects[1].modules.find((module) => module.slug === 'story-1col');
    output.innerHTML = C.render(button.exportedDefinition);
    assert.match(
      output.querySelector('.esc-btn a').getAttribute('style'),
      /color: %%=v\(@ButtonTextColour\)=%%;/,
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC default typography follows the shared scale and keeps exact four-pixel line heights', async () => {
  const { BlockCore: C, dom } = await environment();
  const escTv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  try {
    for (const project of [...projects, escTv]) {
      for (const module of project.modules) {
        for (const [, style] of module.source.matchAll(/\bstyle="([^"]*)"/g)) {
          for (const [, height] of style.matchAll(/(?:^|;)\s*line-height:\s*([^;]+)/g)) {
            const spacing = /^\{\{ ((?:top|bottom)_spacing) \}\}px$/.exec(height.trim());
            const heights = spacing
              ? module.fields
                  .find((field) => field.key === spacing[1])
                  .options.map((option) => option.value + 'px')
              : [height.trim()];
            for (const value of heights) {
              assert.match(value, /^(?:0|\d+px)(?:\s*!important)?$/, module.slug);
              const pixels = Number.parseInt(value, 10);
              assert.equal(pixels % 4, 0, module.slug);
              if (pixels > 0) assert.match(style, /mso-line-height-rule:\s*exactly/, module.slug);
            }
          }
        }
      }
    }

    const output = dom.document.createElement('div');
    for (const [project, slug, selector, size, height] of [
      [projects[0], 'hero-story', 'h1.hero-title', 28, 36],
      [projects[1], 'lead-poster', 'h1.esc-lead-title', 28, 36],
      [projects[0], 'decorative-header', '.masthead-title', 28, 36],
      [projects[0], 'decorative-header', '.masthead-title[style*="24px"]', 24, 32],
      [projects[0], 'checklist', 'h2', 20, 28],
      [projects[1], 'attribution', 'p.attribution-title', 20, 28],
      [projects[0], 'webinar-list', 'h3', 16, 24],
      [projects[0], 'editorials', 'p.dark-invert', 16, 24],
      [projects[0], 'story-card-3col', 'h3.news-card-title', 16, 24],
      [projects[0], 'text-block', 'p.dark-body', 13, 20],
      [projects[1], 'story-1col', 'p.story-excerpt', 13, 20],
      [escTv, 'esc-tv-story-card', 'p.news-card-text', 13, 20],
      [escTv, 'esc-tv-lead', '.esc-btn td', 13, 20],
      [projects[0], 'navigation', 'a.nav-link', 12, 16],
      [escTv, 'esc-tv-disclaimer', 'p', 12, 16],
    ]) {
      const module = project.modules.find((item) => item.slug === slug);
      output.innerHTML = C.render(module.exportedDefinition);
      const element = output.querySelector(selector);
      assert.ok(element, slug + ' ' + selector);
      assert.equal(element.style.fontSize, size + 'px', slug);
      assert.equal(element.style.lineHeight, height + 'px', slug);
    }

    for (const name of ['ESC-Email-Example', 'Brand-Dependent-Styles']) {
      const integration = fs.readFileSync(
        path.join(root, 'integrations/esc/email-settings/' + name + '.html'),
        'utf8',
      );
      assert.match(
        integration,
        /@media only screen and \(max-width:640px\)[^\n]*\.hero-title,\.masthead-title,\.esc-congress-lead \.esc-lead-title,\.esc-lead-poster \.esc-lead-title\{font-size:24px !important;line-height:32px !important\}/,
      );
    }

    const textBlock = projects[0].modules.find((module) => module.slug === 'text-block');
    const paragraph = textBlock.fields.find((field) => field.key === 'paragraph_1');
    output.innerHTML = C.render(textBlock.exportedDefinition, {
      [paragraph.id]: '<ul><li>List item</li></ul>',
    });
    const item = output.querySelector('li');
    assert.equal(item.style.fontSize, '13px');
    assert.equal(item.style.lineHeight, '20px');
    assert.match(item.getAttribute('style'), /mso-line-height-rule:exactly/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC Industry Team is conditional and sits by the Decorative Header logo', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const module = projects[0].modules.find((item) => item.slug === 'decorative-header');
    const output = dom.document.createElement('div');
    const branch = /%%\[ IF @CampaignLabel == "INDUSTRY" THEN \]%%([\s\S]*?)%%\[ ENDIF \]%%/g;
    const html = C.render(module.exportedDefinition);
    output.innerHTML = html.replace(branch, (_, markup) => markup);
    const pills = [...output.querySelectorAll('.esc-industry-pill')];
    assert.equal(pills.length, 2);
    for (const pill of pills) {
      assert.equal(pill.textContent, 'ESC Industry Team');
      assert.equal(pill.style.fontSize, '12px');
      assert.equal(pill.style.lineHeight, '16px');
      const placement = pill.closest('table').parentElement;
      assert.equal(placement.getAttribute('align'), 'right');
      assert.equal(placement.getAttribute('valign'), 'top');
      assert.ok(placement.previousElementSibling.querySelector('.header-light-logo'));
    }
    output.innerHTML = html.replace(branch, '');
    assert.equal(output.querySelector('.esc-industry-pill'), null);
    assert.equal(output.querySelectorAll('h1').length, 2);
    assert.equal(output.querySelector('.header-copy td[height="20"]').style.lineHeight, '20px');
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC Industry Team is conditional and shares the Congress title cell', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const output = dom.document.createElement('div');
    // Model this AMPscript branch locally. SFMC resolves the campaign variable when it renders.
    const branch =
      /%%\[ IF @CampaignLabel == "INDUSTRY" THEN \]%%([\s\S]*?)(?:%%\[ ELSE \]%%([\s\S]*?))?%%\[ ENDIF \]%%/g;
    for (const slug of ['lead-editorial', 'lead-poster']) {
      const module = projects[1].modules.find((item) => item.slug === slug);
      const html = C.render(module.exportedDefinition);
      output.innerHTML = html.replace(branch, (_, label) => label);
      const labels = [...output.querySelectorAll('.esc-industry-eyebrow')];
      assert.equal(labels.length, 1, slug);
      for (const label of labels) {
        assert.equal(label.textContent, 'ESC Industry Team');
        assert.equal(label.style.fontSize, '12px');
        assert.equal(label.style.lineHeight, '16px');
        const gap = label.nextElementSibling;
        assert.equal(gap.style.lineHeight, '4px');
        assert.equal(gap.nextElementSibling.tagName, 'H1');
      }
      output.innerHTML = html.replace(branch, (_, label, fallback) => fallback || '');
      assert.equal(output.querySelector('.esc-industry-eyebrow'), null, slug);
      assert.equal(output.querySelectorAll('h1').length, 1, slug);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('Newsletter text and section headings can centre and omit unused internal spacing', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const output = dom.document.createElement('div');
    const definition = (slug) =>
      projects[0].modules.find((module) => module.slug === slug).exportedDefinition;
    const text = definition('text-block');
    const single = {
      field1: '',
      field2: 'One paragraph',
      field3: '',
      top_spacing: '0',
      bottom_spacing: '0',
    };
    output.innerHTML = C.render(text, single);
    assert.equal(output.querySelector('p').closest('td').style.textAlign, 'left');
    assert.equal(output.querySelectorAll('div').length, 0);
    output.innerHTML = C.render(text, {
      ...single,
      field1: 'Heading',
      field3: '<div data-rich-align="right">Second paragraph</div>',
      text_alignment: 'center',
    });
    assert.equal(output.querySelector('h2').closest('td').getAttribute('align'), 'center');
    assert.equal(output.querySelectorAll('p')[1].style.textAlign, 'right');
    assert.deepEqual(
      [...output.querySelectorAll('div')].map((divider) => divider.style.lineHeight),
      ['16px', '16px'],
    );
    for (const theme of ['light', 'dark']) {
      output.innerHTML = C.render(definition('section-header'), {
        field1: theme,
        field2: '',
        text_alignment: 'center',
      });
      assert.equal(output.querySelector('h2').closest('td').style.textAlign, 'center');
      assert.equal(output.querySelector('.section-label'), null);
      assert.equal(output.querySelector('h2').previousElementSibling, null);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('Journal Section uses the shared mobile stacking and fluid image classes', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (module) => module.slug === 'journal-section',
  );
  try {
    const output = dom.document.createElement('div');
    const issueUrl = 'https://example.com/current-issue';
    output.innerHTML = C.render(definition, {
      field5: 'A different journal title',
      field7: issueUrl,
      field8: 'Read the current issue',
    });
    const cover = output.querySelector('td.block');
    const copy = cover.nextElementSibling;
    assert.ok(copy.classList.contains('block'));
    assert.ok(copy.firstElementChild.classList.contains('stack-gap'));
    assert.equal(cover.querySelector('img.fluid').getAttribute('width'), '110');
    assert.equal(copy.querySelector('h3').textContent, 'A different journal title');
    const details = copy.querySelector('p.dark-muted');
    assert.equal(details.style.fontSize, '13px');
    assert.equal(details.style.lineHeight, '20px');
    assert.match(details.getAttribute('style'), /mso-line-height-rule: exactly/);
    const button = copy.querySelector('.esc-btn');
    assert.match(button.getAttribute('style'), /width: auto !important/);
    assert.equal(button.querySelector('a').getAttribute('href'), issueUrl);
    assert.equal(button.querySelector('a').textContent.trim(), 'Read the current issue');
  } finally {
    await dom.happyDOM.close();
  }
});
test('Webinar List alternates row backgrounds and preserves independent webinar details', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (item) => item.slug === 'webinar-list',
  );
  const list = definition.fields.find((field) => field.id === 'webinars');
  const row = list.defaultValue[0];
  try {
    const output = dom.document.createElement('div');
    output.innerHTML = C.render(definition, {
      list_heading: 'November webinars',
      webinars: [
        { ...row, title: 'First webinar', image_height: '52', link: 'https://example.com/first' },
        {
          ...row,
          label: '',
          title: 'Second webinar',
          date: '',
          time: '12:00 CET',
          image: '',
          description: '<a href="https://example.com/details">More details</a>',
          link: '',
        },
        { ...row, title: 'Third webinar', image_height: '0', date: '', time: '', link: '' },
      ],
    });
    const rows = [...output.querySelectorAll('.webinar-row')];
    const [first, second, third] = rows;
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.firstElementChild.getAttribute('bgcolor')),
      ['#f2f2f2', null, '#f2f2f2'],
    );
    const heading = output.querySelector('.webinar-list-heading');
    assert.equal(heading.textContent, 'November webinars');
    assert.match(heading.style.fontFamily, /enra-slab-variable/);
    assert.equal(heading.style.lineHeight, '28px');
    assert.doesNotMatch(heading.parentElement.getAttribute('style'), /border-(top|bottom)/);
    assert.equal(first.querySelector('h3').textContent, 'First webinar');
    assert.equal(second.querySelector('h3').textContent, 'Second webinar');
    assert.equal(first.querySelector('img').getAttribute('width'), '48');
    assert.equal(first.querySelector('img').getAttribute('height'), '52');
    assert.equal(third.querySelector('img').getAttribute('height'), '48');
    assert.equal(third.querySelector('.webinar-schedule'), null);
    assert.equal(
      first.querySelector('.webinar-image a').getAttribute('href'),
      'https://example.com/first',
    );
    assert.equal(
      first.querySelector('.esc-btn a').getAttribute('href'),
      'https://example.com/first',
    );
    assert.equal(first.querySelector('.webinar-date').textContent, row.date);
    assert.equal(first.querySelector('.webinar-time').textContent, row.time);
    assert.equal(second.querySelector('img, .esc-btn, .webinar-date'), null);
    assert.equal(second.querySelector('.webinar-time').textContent, '12:00 CET');
    const copy = second.querySelector('.webinar-description');
    assert.equal(copy.style.fontSize, '13px');
    assert.equal(copy.style.lineHeight, '20px');
    assert.match(copy.querySelector('a').getAttribute('style'), /color:#ae1022 !important/i);
  } finally {
    await dom.happyDOM.close();
  }
});
test('Speaker Grid centres each portrait without a ring or background fill', async () => {
  const { BlockCore: C, dom } = await environment();
  const module = projects[0].modules.find((item) => item.slug === 'speaker-grid');
  const count = module.fields.find((field) => field.key === 'speaker_count');
  const image = module.fields.find((field) => field.key === 'speaker1_image');
  const alt = module.fields.find((field) => field.key === 'speaker1_image_alt');
  const portraitUrl = 'https://example.com/speaker.jpg';
  try {
    const output = dom.document.createElement('div');
    for (const option of count.options) {
      output.innerHTML = C.render(module.exportedDefinition, {
        [count.id]: option.value,
        [image.id]: portraitUrl,
        [alt.id]: 'Saved speaker name',
      });
      assert.equal(output.querySelector('.speaker-image-wrapper'), null);
      const portraits = [...output.querySelectorAll('img.speaker-image')];
      assert.equal(portraits.length, Number(option.value));
      assert.equal(portraits[0].getAttribute('src'), portraitUrl);
      assert.equal(portraits[0].getAttribute('alt'), 'Saved speaker name');
      for (const portrait of portraits) {
        const holder = portrait.closest('table');
        assert.equal(holder.getAttribute('align'), 'center');
        assert.equal(holder.getAttribute('width'), '100');
        assert.equal(holder.hasAttribute('bgcolor'), false);
        assert.equal(holder.style.backgroundColor, '');
        assert.match(portrait.getAttribute('style'), /(?:^|;\s*)border: 0;/);
        assert.equal(portrait.style.borderRadius, '50%');
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('Speaker Grid renders additional rows and an optional heading', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (item) => item.slug === 'speaker-grid',
  );
  try {
    const output = dom.document.createElement('div');
    for (const count of [15, 16, 17]) {
      const speakers = Array.from({ length: count }, (_, index) => ({
        name: 'Speaker ' + (index + 1),
      }));
      output.innerHTML = C.render(definition, { speakers, field2: '', field3: '', field4: '' });
      const rows = [...output.querySelectorAll('.speaker-grid-row')];
      assert.deepEqual(
        rows.map((row) => row.querySelectorAll('.speaker-card').length),
        count === 15 ? [3, 3, 3, 3, 3] : [3, 3, 3, 3, 3, count - 15],
      );
      assert.doesNotMatch(output.textContent, /faculty|Expert speakers sharing their insights/i);
      assert.match(rows.at(-1).textContent.trim(), new RegExp('Speaker ' + count + '$'));
      assert.equal(output.querySelector('img.speaker-image'), null);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('Speaker Grid shows only populated header fields and honours the retired heading switch', async () => {
  const { BlockCore: C, BlockControls, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (item) => item.slug === 'speaker-grid',
  );
  try {
    const blank = { field2: '', field3: '  ', field4: '' };
    const values = {
      field2: 'Old eyebrow',
      field3: 'Old title',
      field4: 'Old subtitle',
      show_heading: 'hidden',
    };
    const hidden = C.render(definition, blank);
    assert.equal(C.render(definition, values), hidden);
    const editor = dom.document.createElement('div');
    BlockControls.mount(editor, definition.fields, values, () => {});
    assert.equal(editor.querySelector('#show_heading'), null);
    for (const id of ['field2', 'field3', 'field4'])
      assert.equal(editor.querySelector('#' + id).value, '');
    const heading = editor.querySelector('#field3');
    heading.value = 'Faculty <2026>';
    heading.dispatchEvent(new dom.Event('input'));
    const updated = C.render(definition, values);
    assert.match(updated, /Faculty &lt;2026&gt;/);
    assert.doesNotMatch(updated, /Old eyebrow|Old subtitle/);
    assert.equal(values.field2, '');
    assert.equal(values.field4, '');
    assert.equal(C.render(definition, { ...values, field3: '' }), hidden);
  } finally {
    await dom.happyDOM.close();
  }
});
test('Speaker Grid allows long speaker details to wrap within fixed desktop columns', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (item) => item.slug === 'speaker-grid',
  );
  try {
    const output = dom.document.createElement('div');
    const speaker = {
      name: 'Schnabel'.repeat(12),
      role: 'CardiologyLead'.repeat(12),
      org: 'CardiovascularCentre'.repeat(12),
    };
    output.innerHTML = C.render(definition, {
      speakers: Array.from({ length: 5 }, () => speaker),
    });
    const rows = [...output.querySelectorAll('.speaker-grid-row')];
    assert.deepEqual(
      rows.map((row) =>
        [...row.querySelectorAll('.speaker-card')].map((cell) => cell.getAttribute('width')),
      ),
      [
        ['180', '180', '180'],
        ['280', '280'],
      ],
    );
    for (const row of rows) assert.equal(row.style.tableLayout, 'fixed');
    for (const text of output.querySelectorAll('.speaker-name, .speaker-role, .speaker-org')) {
      assert.match(text.getAttribute('style'), /word-wrap: break-word;/);
      assert.match(text.getAttribute('style'), /overflow-wrap: anywhere !important;/);
    }
    assert.equal(output.querySelector('.speaker-name').textContent, speaker.name);
    assert.equal(output.querySelector('.speaker-org').textContent, speaker.org);
  } finally {
    await dom.happyDOM.close();
  }
});
test('Checklist, CTA and Speaker Grid can tighten either adjoining edge independently', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const output = dom.document.createElement('div');
    const spacing = (definition, values) => {
      output.innerHTML = C.render(definition, values);
      const content = output.querySelector('.content-inner');
      const height = (el) => (el.tagName === 'DIV' ? el.style.height : '');
      return [height(content.firstElementChild), height(content.lastElementChild)];
    };
    for (const [slug, original, compact] of [
      ['checklist', ['32px', '32px'], ['16px', '16px']],
      ['cta', ['32px', '32px'], ['16px', '16px']],
      ['speaker-grid', ['40px', '24px'], ['20px', '12px']],
    ]) {
      const { exportedDefinition: definition } = projects[0].modules.find((m) => m.slug === slug);
      assert.deepEqual(spacing(definition, {}), original, slug);
      const top = definition.fields.find((field) => field.id === 'top_spacing').options[1].value;
      const bottom = definition.fields.find((field) => field.id === 'bottom_spacing').options[1]
        .value;
      assert.deepEqual(spacing(definition, { top_spacing: top }), [compact[0], original[1]]);
      assert.deepEqual(spacing(definition, { bottom_spacing: bottom }), [original[0], compact[1]]);
      assert.deepEqual(spacing(definition, { top_spacing: '0', bottom_spacing: '0' }), ['', '']);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('new ESC campaign blocks start with empty editor values and no sample email output', async () => {
  const { BlockCore: C, dom } = await environment();
  const tv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  try {
    const exceptions = new Set([
      'navigation',
      'membership-card',
      'signature',
      'spacer',
      'divider',
      'esc-tv-disclaimer',
    ]);
    const brandChrome = new Set(['decorative-header', 'attribution']);
    for (const project of [...projects, tv]) {
      for (const { exportedDefinition: definition } of project.modules) {
        const { blankStart, slug, fields } = definition;
        assert.equal(!!blankStart, !exceptions.has(slug), slug);
        if (!blankStart) continue;
        const values = Object.fromEntries(
          fields.map((field) => [field.id, C.starterField(field, blankStart)]),
        );
        const { html, issue } = C.renderDraft(definition, values);
        assert.equal(issue, '', slug);
        if (brandChrome.has(slug)) {
          assert.match(html, /%%=v\(@/);
          assert.doesNotMatch(
            html,
            /Your essential cardiology update|In collaboration with|https?:\/\//,
          );
        } else assert.equal(html, '', slug);
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC draft output omits incomplete rows and buttons while keeping the editor values', async () => {
  const { BlockCore: C, dom } = await environment();
  const draft = (project, slug) => {
    const { exportedDefinition: definition } = project.modules.find((item) => item.slug === slug);
    const values = Object.fromEntries(
      definition.fields.map((field) => [field.id, C.starterField(field, definition.blankStart)]),
    );
    return { definition, values };
  };
  try {
    const cta = draft(projects[0], 'cta');
    cta.values.field4 = 'Register for this webinar';
    assert.equal(C.renderDraft(cta.definition, cta.values).html, '');
    cta.values.field3 = 'editorial@example.com';
    assert.match(C.renderDraft(cta.definition, cta.values).html, /mailto:editorial@example.com/);
    const deadlines = draft(projects[1], 'deadlines-list');
    const list = deadlines.definition.fields.find((field) => field.type === 'list');
    const rows = deadlines.values[list.id];
    rows[0].date = '9 December';
    rows.push({ ...rows[0], date: '10 December', text: 'Registration closes' });
    const output = C.renderDraft(deadlines.definition, deadlines.values);
    assert.match(output.issue, /Item 1, Deadline text/);
    assert.match(output.html, /10 December/);
    assert.doesNotMatch(output.html, /9 December|Abstract submission/);
    assert.equal(rows[0].date, '9 December');
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC vertical spacer divs leave their background to the enclosing cell', () => {
  const remainingProjects = ['esc-tv', 'email-settings'].map((suite) =>
    JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/' + suite + '.jarrang.json'))),
  );
  for (const project of [...projects, ...remainingProjects]) {
    for (const module of project.modules) {
      for (const [, spacer] of module.source.matchAll(/<div\b([^>]*)>\s*&#8202;\s*<\/div>/gi)) {
        assert.doesNotMatch(
          spacer,
          /\bbgcolor\s*=|\bbackground(?:-color|-image)?\s*:/i,
          module.slug,
        );
      }
    }
  }
});
test('ESC structural spacer rows keep their Outlook heights and use the enclosing background', async () => {
  const { BlockCore: C, dom } = await environment();
  const cases = [
    [projects[0], 'hero-story', 32, 2, '#ffffff', 3],
    [projects[0], 'hero-story', 24, 1, '#ffffff', 1],
    [projects[0], 'spacer', 24, 1, '#ffffff', 3],
    [projects[0], 'decorative-header', 24, 1, '#ffffff', 1],
    [projects[1], 'lead-editorial', 28, 1, '#ae1022', 1],
    [projects[1], 'lead-poster', 20, 1, '#ffffff', 1],
  ];
  try {
    const output = dom.document.createElement('div');
    for (const [project, slug, height, count, colour, cells] of cases) {
      const module = project.modules.find((candidate) => candidate.slug === slug);
      output.innerHTML = C.render(module.exportedDefinition).replaceAll(
        '%%=v(@PrimaryColour)=%%',
        '#ae1022',
      );
      const selector = slug === 'decorative-header' ? 'td.header-spacer' : 'td';
      const spacers = [...output.querySelectorAll(selector + '[height="' + height + '"]')].filter(
        (cell) => cell.children.length === 0 && !cell.textContent.trim(),
      );
      assert.equal(spacers.length, count, slug);
      for (const spacer of spacers) {
        assert.match(spacer.getAttribute('style'), /mso-line-height-rule:\s*exactly/);
        assert.equal(spacer.style.height, height + 'px');
        assert.equal(spacer.style.lineHeight, height + 'px');
        const row = spacer.parentElement;
        assert.equal(row.cells.length, cells, slug);
        for (const cell of row.cells) {
          assert.equal(cell.hasAttribute('bgcolor'), false, slug);
          assert.equal(cell.style.backgroundColor, '', slug);
        }
        let surface = row.closest('table');
        while (surface && !surface.style.backgroundColor) {
          surface = surface.parentElement.closest('td, table');
        }
        assert.equal(surface?.getAttribute('bgcolor'), colour, slug);
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('landscape images give Windows Outlook an editable height divisible by 4', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    let images = 0;
    for (const p of projects)
      for (const m of p.modules) {
        const fields = m.fields.flatMap((f) => [f, ...(f.itemFields || [])]);
        for (const [tag, ref, auto] of m.source.matchAll(
          /<img\b[^>]*\sheight="(?:\{% if [^%]+%\}\d+)?\{% (?:if|elsif) ([\w.]+) > 0 %\}\{\{ \1 \}\}\{% else %\}(\d+)\{% endif %\}"[^>]*>/g,
        )) {
          if (/class="webinar-logo-image"/.test(tag)) continue;
          const width = Number(tag.match(/\swidth="(\d+)"/)[1]);
          assert.equal(Number(auto) % 4, 0, m.slug + ': ' + auto);
          assert.ok(Math.abs(Number(auto) - (width * 9) / 16) <= 2, m.slug + ': ' + auto);
          assert.match(tag, /height: auto;/);
          const field = fields.find((f) => f.key === ref.replace(/^item\./, ''));
          assert.equal(field.type, 'number');
          assert.equal(field.defaultValue, '0');
          images++;
        }
      }
    assert.equal(images, 25);
    const heights = (html) => [...html.matchAll(/<img\b[^>]*\sheight="(\d+)"/g)].map((m) => m[1]);
    const hero = projects[0].modules.find((m) => m.slug === 'hero-story');
    // Blocks saved before the height field existed fall back to the automatic height.
    const saved = Object.fromEntries(
      hero.fields.filter((f) => f.key !== 'hero_image_height').map((f) => [f.id, f.defaultValue]),
    );
    assert.deepEqual(heights(C.render(hero, saved)), ['328']);
    assert.deepEqual(heights(C.render(hero, { ...saved, hero_image_height: '324' })), ['324']);
    const editorials = projects[0].modules.find((m) => m.slug === 'editorials');
    const list = editorials.fields.find((f) => f.type === 'list');
    const row = { ...list.defaultValue[0], image: 'https://example.com/a.jpg' };
    delete row.image_height;
    assert.deepEqual(heights(C.render(editorials, { [list.id]: [row] })), ['84']);
    assert.deepEqual(
      heights(C.render(editorials, { [list.id]: [{ ...row, image_height: '96' }] })),
      ['96'],
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('partial export preserves other module drafts and reopens against the last exported definitions', async () => {
  const { BlockExport: E, BlockMaintenance: M, BlockWorkspace: W, dom } = await environment();
  try {
    const p = clone(projects[0]);
    p.modules[1].name += ' draft';
    p.modules[1].release = '99.0.0';
    p.modules[1].slug += '-draft';
    p.modules[1].source = '<!-- unexported -->' + p.modules[1].source;
    p.modules[1].draftSource = p.modules[1].source;
    delete p.modules[1].iconAssets;
    p.modules[1].iconColour = '#123456';
    const zip = await JSZip.loadAsync(
      await (
        await E.build(p, [p.modules[0]], { ...p.settings, fullTemplate: false })
      ).arrayBuffer(),
    );
    const files = [];
    for (const original of p.modules)
      for (const name of ['index.html', 'icon.png', 'dragIcon.png']) {
        const file =
          'docs/clients/esc/newsletter/modules/' + original.exportedDefinition.slug + '/' + name;
        const bytes = zip.file(file)
          ? await zip.file(file).async('nodebuffer')
          : fs.readFileSync(path.join(root, file));
        files.push({
          webkitRelativePath: 'repo/' + file,
          size: bytes.length,
          text: async () => bytes.toString(),
          arrayBuffer: async () =>
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        });
      }
    const text = await zip.file('projects/esc/newsletter.jarrang.json').async('string');
    files.push({
      webkitRelativePath: 'repo/projects/esc/newsletter.jarrang.json',
      size: text.length,
      text: async () => text,
    });
    const loaded = (await M.readRepository(files, W))[0];
    assert.equal(loaded.modules[1].source, p.modules[1].source);
    assert.equal(loaded.modules[1].name, p.modules[1].name);
    assert.equal(loaded.modules[1].slug, p.modules[1].slug);
    assert.equal(loaded.modules[1].release, '99.0.0');
    assert.match(M.problems(loaded.modules[1]).join(' '), /identity, folder and version/);
    assert.equal(loaded.modules[1].iconAssets, undefined);
    assert.equal(loaded.modules[1].iconColour, '#123456');
    assert.equal(loaded.modules[1].exportedDefinition.name, projects[0].modules[1].name);
    const originalPage = files.find((f) =>
      f.webkitRelativePath.endsWith('/' + projects[0].modules[1].slug + '/index.html'),
    );
    const originalText = await originalPage.text();
    originalPage.text = async () =>
      originalText.replace(/("name"\s*:\s*)"[^"]*"/, '$1"Changed outside Studio"');
    await assert.rejects(
      () => M.readRepository(files, W),
      /differ/,
      'draft folder edits must not skip verification of the registered page',
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('the last exported schema catches later removals without overwriting newer draft content', async () => {
  const { BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    const p = clone(projects[0]),
      m = p.modules[0];
    m.fields.push({
      id: 'new',
      key: 'new',
      type: 'text',
      label: 'New field',
      enabled: true,
      binding: 'template',
      targets: [],
      defaultValue: '',
      required: false,
      maxLength: 0,
    });
    const snapshot = clone(E.definition(m));
    m.name = 'Newer draft';
    M.recordExport(p, [snapshot]);
    assert.equal(m.name, 'Newer draft');
    assert.equal(m.exportedDefinition.name, snapshot.name);
    m.fields.pop();
    assert.match(M.problems(m).join(' '), /New field/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('text-to-rich-text conversion updates repeated values and expressions together', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    delete m.published;
    delete m.exportedDefinition;
    const list = m.fields.find((field) => field.type === 'list'),
      child = list.itemFields[0];
    list.defaultValue[0][child.key] = '<b>literal</b>';
    const before = C.render(m);
    let saved;
    F.open(m, list, (f, result) => (saved = result?.draft));
    const dialog = dom.document.querySelector('dialog');
    const type = labelled(dialog.querySelector('.item-field-card'), 'Item field type');
    type.value = 'richtext';
    type.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved, dialog.querySelector('[role=alert]').textContent);
    assert.equal(C.render(saved), before);
    assert.match(saved.source, new RegExp('item\\.' + child.key + ' \\| richtext'));
    const rows = clone(saved.fields.find((field) => field.id === list.id).defaultValue);
    rows[0][child.key] = '<strong>Bold</strong>';
    assert.match(C.render(saved, { [list.id]: rows }), /<strong>Bold<\/strong>/);
    assert.equal(list.defaultValue[0][child.key], '<b>literal</b>');
    dialog.remove();
    const rich = saved;
    const richList = rich.fields.find((field) => field.id === list.id);
    richList.defaultValue[0][child.key] = '<strong>Bold</strong><br>Next';
    F.open(rich, richList, (f, result) => (saved = result?.draft));
    const plainDialog = dom.document.querySelector('dialog');
    const plainType = labelled(plainDialog.querySelector('.item-field-card'), 'Item field type');
    plainType.value = 'text';
    plainType.dispatchEvent(new dom.Event('change', { bubbles: true }));
    assert.match(plainDialog.textContent, /removes formatting/);
    click(plainDialog, 'Save field');
    assert.equal(
      saved.fields.find((field) => field.id === list.id).defaultValue[0][child.key],
      'Bold\nNext',
    );
    assert.ok(!saved.source.includes('item.' + child.key + ' | richtext'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('item-key renames update references and rows atomically while published keys stay locked', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    F.open(
      m,
      m.fields.find((field) => field.type === 'list'),
      () => {},
    );
    let dialog = dom.document.querySelector('dialog');
    assert.equal(
      labelled(dialog.querySelector('.item-field-card'), 'Item template key').disabled,
      true,
    );
    dialog.remove();
    delete m.published;
    delete m.exportedDefinition;
    const before = C.render(m);
    let saved;
    F.open(
      m,
      m.fields.find((field) => field.type === 'list'),
      (f, result) => (saved = result?.draft),
    );
    dialog = dom.document.querySelector('dialog');
    const key = labelled(dialog.querySelector('.item-field-card'), 'Item template key');
    key.value = 'renamed_title';
    key.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved, dialog.querySelector('[role=alert]').textContent);
    assert.equal(C.render(saved), before);
    assert.match(saved.source, /item\.renamed_title/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('field-reference changes respect loop scope, literal strings and AMPscript', async () => {
  const { BlockFieldTransforms: T, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    const f = m.fields.find((field) => field.type === 'list'),
      next = clone(f);
    next.key = 'links';
    m.source =
      "%%[ SET @value = 'nav_links' ]%%{% for nav_links in nav_links %}{{ nav_links.title }}{% endfor %}";
    const updated = T.apply(m, f, next);
    assert.match(updated.source, /for nav_links in links/);
    assert.match(updated.source, /{{ nav_links.title }}/);
    assert.match(updated.source, /SET @value = 'nav_links'/);
    assert.equal(JSON.stringify(C.templateProblems(updated)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('formatted-text conversion cannot insert markup into an attribute connection', async () => {
  const { BlockFieldTransforms: T, BlockCore: C, dom } = await environment();
  try {
    const f = C.templateField({ fields: [] }, 'text', 'Label');
    f.key = 'label';
    f.defaultValue = 'Label';
    const m = {
      source: '<img alt="{{ label }}" src="https://example.com/a.png">',
      templateMode: true,
      fields: [f],
    };
    assert.throws(() => T.apply(m, f, { ...f, type: 'richtext' }), /HTML attribute/);
    assert.equal(m.fields[0].type, 'text');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repeater actions retain focus on the new, moved or neighbouring item', async () => {
  const { BlockControls: B, dom } = await environment();
  try {
    const nav = projects[0].modules.find((m) => m.slug === 'navigation');
    const f = clone(nav.fields.find((field) => field.type === 'list'));
    f.minItems = 0;
    f.maxItems = 10;
    f.defaultValue = f.defaultValue.slice(0, 1);
    const container = dom.document.createElement('div');
    dom.document.body.append(container);
    B.mount(container, [f], {}, () => {});
    const cards = () => [...container.querySelectorAll('.repeat-card')];
    const add = container.querySelector('.add-repeat-item');
    add.focus();
    add.click();
    assert.ok(cards()[1].contains(dom.document.activeElement));
    click(cards()[1], '↑');
    assert.ok(cards()[0].contains(dom.document.activeElement));
    click(cards()[0], 'Duplicate');
    assert.ok(cards()[1].contains(dom.document.activeElement));
    click(cards()[1], 'Remove');
    assert.ok(cards()[1].contains(dom.document.activeElement));
    while (cards().length) click(cards()[0], 'Remove');
    assert.equal(dom.document.activeElement, container.querySelector('.add-repeat-item'));
  } finally {
    await dom.happyDOM.close();
  }
});
test('every ESC conditional expression has a supported guided editor model', async () => {
  const { BlockTemplateRules: R, BlockLogic: L, dom } = await environment();
  try {
    let count = 0;
    const esctv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    for (const p of [...projects, esctv])
      for (const m of p.modules) {
        const rules = new Map(m.fields.flatMap((f) => R.rules(m, f)).map((r) => [r.start, r]));
        const conditions = [...m.source.matchAll(/{%\s*(?:if|elsif|elseif)\s+([\s\S]*?)%}/g)];
        assert.equal(rules.size, conditions.length, m.slug);
        for (const rule of rules.values()) {
          assert.ok(rule.model, m.slug + ': ' + rule.condition);
          const scope = Object.fromEntries(
            m.fields.map((f) => [
              f.key || f.id,
              f.type === 'toggle' ? f.defaultValue === 'shown' : f.defaultValue,
            ]),
          );
          for (const operand of rule.operands) {
            const parts = operand.path.split('.');
            if (parts.length === 2) {
              scope[parts[0]] ||= {};
              scope[parts[0]][parts[1]] =
                operand.field.defaultValue ?? (operand.field.type === 'boolean' ? true : 1);
            }
          }
          assert.equal(
            L.evaluate(R.expression(rule.model), scope),
            L.evaluate(rule.condition, scope),
          );
          count++;
        }
      }
    assert.ok(count > 0);
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC field settings and layout rules can be opened and saved without changing rendered content', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    for (const p of [
      ...projects,
      JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/email-settings.jarrang.json'))),
    ])
      for (const original of p.modules)
        for (const field of original.fields) {
          const m = clone(original);
          const before = C.render(m);
          let saved;
          F.open(m, field, (f, result) => {
            saved = result?.draft || {
              ...m,
              fields: m.fields.map((old) => (old.id === f.id ? f : old)),
            };
          });
          const dialog = dom.document.querySelector('dialog');
          click(dialog, 'Where it applies');
          click(dialog, 'Advanced');
          click(dialog, 'Save field');
          assert.ok(
            saved,
            m.slug + ' / ' + field.label + ': ' + dialog.querySelector('[role=alert]').textContent,
          );
          assert.equal(C.render(saved), before, m.slug + ' / ' + field.label);
          dialog.remove();
        }
  } finally {
    await dom.happyDOM.close();
  }
});
test('guided dropdown rule edits are transactional, change the correct branch and keep AMPscript', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'section-header'));
    const field = m.fields.find((f) => f.key === 'theme');
    const original = JSON.stringify(m);
    let saved;
    function edit() {
      F.open(m, field, (f, result) => {
        saved = result.draft;
      });
      const dialog = dom.document.querySelector('dialog');
      click(dialog, 'Where it applies');
      for (const card of dialog.querySelectorAll('.template-rule-card')) {
        const value = labelled(card, 'Compare with');
        value.value = 'light';
        value.dispatchEvent(new dom.Event('change', { bubbles: true }));
      }
      return dialog;
    }
    let dialog = edit();
    click(dialog, 'Cancel');
    assert.equal(JSON.stringify(m), original);
    assert.equal(saved, undefined);
    dialog.remove();
    dialog = edit();
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.equal(C.render(saved), C.render(m, { [field.id]: 'dark' }));
    assert.equal(JSON.stringify(m), original);
    assert.deepEqual(
      [...saved.source.matchAll(/%%[\s\S]*?%%/g)].map((m) => m[0]),
      [...m.source.matchAll(/%%[\s\S]*?%%/g)].map((m) => m[0]),
    );
  } finally {
    await dom.happyDOM.close();
  }
});
test('all ESC repeating groups support single-item conversion including counters and optional child content', async () => {
  const { BlockRepeatBuilder: B, BlockCore: C, dom } = await environment();
  try {
    for (const p of projects)
      for (const original of p.modules)
        for (const field of original.fields.filter((f) => f.type === 'list')) {
          const result = B.singleDraft(original, field.id, field.defaultValue.length - 1);
          const m = clone(original);
          const list = m.fields.find((f) => f.id === field.id);
          list.minItems = 0;
          list.defaultValue = [list.defaultValue.at(-1)];
          assert.equal(C.render(result.draft), C.render(m), original.slug + ' / ' + field.label);
          assert.equal(JSON.stringify(C.templateProblems(result.draft)), '[]');
        }
  } finally {
    await dom.happyDOM.close();
  }
});
test('guided combined, toggle and item-position rules save valid typed expressions', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(
      projects
        .flatMap((p) => p.modules)
        .find((m) => m.source.includes('show_format_badge and format_badge')),
    );
    const field = m.fields.find((f) => f.key === 'show_format_badge');
    let saved;
    F.open(m, field, (f, result) => {
      saved = result.draft;
    });
    let dialog = dom.document.querySelector('dialog');
    click(dialog, 'Where it applies');
    const card = dialog.querySelector('.template-rule-card');
    const join = labelled(card, 'Match conditions');
    join.value = 'or';
    join.dispatchEvent(new dom.Event('change', { bubbles: true }));
    const op = labelled(card, 'Condition');
    op.value = '==';
    op.dispatchEvent(new dom.Event('change', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.match(saved.source, /show_format_badge == true or format_badge/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
    dialog.remove();
    const nav = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    F.open(
      nav,
      nav.fields.find((field) => field.type === 'list'),
      (f, result) => {
        saved = result.draft;
      },
    );
    dialog = dom.document.querySelector('dialog');
    click(dialog, 'Where it applies');
    const numeric = labelled(dialog.querySelector('.template-rule-card'), 'Compare with');
    numeric.value = '2';
    numeric.dispatchEvent(new dom.Event('input', { bubbles: true }));
    click(dialog, 'Save field');
    assert.match(saved.source, /forloop.index > 2/);
    assert.equal(JSON.stringify(C.templateProblems(saved)), '[]');
    assert.equal(JSON.stringify(C.parse(C.render(saved)).issues), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repeated item guidance and validation can be edited through the field editor', async () => {
  const { BlockFieldEditor: F, BlockCore: C, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    const field = m.fields.find((field) => field.type === 'list');
    let saved;
    F.open(m, field, (f) => {
      saved = f;
    });
    const dialog = dom.document.querySelector('dialog');
    const card = dialog.querySelector('.item-field-card');
    const help = labelled(card, 'Help for your client');
    help.value = 'Keep the navigation label short.';
    help.dispatchEvent(new dom.Event('input', { bubbles: true }));
    const limit = labelled(card, 'Character limit');
    limit.value = '120';
    limit.dispatchEvent(new dom.Event('input', { bubbles: true }));
    click(dialog, 'Save field');
    assert.ok(saved);
    assert.equal(saved.itemFields[0].help, help.value);
    assert.equal(saved.itemFields[0].maxLength, 120);
    assert.match(C.validate(saved.itemFields[0], 'x'.repeat(121)), /120/);
    assert.notEqual(field.itemFields[0].help, help.value);
  } finally {
    await dom.happyDOM.close();
  }
});
test('every ESC rich-text field offers links and renders them in the fixed ESC red', async () => {
  const { BlockControls, BlockCore, dom } = await environment();
  const escTv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  const url = 'https://example.com/esc-rich-text';
  const copy = `<a href="${url}" style="color: #0000ff"><span style="color: #008000">Link text</span></a>`;
  try {
    for (const project of [...projects, escTv]) {
      for (const module of project.modules) {
        const fields = module.fields.filter((field) => field.type === 'richtext');
        if (!fields.length) continue;
        const page = fs.readFileSync(
          path.join(
            root,
            'docs/clients/esc',
            project.settings.templateSlug,
            'modules',
            module.slug,
            'index.html',
          ),
          'utf8',
        );
        const definition = JSON.parse(
          page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1],
        );
        for (const field of fields) {
          const label = `${module.slug}: ${field.label}`;
          const exported = definition.fields.find((candidate) => candidate.id === field.id);
          const editor = dom.document.createElement('div');
          BlockControls.mount(editor, [exported], { [field.id]: copy }, () => {});
          const button = editor.querySelector('button[aria-label="Add or edit link"]');
          assert.ok(button && !button.disabled, label);

          const output = dom.document.createElement('div');
          output.innerHTML = BlockCore.render(definition, { [field.id]: copy });
          const links = output.querySelectorAll(`a[href="${url}"]`);
          assert.ok(links.length, label);
          for (const link of links) {
            assert.match(
              link.getAttribute('style'),
              /^color:#ae1022 !important;-webkit-text-fill-color:#ae1022 !important;/,
              label,
            );
            assert.equal(link.innerHTML, 'Link text', label);
          }
        }
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Newsletter and Congress modules retain their exported definition and supplied PNG pair', async () => {
  const { BlockCore: C, BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    assert.equal(
      projects.reduce((n, p) => n + p.modules.length, 0),
      43,
    );
    for (const p of projects) {
      C.assertProject(p);
      for (const m of p.modules) {
        const folder = path.join(
          root,
          'docs/clients/esc',
          p.settings.templateSlug,
          'modules',
          m.slug,
        );
        const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
        const definition = JSON.parse(
          page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1],
        );
        assert.deepEqual(
          JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))),
          definition,
          m.slug,
        );
        assert.equal(JSON.stringify(E.problems(m)), '[]', m.slug);
        assert.equal(JSON.stringify(M.problems(m)), '[]', m.slug);
        for (const [key, name] of [
          ['icon', 'icon.png'],
          ['dragIcon', 'dragIcon.png'],
        ])
          assert.deepEqual(
            Buffer.from(m.iconAssets[key], 'base64'),
            fs.readFileSync(path.join(folder, name)),
          );
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC defaults, all dropdown options, both toggle states and repeater limits render', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    let cases = 0;
    for (const p of projects)
      for (const m of p.modules) {
        const before = JSON.stringify(m);
        const check = (values) => {
          const out = C.render(m, values);
          assert.ok(!/{[{%]/.test(out), m.slug);
          assert.equal(JSON.stringify(C.parse(out).issues), '[]', m.slug + ': rendered structure');
          cases++;
        };
        check({});
        for (const f of m.fields) {
          if (f.type === 'select') for (const o of f.options) check({ [f.id]: o.value });
          if (f.type === 'toggle') for (const v of ['shown', 'hidden']) check({ [f.id]: v });
          if (f.type === 'list')
            for (const length of [f.minItems, f.maxItems]) {
              const item = Object.fromEntries(f.itemFields.map((c) => [c.key, c.defaultValue]));
              check({ [f.id]: Array.from({ length }, () => clone(item)) });
            }
        }
        assert.equal(JSON.stringify(m), before);
      }
    assert.ok(cases > 150);
  } finally {
    await dom.happyDOM.close();
  }
});
test('HTML fixes preserve ESC fields and AMPscript, and both template ZIPs retain every icon', async () => {
  const { BlockCore: C, BlockQuickEdit: Q, BlockExport: E, dom } = await environment();
  try {
    for (const p of projects) {
      for (const m of p.modules) {
        const draft = Q.validate(m, Q.patch(m, '<!-- Maintenance check -->\n' + m.source));
        assert.equal(C.render(draft), '<!-- Maintenance check -->\n' + C.render(m));
        assert.deepEqual(
          [...draft.source.matchAll(/%%[\s\S]*?%%/g)].map((x) => x[0]),
          [...m.source.matchAll(/%%[\s\S]*?%%/g)].map((x) => x[0]),
        );
        assert.deepEqual(
          clone(draft.fields.map((f) => f.id)),
          m.fields.map((f) => f.id),
        );
      }
      const blob = await E.build(p, p.modules, { ...p.settings, fullTemplate: true });
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      for (const m of p.modules) {
        const folder = 'docs/clients/esc/' + p.settings.templateSlug + '/modules/' + m.slug + '/';
        for (const [key, name] of [
          ['icon', 'icon.png'],
          ['dragIcon', 'dragIcon.png'],
        ])
          assert.deepEqual(
            await zip.file(folder + name).async('nodebuffer'),
            Buffer.from(m.iconAssets[key], 'base64'),
          );
        const page = await zip.file(folder + 'index.html').async('string');
        assert.match(page, /runtime(?:\.rich)?\.bundle\.js/);
        const ref = page.match(/<script src="([^"]+runtime(?:\.rich)?\.bundle\.js)"/)[1];
        assert.ok(zip.file(path.posix.normalize(path.posix.join(folder, ref))));
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('maintenance permits copy and layout changes but blocks incompatible saved-field changes', async () => {
  const { BlockMaintenance: M, dom } = await environment();
  try {
    const m = clone(projects[0].modules.find((m) => m.slug === 'navigation'));
    m.source = '<!-- CSS fix -->' + m.source;
    m.name = 'New display name';
    const list = m.fields.find((field) => field.type === 'list');
    list.label = 'New label';
    assert.equal(JSON.stringify(M.problems(m)), '[]');
    list.itemFields[0].key = 'renamed';
    assert.match(M.problems(m).join(' '), /saved values/);
    const other = clone(projects[0].modules[0]);
    other.release = '99.0.0';
    assert.match(M.problems(other).join(' '), /identity, folder and version/);
    delete other.published;
    assert.equal(JSON.stringify(M.problems(other)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('repository folder import preserves both templates and rejects drift before changing browser drafts', async () => {
  const { BlockMaintenance: M, BlockWorkspace: W, dom } = await environment();
  try {
    const files = [];
    const add = (relative) => {
      const data = fs.readFileSync(path.join(root, relative));
      files.push({
        webkitRelativePath: 'repository/' + relative,
        size: data.length,
        text: async () => data.toString(),
        arrayBuffer: async () =>
          data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      });
    };
    for (const p of projects) {
      add('projects/esc/' + p.settings.templateSlug + '.jarrang.json');
      for (const m of p.modules)
        for (const file of ['index.html', 'icon.png', 'dragIcon.png'])
          add('docs/clients/esc/' + p.settings.templateSlug + '/modules/' + m.slug + '/' + file);
    }
    const loaded = await M.readRepository(files, W);
    assert.equal(loaded.length, 2);
    const workspace = W.create(projects[0]);
    const before = JSON.stringify(workspace);
    const next = M.importBatch(workspace, loaded, W);
    assert.equal(next.projects.length, 2);
    assert.equal(next.repository.baseUrl, projects[0].settings.baseUrl);
    assert.equal(JSON.stringify(workspace), before);
    const page = files.find((f) => f.webkitRelativePath.endsWith('/hero-story/index.html'));
    await assert.rejects(
      () =>
        M.readRepository(
          files.filter((f) => f !== page),
          W,
        ),
      /missing.*exported page/i,
    );
    const original = await page.text();
    page.text = async () => original.replace(/("name"\s*:\s*)"[^"]*"/, '$1"Changed name"');
    await assert.rejects(() => M.readRepository(files, W), /differ/);
    assert.equal(JSON.stringify(workspace), before);
    assert.throws(() => M.importBatch(workspace, [loaded[0], loaded[0]], W), /duplicate/);
  } finally {
    await dom.happyDOM.close();
  }
});
test('all-branch validation catches a removed child key in an inactive branch or empty list', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = {
      templateMode: true,
      source: '{% if show %}{% for item in items %}{{ item.missing }}{% endfor %}{% endif %}',
      fields: [
        { id: 'show', type: 'toggle', defaultValue: 'hidden', enabled: true },
        {
          id: 'items',
          type: 'list',
          enabled: true,
          defaultValue: [],
          itemFields: [{ key: 'label', type: 'text', defaultValue: 'Item' }],
        },
      ],
    };
    assert.match(C.templateProblems(m).join(' '), /item.missing/);
    m.source = m.source.replace('item.missing', 'item.label');
    assert.equal(JSON.stringify(C.templateProblems(m)), '[]');
  } finally {
    await dom.happyDOM.close();
  }
});
test('standalone UI boots with the ESC content and settings templates and previews supplied icons without regenerating them', async () => {
  const { Window } = await import('happy-dom');
  const dom = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
    },
  });
  try {
    const html = fs.readFileSync(path.join(root, 'block-studio/index.html'), 'utf8');
    dom.document.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
    const context = vm.createContext({
      window: { addEventListener: dom.addEventListener.bind(dom) },
      document: dom.document,
      DOMParser: dom.DOMParser,
      NodeFilter: dom.NodeFilter,
      URL,
      Blob,
      JSZip,
      Uint8Array,
      btoa,
      localStorage: dom.localStorage,
      crypto: require('node:crypto').webcrypto,
      setTimeout: () => 0,
      clearTimeout() {},
      getComputedStyle: dom.getComputedStyle.bind(dom),
    });
    for (const file of [...html.matchAll(/<script src="(src\/[^"]+)"/g)].map((m) => m[1]))
      vm.runInContext(fs.readFileSync(path.join(root, 'block-studio', file), 'utf8'), context);
    const d = dom.document,
      W = context.window.BlockWorkspace;
    const saved = JSON.parse(dom.localStorage.getItem(W.KEY));
    assert.equal(saved.projects.length, 4);
    assert.equal(d.getElementById('step-map').hidden, false);
    assert.equal(
      saved.projects.reduce((n, p) => n + p.modules.length, 0),
      49,
    );
    d.getElementById('task-export').click();
    assert.equal(d.getElementById('icon-symbol').value, '__supplied');
    assert.equal(d.getElementById('icon-colour').disabled, true);
    assert.match(d.getElementById('block-icon-preview').src, /^data:image\/png;base64,iVBOR/);
    // Reloading the same Studio preserves an edited browser draft.
    saved.projects[0].modules[0].name = 'Browser draft name';
    dom.localStorage.setItem(W.KEY, JSON.stringify(saved));
    vm.runInContext(fs.readFileSync(path.join(root, 'block-studio/src/app.js'), 'utf8'), context);
    const reloaded = JSON.parse(dom.localStorage.getItem(W.KEY));
    assert.equal(reloaded.projects[0].modules[0].name, 'Browser draft name');
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Newsletter and Congress modules retain exact output, fields, references and PNGs through undo and exported-content recovery', async () => {
  const { BlockCore: C, dom } = await environment();
  const H = require('../src/history.js');
  try {
    for (const project of projects)
      for (const original of project.modules) {
        const m = clone(original),
          h = H.create();
        h.track(m);
        const output = C.render(m),
          initial = H.snapshot(m);
        const reference = JSON.stringify(m.exportedDefinition),
          published = JSON.stringify(m.published);
        const icons = JSON.stringify(m.iconAssets);
        C.rebase(m, [{ start: 0, end: 0, value: '<!-- maintenance fix -->' }]);
        m.fields.reverse();
        h.capture(m);
        const edited = H.snapshot(m),
          editedOutput = C.render(m);
        h.undo(m);
        assert.equal(H.snapshot(m), initial, m.slug);
        assert.equal(C.render(m), output, m.slug);
        h.redo(m);
        assert.equal(H.snapshot(m), edited, m.slug);
        assert.equal(C.render(m), editedOutput, m.slug);
        H.restoreExportedContent(m);
        h.capture(m, 'restore last exported content');
        assert.equal(C.render(m), output, m.slug);
        assert.equal(JSON.stringify(m.fields), JSON.stringify(original.fields), m.slug);
        assert.equal(JSON.stringify(m.iconAssets), icons, m.slug);
        assert.equal(JSON.stringify(m.exportedDefinition), reference, m.slug);
        assert.equal(JSON.stringify(m.published), published, m.slug);
        h.undo(m);
        assert.equal(H.snapshot(m), edited, m.slug);
      }
  } finally {
    await dom.happyDOM.close();
  }
});

test('congress organiser logo supports optional links and bounded proportional widths', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    const host = dom.document.createElement('div');
    for (const [input, expected] of [
      ['80', '80'],
      ['160', '160'],
      ['999', '160'],
      ['0', '112'],
      ['-5', '112'],
    ]) {
      host.innerHTML = C.render(m, { field14: input, field15: 'https://example.com/?a=1&b=2' });
      const logo = host.querySelector('.esc-lead-organiser-table img');
      assert.equal(logo.getAttribute('width'), expected);
      assert.equal(logo.style.height, 'auto');
      assert.equal(logo.parentElement.getAttribute('href'), 'https://example.com/?a=1&b=2');
      assert.equal(logo.parentElement.getAttribute('target'), '_blank');
    }
    host.innerHTML = C.render(m, {
      field5: 'https://example.com/saved-logo.png',
      field6: 'Saved organiser',
    });
    const logo = host.querySelector('.esc-lead-organiser-table img');
    assert.equal(logo.getAttribute('width'), '112');
    assert.equal(logo.closest('a'), null);
    assert.equal(logo.getAttribute('src'), 'https://example.com/saved-logo.png');
    assert.equal(logo.getAttribute('alt'), 'Saved organiser');
  } finally {
    await dom.happyDOM.close();
  }
});

test('exported editor header follows template setting without changing email output', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const p = clone(projects[0]),
      m = p.modules[0],
      original = C.render(E.themedModule(p, m));
    for (const enabled of [false, true]) {
      p.settings.showEditorHeader = enabled;
      const themed = E.themedModule(p, m),
        host = dom.document.createElement('div');
      host.innerHTML = E.moduleHtml(themed);
      assert.equal(!!host.querySelector('.runtime-brand'), enabled);
      assert.equal(C.render(themed), original);
      assert.equal(E.definition(themed).showEditorHeader, enabled);
    }
    delete p.settings.showEditorHeader;
    assert.match(E.moduleHtml(E.themedModule(p, m)), /class="runtime-brand"/);
    for (const project of projects) {
      assert.equal(project.settings.showEditorHeader, false);
      for (const module of project.modules)
        assert.doesNotMatch(E.moduleHtml(E.themedModule(project, module)), /class="runtime-brand"/);
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('congress image frame remains in normal flow within its middle-aligned cell', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'lead-editorial');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    const frame = host.querySelector('.esc-lead-image-frame');
    assert.equal(frame.hasAttribute('align'), false);
    assert.equal(frame.parentElement.getAttribute('valign'), 'middle');
    assert.equal(frame.parentElement.style.verticalAlign, 'middle');
    assert.equal(frame.getAttribute('width'), '274');
  } finally {
    await dom.happyDOM.close();
  }
});

test('hero story top and bottom spacing can be hidden independently and default to shown', async () => {
  const { BlockCore: C, BlockControls, dom } = await environment();
  try {
    const m = projects[0].modules.find((m) => m.slug === 'hero-story');
    const id = (key) => m.fields.find((f) => f.key === key).id;
    const editor = dom.document.createElement('div');
    const controls = BlockControls.mount(editor, m.exportedDefinition.fields, {}, () => {});
    for (const key of ['show_top_spacing', 'show_bottom_spacing']) {
      const { input, group } = controls.get(id(key));
      assert.equal(input.checked, true);
      assert.equal(group.querySelector('.help'), null);
    }
    const height = controls.get(id('hero_image_height')).input;
    const disclosure = height.closest('details');
    assert.ok(disclosure);
    assert.equal(disclosure.open, false);
    assert.match(disclosure.querySelector('summary').textContent, /height in Outlook/);
    const rows = (values) => {
      const host = dom.document.createElement('div');
      host.innerHTML = C.render(m, values);
      const outer = host.querySelector('table.esc-hero');
      return [...outer.querySelectorAll(':scope > tbody > tr')];
    };
    const spacer = (row) => row.querySelector('td.content-inner')?.getAttribute('height') === '32';
    const both = rows({});
    assert.equal(both.length, 3);
    assert.deepEqual(both.map(spacer), [true, false, true]);
    assert.deepEqual(rows({ [id('show_top_spacing')]: false }).map(spacer), [false, true]);
    assert.deepEqual(rows({ [id('show_bottom_spacing')]: false }).map(spacer), [true, false]);
    assert.deepEqual(
      rows({ [id('show_top_spacing')]: false, [id('show_bottom_spacing')]: false }).map(spacer),
      [false],
    );
  } finally {
    await dom.happyDOM.close();
  }
});

test('congress deadline links are optional per row and need both a title and a URL', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const m = projects[1].modules.find((m) => m.slug === 'deadlines-list');
    const list = m.fields.find((f) => f.key === 'deadlines');
    assert.equal(list.itemFields.find((f) => f.key === 'link_url').required, false);
    const row = (link_text, link_url) => ({
      date: '09 Dec 2025',
      text: 'Deadline',
      link_text,
      link_url,
    });
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m, {
      [list.id]: [
        row('Submit ›', 'https://example.com/a'),
        row('', ''),
        row('Text only', ''),
        row('', 'https://example.com/b'),
      ],
    });
    const links = [...host.querySelectorAll('a')];
    assert.equal(links.length, 1);
    assert.equal(links[0].getAttribute('href'), 'https://example.com/a');
    assert.equal(host.querySelectorAll('.deadline-text').length, 4);
    assert.equal(host.textContent.includes('Text only'), false);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Together List turns pasted website bullets into numbered statements', async () => {
  const { BlockCore: C, BlockControls: Controls, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[1].modules.find(
      (module) => module.slug === 'together-list',
    );
    const field = definition.fields.find((field) => field.key === 'rows');
    const editor = dom.document.createElement('div');
    const values = { [field.id]: [{ text: 'Existing statement' }] };
    Controls.mount(editor, [field], values, () => {});
    const paste = new dom.Event('paste', { cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: {
        getData: (type) =>
          type === 'text/html'
            ? '<ul><li><strong>Discuss new findings</strong> with experts.</li><li>Build lasting relationships.</li></ul>'
            : '',
      },
    });
    editor.querySelector('.paste-list textarea').dispatchEvent(paste);
    assert.equal(values[field.id][0].text, 'Existing statement');
    editor.querySelector('.paste-list button').click();
    const output = dom.document.createElement('div');
    output.innerHTML = C.render(definition, values);
    const statements = [...output.querySelectorAll('.together-text')];
    assert.deepEqual(
      statements.map((text) => text.textContent.trim()),
      ['Discuss new findings with experts.', 'Build lasting relationships.'],
    );
    assert.deepEqual(
      statements.map((text) => text.previousElementSibling.textContent.trim()),
      ['1.', '2.'],
    );
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Checklists can import clipboard lists without changing saved rows until replacement', async () => {
  const { BlockControls, dom } = await environment();
  try {
    for (const project of projects) {
      const module = project.modules.find((item) => item.slug === 'checklist');
      const field = module.exportedDefinition.fields.find((item) => item.key === 'items');
      const saved = [{ check_text: 'Current item', check_link: 'https://example.com/current' }];
      const values = { [field.id]: saved };
      const editor = dom.document.createElement('div');
      dom.document.body.append(editor);
      let changes = 0;
      BlockControls.mount(editor, [field], values, () => changes++);
      const savedLink = editor.querySelector('.repeat-card [contenteditable] a');
      assert.equal(savedLink.textContent, 'Current item');
      assert.equal(savedLink.getAttribute('href'), 'https://example.com/current');
      assert.equal(editor.querySelectorAll('.repeat-card [contenteditable]').length, 1);
      assert.ok(!editor.querySelector('.repeat-card textarea'));
      const input = editor.querySelector('.paste-list textarea');
      const replace = editor.querySelector('.paste-list button');
      const paste = new dom.Event('paste', { cancelable: true });
      Object.defineProperty(paste, 'clipboardData', {
        value: {
          getData: (type) =>
            type === 'text/html'
              ? '<p>Learning objectives</p><p>After watching:</p><ul><li><strong>Understand</strong> the key messages;</li><li>Analyse<br>evidence &amp; examples.</li></ul><p>Needs assessment</p><p>Other content.</p>'
              : 'Unformatted fallback',
        },
      });
      input.dispatchEvent(paste);
      assert.equal(input.value, '• Understand the key messages;\n• Analyse evidence & examples.');
      assert.equal(changes, 0);
      assert.equal(values[field.id], saved);
      replace.click();
      assert.equal(changes, 1);
      assert.equal(editor.querySelectorAll('.repeat-card').length, 2);
      assert.deepEqual(
        Array.from(values[field.id], ({ check_content, check_link }) => ({
          check_content,
          check_link,
        })),
        [
          { check_content: 'Understand the key messages;', check_link: '' },
          { check_content: 'Analyse evidence &amp; examples.', check_link: '' },
        ],
      );

      const previous = values[field.id];
      input.value = Array(field.maxItems + 1)
        .fill('• Another item')
        .join('\n');
      replace.click();
      assert.match(editor.querySelector('.paste-list .field-error').textContent, /items/);
      assert.equal(values[field.id], previous);
      assert.equal(changes, 1);

      input.value = 'Introduction\r\n• Red\r\n2. Blue\r\nUnrelated paragraph';
      replace.click();
      assert.deepEqual(
        Array.from(values[field.id], (row) => row.check_content),
        ['Red', 'Blue'],
      );
      input.value = 'First item\n\nSecond item';
      replace.click();
      assert.deepEqual(
        Array.from(values[field.id], (row) => row.check_content),
        ['First item', 'Second item'],
      );
      assert.equal(changes, 3);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('ESC Checklist items support inline red links, legacy row links and both markers', async () => {
  const { BlockCore: C, dom } = await environment();
  const output = dom.document.createElement('div');
  const destination = 'https://example.com/checklist?a=1&b=2';
  try {
    for (const project of projects) {
      const module = project.modules.find((item) => item.slug === 'checklist');
      const items = module.fields.find((field) => field.key === 'items');
      const rows = [
        { check_text: 'Saved <checklist> item & notes' },
        {
          check_text: 'Read the terms & conditions',
          check_link: destination,
          [C.conversionKey]: { check_link: true },
          [C.linkOptionsKey]: { check_link: { title: 'Terms', alias: 'terms-cta' } },
        },
        { check_text: '', check_link: destination },
        {
          check_text: 'Old text',
          check_link: destination,
          check_content:
            'Read the <a href="https://example.com/terms">terms</a> and <a href="https://example.com/guide">guide</a> today.',
        },
        { check_text: 'Old text', check_link: destination, check_content: '' },
      ];
      assert.equal(C.validate(items, rows), '');
      output.innerHTML = C.render(module.exportedDefinition, { [items.id]: rows });
      const [plain, linked, empty, inline, cleared] = output.querySelectorAll('.check-text');
      assert.equal(plain.closest('tr').cells[0].textContent.trim(), '✓');
      assert.equal(plain.textContent, 'Saved <checklist> item & notes');
      assert.ok(!plain.querySelector('a'));
      const link = linked.querySelector('a');
      assert.equal(link.textContent, 'Read the terms & conditions');
      assert.equal(link.getAttribute('href'), destination);
      assert.equal(link.getAttribute('title'), 'Terms');
      assert.equal(link.getAttribute('alias'), 'terms-cta');
      assert.equal(link.getAttribute('conversion'), 'true');
      assert.ok(!empty.querySelector('a'));
      assert.equal(inline.textContent, 'Read the terms and guide today.');
      assert.deepEqual(
        Array.from(inline.querySelectorAll('a'), (anchor) => anchor.textContent),
        ['terms', 'guide'],
      );
      assert.equal(cleared.textContent, '');
      for (const anchor of output.querySelectorAll('.check-text a'))
        assert.match(anchor.getAttribute('style'), /(?:^|;)color:\s*#AE1022 !important;/i);

      output.innerHTML = C.render(module.exportedDefinition, {
        [items.id]: rows,
        item_marker: 'bullet',
      });
      for (const text of output.querySelectorAll('.check-text')) {
        const mark = text.closest('tr').cells[0].firstElementChild;
        assert.equal(mark.textContent.trim(), '•');
        assert.equal(mark.style.lineHeight, text.style.lineHeight);
        assert.equal(mark.style.backgroundColor, '');
      }
      assert.equal(output.querySelector('.check-text a').getAttribute('href'), destination);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
test('Editorials renders an optional description between the heading and articles', async () => {
  const { BlockCore: C, dom } = await environment();
  const { exportedDefinition: definition } = projects[0].modules.find(
    (module) => module.slug === 'editorials',
  );
  const output = dom.document.createElement('div');
  try {
    output.innerHTML = C.render(definition);
    assert.ok(!output.querySelector('p.dark-body'));
    output.innerHTML = C.render(definition, {
      description: 'Enjoy free access to these articles.',
    });
    const intro = output.querySelector('p.dark-body');
    assert.equal(intro.textContent, 'Enjoy free access to these articles.');
    assert.equal(intro.style.fontSize, '13px');
    assert.equal(intro.style.lineHeight, '20px');
    assert.match(intro.getAttribute('style'), /mso-line-height-rule: exactly/);
    assert.ok(intro.parentElement.querySelector('h3'));
    assert.ok(intro.closest('tr').nextElementSibling.querySelector('a.text-link'));

    output.innerHTML = C.render(definition, { field1: '', description: 'Research & updates' });
    assert.ok(!output.querySelector('h3'));
    assert.equal(output.querySelector('p.dark-body').textContent, 'Research & updates');
  } finally {
    await dom.happyDOM.close();
  }
});
test('editorials items can italicise their title without changing existing output', async () => {
  const { BlockCore: C, BlockControls, dom } = await environment();
  try {
    const m = projects[0].modules.find((m) => m.slug === 'editorials');
    const list = m.fields.find((f) => f.key === 'editorials');
    const toggle = list.itemFields.find((f) => f.key === 'title_italic');
    assert.equal(toggle.type, 'toggle');
    assert.equal(toggle.defaultValue, 'hidden');
    const styles = (rows) => {
      const host = dom.document.createElement('div');
      host.innerHTML = C.render(m, rows ? { [list.id]: rows } : {});
      return [...host.querySelectorAll('p.dark-invert')].map((p) => p.style.fontStyle || 'normal');
    };
    assert.ok(styles().every((s) => s === 'normal'));
    const legacy = list.defaultValue.map(({ title_italic, ...row }) => row);
    assert.ok(styles(legacy).every((s) => s === 'normal'));
    const rows = list.defaultValue.map((row, i) => ({ ...row, title_italic: i === 0 }));
    assert.deepEqual(styles(rows).slice(0, 2), ['italic', 'normal']);
    const container = dom.document.createElement('div');
    dom.document.body.append(container);
    BlockControls.mount(container, [list], {}, () => {}, { prefix: 'ed-' });
    const switches = [...container.querySelectorAll('label')].filter(
      (l) => l.textContent.trim() === 'Italic title',
    );
    assert.equal(switches.length, list.defaultValue.length);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC text can be italicised per field with the default style preserved', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    let toggles = 0;
    for (const p of projects)
      for (const m of p.modules) {
        const italic = m.fields.filter((f) => f.type === 'toggle' && /_italic$/.test(f.key || ''));
        const base = C.render(m, {});
        const count = (html) => (html.match(/font-style: italic/g) || []).length;
        for (const f of italic) {
          toggles++;
          assert.equal(f.defaultValue, 'hidden', m.slug + ' ' + f.key);
          assert.equal(f.binding, 'template');
          assert.ok(count(C.render(m, { [f.id]: 'shown' })) > count(base), m.slug + ' ' + f.key);
          assert.equal(count(C.render(m, { [f.id]: 'hidden' })), count(base));
        }
        if (italic.length) assert.doesNotMatch(base, /\{%|\{\{/);
      }
    assert.equal(toggles, 34);
    const m = projects[0].modules.find((m) => m.slug === 'events');
    const list = m.fields.find((f) => f.key === 'events');
    assert.equal(list.itemFields.find((f) => f.key === 'title_italic').defaultValue, 'hidden');
    const rows = (flag) => list.defaultValue.map((row) => ({ ...row, title_italic: flag }));
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m, { [list.id]: rows(true) });
    assert.ok(host.querySelector('h2[style*="font-style: italic"]'));
    host.innerHTML = C.render(m, { [list.id]: rows(false) });
    assert.equal(host.querySelector('h2[style*="font-style: italic"]'), null);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Quote supports long quotations and an optional heading and speaker photo', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[0].modules.find((m) => m.slug === 'quote');
    const quoteField = definition.fields.find((field) => field.label === 'Quote text');
    const quote = 'A longer quotation can give a speaker enough space to make a complete point. '
      .repeat(8)
      .trim();
    const output = dom.document.createElement('div');
    assert.equal(C.validate(quoteField, quote), '');
    output.innerHTML = C.render(definition, {
      [quoteField.id]: quote,
      heading: 'Research in cardiology',
      field2: 'Dr Morgan Lee',
      speaker_photo: 'https://example.org/speaker.png',
    });
    const text = output.querySelector('.quote-text');
    assert.equal(text.textContent, quote);
    assert.equal(text.style.fontSize, '13px');
    assert.equal(text.style.fontStyle, 'italic');
    assert.equal(text.style.lineHeight, '20px');
    assert.match(text.getAttribute('style'), /mso-line-height-rule: exactly/);
    const heading = output.querySelector('h2');
    assert.equal(heading.textContent, 'Research in cardiology');
    assert.equal(heading.nextElementSibling.nextElementSibling, text);
    const attribution = output.querySelector('.quote-attribution');
    assert.equal(attribution.querySelector('.quote-author').textContent.trim(), 'Dr Morgan Lee');
    const photo = attribution.querySelector('img');
    assert.equal(photo.getAttribute('width'), '56');
    assert.equal(photo.getAttribute('height'), '56');
    assert.equal(photo.getAttribute('alt'), '');

    output.innerHTML = C.render(definition, { [quoteField.id]: quote });
    assert.equal(output.querySelector('h2, .quote-photo, .quote-attribution'), null);
    assert.ok(output.querySelector('.quote-author'));

    const author = definition.fields.find((field) => field.label === 'Author name');
    const role = definition.fields.find((field) => field.key === 'author_role');
    assert.equal(C.validate(author, ''), '');
    output.innerHTML = C.render(definition, { [author.id]: '' });
    assert.equal(output.querySelector('.quote-author'), null);
    assert.equal(output.querySelector('.quote-role').textContent.trim(), role.defaultValue);
    assert.equal(output.querySelector('.quote-role').previousElementSibling.style.height, '20px');

    output.innerHTML = C.render(definition, { [author.id]: '', [role.id]: '' });
    assert.equal(output.querySelector('.quote-author, .quote-role, .quote-attribution'), null);
    assert.equal(output.querySelector('.quote-text').nextElementSibling.style.height, '4px');

    output.innerHTML = C.render(definition, {
      [author.id]: '',
      [role.id]: '',
      speaker_photo: 'https://example.org/speaker.png',
    });
    assert.ok(output.querySelector('.quote-photo'));
    assert.equal(output.querySelector('.quote-author, .quote-role'), null);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Sponsor supports multiple optional logos and links and preserves legacy entries', async () => {
  const { BlockCore: C, BlockControls: Controls, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[0].modules.find(
      (m) => m.slug === 'sponsor',
    );
    const list = definition.fields.find((field) => field.key === 'sponsors');
    const disclaimer = definition.fields.find((field) => field.key === 'disclaimer_text');
    const output = dom.document.createElement('div');
    output.innerHTML = C.render(definition);
    assert.equal(output.querySelector('img, a'), null);
    const longText = 'Supporting organisations and specialist networks '.repeat(7).trim();
    assert.equal(C.validate(disclaimer, longText), '');
    const rows = [
      { name: longText },
      { name: 'Second sponsor', logo: 'https://example.org/logo2.png' },
      { logo: 'https://example.org/logo3.png', link: 'https://example.org/partners' },
    ];
    assert.equal(C.validate(list, rows), '');
    output.innerHTML = C.render(definition, {
      sponsors: rows,
      [disclaimer.id]: longText,
      sponsor_text_italic: 'shown',
    });
    assert.deepEqual(
      Array.from(output.querySelectorAll('.esc-sponsor-name'), (p) => p.textContent),
      [longText, 'Second sponsor'],
    );
    assert.equal(output.querySelectorAll('img').length, 2);
    assert.equal(output.querySelectorAll('a').length, 1);
    assert.equal(output.querySelector('a img').getAttribute('src'), rows[2].logo);
    for (const p of output.querySelectorAll('.esc-sponsor-name, .esc-sponsor-text')) {
      assert.equal(p.style.fontStyle, 'italic');
      assert.equal(p.style.fontSize, '13px');
      assert.equal(p.style.lineHeight, '20px');
    }

    const legacy = {
      field2: 'https://example.org/legacy',
      field3: 'https://example.org/logo.png',
      field4: 'Legacy sponsor',
      [C.linkOptionsKey]: { field2: { title: 'Legacy title', alias: 'legacy-link' } },
      [C.conversionKey]: { field2: true },
    };
    output.innerHTML = C.render(definition, legacy);
    const link = output.querySelector('a');
    assert.equal(link.querySelector('img').getAttribute('alt'), legacy.field4);
    assert.equal(link.getAttribute('href'), legacy.field2);
    assert.equal(link.getAttribute('alias'), 'legacy-link');
    assert.equal(link.getAttribute('title'), 'Legacy title');
    assert.equal(link.getAttribute('conversion'), 'true');
    const editor = dom.document.createElement('div');
    Controls.mount(editor, definition.fields, legacy, () => {});
    assert.equal(editor.querySelectorAll('.repeat-card').length, 1);
    assert.equal(editor.querySelector('#sponsors-0-link').value, legacy.field2);
    assert.equal(editor.querySelector('#field2'), null);
    output.innerHTML = C.render(definition, { ...legacy, sponsors: [] });
    assert.equal(output.querySelector('img, a'), null);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Signature lets editors change the prefilled dynamic team line directly', async () => {
  const { BlockCore: C, BlockControls: Controls, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[0].modules.find(
      (module) => module.slug === 'signature',
    );
    const field = definition.fields.find((field) => field.key === 'signature_text');
    const fallback = 'The %%=v(@BrandShortName)=%% Team';
    const defaultHtml = C.render(definition);
    assert.equal(field.defaultValue, fallback);
    assert.match(definition.source, /{{ signature_text }}/);
    assert.doesNotMatch(definition.source, /{% if signature_text %}/);
    assert.equal(C.validate(field, ''), '');
    assert.match(defaultHtml, /The %%=v\(@BrandShortName\)=%% Team/);
    assert.equal(C.render(definition, { [field.id]: '' }), defaultHtml);
    const editor = dom.document.createElement('div');
    Controls.mount(editor, [field], { [field.id]: '' }, () => {});
    assert.equal(editor.querySelector('textarea').value, fallback);
    for (const team of [
      'The ESC Publications Team',
      'The ESC TV Today Team',
      'Industry & Partners',
      'The %%=v(@BrandShortName)=%% Publications Team',
    ]) {
      assert.equal(
        C.render(definition, { [field.id]: team }),
        defaultHtml.replace(fallback, () => C.escape(team)),
      );
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Personal Letter supports a team, a named signatory or no signature', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[1].modules.find(
      (module) => module.slug === 'personal-letter',
    );
    const signature = definition.fields.find((field) => field.key === 'signature');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(definition);
    assert.match(host.querySelector('.letter-signature').textContent, /Congress Team/);
    assert.equal(host.querySelector('.letter-signatory-role'), null);

    host.innerHTML = C.render(definition, {
      [signature.id]: 'Dr Morgan Lee',
      signatory_role: 'ESC Council Chair',
    });
    const name = host.querySelector('.letter-signature');
    assert.equal(name.textContent.trim(), 'Dr Morgan Lee');
    const role = name.nextElementSibling;
    assert.equal(role.textContent, 'ESC Council Chair');
    assert.equal(role.style.fontSize, '13px');
    assert.equal(role.style.lineHeight, '20px');

    assert.equal(C.validate(signature, ''), '');
    host.innerHTML = C.render(definition, {
      [signature.id]: '',
      signatory_role: 'ESC Council Chair',
    });
    assert.equal(host.querySelector('.letter-signature, .letter-signatory-role'), null);
    assert.equal(host.querySelector('.letter-body').nextElementSibling, null);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC Events show optional same-month and cross-month date ranges per card', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const { exportedDefinition: definition } = projects[0].modules.find((m) => m.slug === 'events');
    const list = definition.fields.find((f) => f.key === 'events');
    const [legacy] = list.defaultValue;
    const host = dom.document.createElement('div');
    const rows = [
      legacy,
      { ...legacy, date_end_day: '25' },
      { ...legacy, date_day: '30', date_end_day: '2', date_end_month: 'MAY' },
      { ...legacy, date_end_day: '', date_end_month: 'MAY' },
    ];
    assert.equal(C.validate(list, rows), '');
    host.innerHTML = C.render(definition, { [list.id]: rows });
    const badges = [...host.querySelectorAll('.event-date-badge')];
    const lines = (badge) =>
      [...badge.querySelectorAll('.date-month, .date-day')].map((p) =>
        p.textContent.replace(/\s+/g, ' ').trim(),
      );
    assert.deepEqual(badges.map(lines), [
      ['APR', '24'],
      ['APR', '24–25'],
      ['30 APR', '– 2 MAY'],
      ['APR', '24'],
    ]);
    assert.deepEqual(
      badges.map((badge) => badge.getAttribute('width')),
      ['60', '84', '84', '60'],
    );
    const columnWidths = badges.map((badge) => {
      const badgeCell = badge.parentElement;
      const rowTable = badgeCell.closest('table');
      assert.equal(rowTable.getAttribute('width'), '532');
      assert.equal(rowTable.style.tableLayout, 'fixed');
      return [...badgeCell.parentElement.children].map((cell) => cell.getAttribute('width'));
    });
    assert.deepEqual(columnWidths, [
      ['90', '442'],
      ['104', '428'],
      ['104', '428'],
      ['90', '442'],
    ]);
    for (const line of host.querySelectorAll('.date-month, .date-day')) {
      assert.equal(parseInt(line.style.lineHeight, 10) % 4, 0);
      assert.match(line.getAttribute('style'), /mso-line-height-rule: exactly/);
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Lead keeps its background, optional list and optional button', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const project = JSON.parse(
      fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')),
    );
    assert.equal(project.settings.templateSlug, 'esc-tv');
    const m = project.modules.find((m) => m.slug === 'esc-tv-lead');
    C.assertProject(project);
    assert.equal(E.problems(E.themedModule(project, m)).length, 0);
    const id = (key) => m.fields.find((f) => f.key === key).id;
    const render = (values = {}) => C.render(m, values);
    const base = render();
    assert.doesNotMatch(base, /\{%|\{\{/);
    assert.match(base, /Hello %%=v\(@FirstName\)=%%,/);
    assert.equal(base.match(/bgcolor="#011933"/g).length, 4);
    assert.doesNotMatch(base, /#ffffff;"\s+width="620"/);
    assert.equal(base.match(/&#9656;/g).length, 4);
    assert.ok(base.includes('Topics include:') && base.includes('Watch now'));
    const noList = render({ [id('show_list')]: 'hidden' });
    assert.ok(!noList.includes('Topics include:') && !noList.includes('&#9656;'));
    assert.ok(noList.includes('Watch now'));
    const noButton = render({ [id('show_button')]: 'hidden' });
    assert.ok(!noButton.includes('Watch now') && !noButton.includes('esc-btn'));
    assert.ok(noButton.includes('&#9656;'));
    const textOnly = render({ [id('show_list')]: 'hidden', [id('show_button')]: 'hidden' });
    assert.ok(!textOnly.includes('&#9656;') && !textOnly.includes('esc-btn'));
    assert.ok(textOnly.includes('Welcome to the latest episode'));
    assert.ok(!base.includes('font-style'));
    assert.ok(render({ [id('greeting_italic')]: 'shown' }).includes('font-style: italic'));
    // A hidden section leaves no spacer row behind.
    const height = (html) => (html.match(/height:\d+px;mso-line-height-rule/g) || []).length;
    assert.ok(height(noList) < height(base) && height(noButton) < height(base));
    const host = dom.document.createElement('div');
    host.innerHTML = render({ [id('body_copy')]: '' });
    assert.ok(!host.textContent.includes('Welcome to the latest'));
    assert.equal(m.exportedDefinition.slug, 'esc-tv-lead');
    assert.ok(m.iconAssets.icon && m.iconAssets.dragIcon);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC rich text can centre the field and size selected text on the 4px line-height grid', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const hero = projects[0].modules.find((module) => module.slug === 'hero-story');
    const intro = hero.fields.find((field) => field.key === 'intro_copy');
    const output = dom.document.createElement('div');
    for (const [size, lineHeight] of [
      [13, 20],
      [20, 32],
      [24, 36],
      [32, 48],
    ]) {
      output.innerHTML = C.render(hero.exportedDefinition, {
        [intro.id]:
          '<div data-rich-align="center">Intro <span style="font-size:' +
          size +
          'px;line-height:19px;"><a href="https://example.org/">read more</a></span></div>',
      });
      const link = output.querySelector('a[href="https://example.org/"]');
      assert.equal(link.closest('span').style.fontSize, size + 'px');
      assert.match(link.getAttribute('style'), /color:#ae1022 !important;/i);
      const paragraph = link.closest('p');
      assert.equal(paragraph.style.textAlign, 'center');
      assert.equal(paragraph.style.lineHeight, lineHeight + 'px');
      assert.match(paragraph.getAttribute('style'), /mso-line-height-rule:exactly/);
      assert.ok(!output.innerHTML.includes('19px'));
      assert.ok(!output.querySelector('[data-rich-align]'));
    }
    output.innerHTML = C.render(hero.exportedDefinition, {
      [intro.id]: '<div data-rich-align="right"><ul><li><font size="5">Item</font></li></ul></div>',
    });
    const item = output.querySelector('li');
    assert.equal(item.style.textAlign, 'right');
    assert.equal(item.style.lineHeight, '36px');
    assert.equal(item.querySelector('span').style.fontSize, '24px');
    assert.equal(C.cleanRich('<span style="font-size:900px;line-height:19px">Text</span>'), 'Text');
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC rich text preserves highlight, strikethrough, and nested list styling in email HTML', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const hero = projects[0].modules.find((module) => module.slug === 'hero-story');
    const intro = hero.fields.find((field) => field.key === 'intro_copy');
    const output = dom.document.createElement('div');
    output.innerHTML = C.render(hero.exportedDefinition, {
      [intro.id]:
        '<ol><li>Parent</li><ol><li><a href="https://example.org/">' +
        '<strike style="background-color: #fff29a;line-height:19px;">Child</strike>' +
        '</a></li></ol><li>Sibling</li></ol>',
    });
    const list = [...output.querySelectorAll('ol')].find((node) =>
      node.textContent.includes('Parent'),
    );
    assert.deepEqual(
      [...list.children].map((item) => item.tagName),
      ['LI', 'LI'],
    );
    const child = list.querySelector('li > ol > li');
    assert.equal(child.textContent, 'Child');
    assert.equal(child.style.lineHeight, '20px');
    assert.match(child.getAttribute('style'), /mso-line-height-rule:exactly/);
    assert.ok(!child.innerHTML.includes('19px'));
    assert.match(child.querySelector('a').getAttribute('style'), /color:#ae1022 !important;/i);
    assert.equal(child.querySelector('span').getAttribute('style'), 'background-color:#fff29a;');
    assert.equal(child.querySelector('s').getAttribute('style'), 'text-decoration:line-through;');
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC multi-column stories keep overflow wrapping on headlines and descriptions', async () => {
  const { BlockCore: C, dom } = await environment();
  const tv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  const cases = [
    [projects[0], 'story-card-2col', 2],
    [projects[0], 'story-card-3col', 3],
    [projects[1], 'story-2col', 2],
    [tv, 'esc-tv-2-col', 2],
  ];
  try {
    const output = dom.document.createElement('div');
    for (const [project, slug, count] of cases) {
      const { exportedDefinition } = project.modules.find((module) => module.slug === slug);
      for (const values of [{}, ...(slug.startsWith('story-card') ? [{ field1: 'dark' }] : [])]) {
        output.innerHTML = C.render(exportedDefinition, values);
        const text = output.querySelectorAll('.news-card-title, .news-card-text, .story-excerpt');
        assert.equal(text.length, count * 2, slug);
        for (const node of text) {
          assert.match(
            node.getAttribute('style'),
            /word-wrap: break-word; overflow-wrap: break-word; overflow-wrap: anywhere !important;/,
          );
          assert.equal(node.closest('table').style.tableLayout, 'fixed');
        }
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC card descriptions hide when blank while CTA switches remain independent', async () => {
  const { BlockCore: C, BlockControls, dom } = await environment();
  const escTv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
  const affected = [...projects[0].modules, ...escTv.modules].filter((module) =>
    module.fields.some((field) => field.type === 'richtext' && field.legacyVisibilityId),
  );
  try {
    assert.equal(affected.length, 6);
    for (const { exportedDefinition: definition } of affected) {
      const descriptions = definition.fields.filter((field) => field.legacyVisibilityId);
      const ctas = definition.fields.filter(
        (field) => field.type === 'toggle' && /show (?:CTA button|button|link)$/i.test(field.label),
      );
      assert.equal(ctas.length, descriptions.length);
      for (const field of descriptions) {
        const values = {
          [field.id]: 'Previously hidden copy',
          [field.legacyVisibilityId]: 'hidden',
        };
        const hidden = C.render(definition, values);
        for (const blank of ['', '   ', '<div>&nbsp;<br></div>', '<p>\u200b</p>'])
          assert.equal(C.render(definition, { [field.id]: blank }), hidden);
        const editor = dom.document.createElement('div');
        BlockControls.mount(editor, definition.fields, values, () => {});
        const input = editor.querySelector('#' + field.id);
        assert.equal(input.textContent, '');
        assert.equal(values[field.id], 'Previously hidden copy');
        assert.ok(!editor.querySelector('#' + field.legacyVisibilityId));
        for (const cta of ctas) assert.ok(editor.querySelector('#' + cta.id));

        input.innerHTML = 'New visible <a href="https://example.org/">description</a>';
        input.dispatchEvent(new dom.Event('input'));
        const output = C.render(definition, values);
        assert.match(output, /New visible <a href="https:\/\/example.org\/"[^>]*>description<\/a>/);
        for (const cta of ctas)
          assert.notEqual(output, C.render(definition, { ...values, [cta.id]: 'hidden' }));
      }
    }
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Story Card rounds the image and card corners and keeps description and button optional', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const project = JSON.parse(
      fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')),
    );
    const m = project.modules.find((m) => m.slug === 'esc-tv-story-card');
    C.assertProject(project);
    assert.equal(E.problems(E.themedModule(project, m)).length, 0);
    const id = (key) => m.fields.find((f) => f.key === key).id;
    const render = (values = {}) => C.render(m, values);
    const base = render();
    assert.doesNotMatch(base, /\{%|\{\{/);
    assert.equal(base.match(/bgcolor="#011933"/g).length, 4);
    assert.match(base, /<td bgcolor="#011933" class="side"[^>]*width="20"/);
    assert.match(base, /border-radius: 12px 12px 0 0/);
    assert.match(base, /border-radius: 0 0 12px 12px/);
    assert.match(base, /height="328"/);
    assert.match(render({ [id('card_image_height')]: '292' }), /height="292"/);
    const host = dom.document.createElement('div');
    host.innerHTML = render({ [id('card_image_alt')]: 'A "quoted" <b>alt</b>' });
    assert.equal(host.querySelector('img').getAttribute('alt'), 'A "quoted" <b>alt</b>');
    const noDescription = render({ [id('show_description')]: 'hidden' });
    assert.ok(!noDescription.includes('Add a short summary') && noDescription.includes('esc-btn'));
    const noButton = render({ [id('show_button')]: 'hidden' });
    assert.ok(!noButton.includes('esc-btn') && noButton.includes('Add a short summary'));
    const bare = render({ [id('show_description')]: 'hidden', [id('show_button')]: 'hidden' });
    assert.ok(!bare.includes('esc-btn') && bare.includes('Snapshots'));
    const spacers = (html) =>
      (html.match(/height:\d+px;(?:font-size:\d+px;)?mso-line-height-rule/g) || []).length;
    assert.ok(spacers(bare) < spacers(noButton) && spacers(noButton) < spacers(base));
    assert.ok(!base.includes('font-style'));
    assert.ok(render({ [id('headline_italic')]: 'shown' }).includes('font-style: italic'));
    assert.ok(m.iconAssets.icon && m.iconAssets.dragIcon && m.exportedDefinition);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV 2 Col keeps a white rounded card on navy with two independent cards', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const project = JSON.parse(
      fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')),
    );
    const m = project.modules.find((m) => m.slug === 'esc-tv-2-col');
    C.assertProject(project);
    assert.equal(E.problems(E.themedModule(project, m)).length, 0);
    const id = (key) => m.fields.find((f) => f.key === key).id;
    const render = (values = {}) => C.render(m, values);
    const base = render();
    assert.doesNotMatch(base, /\{%|\{\{/);
    assert.equal(base.match(/bgcolor="#011933"/g).length, 4);
    assert.match(base, /border-radius: 16px/);
    assert.equal(base.match(/height="148"/g).length, 2);
    assert.equal(base.match(/class="[^"]*\bblock\b/g).length, 3);
    assert.ok(base.includes('mobile-hide') && base.includes('news-card-stack-first'));
    assert.equal(base.match(/&rarr;/g).length, 2);
    assert.match(render({ [id('card2_image_height')]: '132' }), /height="132"/);
    const hidden = render({
      [id('card1_show_description')]: 'hidden',
      [id('card2_show_cta')]: 'hidden',
    });
    assert.ok(!hidden.includes('Memantine') && hidden.includes('Gianfranco'));
    assert.ok(hidden.includes('(4 mins)') && !hidden.includes('(8 mins)'));
    assert.ok(!base.includes('font-style'));
    const italic = render({ [id('card2_headline_italic')]: 'shown' });
    assert.equal(italic.match(/font-style: italic/g).length, 1);
    const host = dom.document.createElement('div');
    host.innerHTML = base;
    assert.equal(host.querySelectorAll('img').length, 2);
    const description = m.fields.find((f) => f.key === 'card1_description');
    assert.equal(description.linkStyle.colour, '#ae1022');
    assert.equal(description.linkStyle.decoration, 'underline');
    assert.equal(description.linkStyle.weight, 'bold');
    assert.ok(m.iconAssets.icon && m.iconAssets.dragIcon && m.exportedDefinition);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Button Row defaults to three styled buttons and preserves saved visibility', async () => {
  const { BlockCore: C, BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    const m = p.modules.find((m) => m.slug === 'esc-tv-button-row');
    C.assertProject(p);
    assert.deepEqual(Array.from(E.problems(m)), []);
    assert.deepEqual(Array.from(M.problems(m)), []);
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    assert.deepEqual(
      Array.from(host.querySelectorAll('a'), (a) => a.textContent.trim()),
      ['Get reminders', 'Previous episodes', 'Become a member'],
    );
    assert.equal(host.querySelector('.content-outer').getAttribute('bgcolor'), '#011933');
    assert.equal(host.querySelectorAll('.esc-button-row__cell').length, 3);
    assert.equal(host.querySelectorAll('.esc-btn').length, 1);
    assert.equal(host.querySelectorAll('.esc-btn-white').length, 1);
    assert.equal(host.querySelectorAll('.esc-btn-outline').length, 1);
    assert.match(C.render(m), /%%=v\(@ButtonBgColour\)=%%/);
    const field = (key) => m.fields.find((f) => f.key === key);
    for (const second of ['shown', 'hidden'])
      for (const third of ['shown', 'hidden']) {
        const output = C.render(m, {
          [field('button2_show').id]: second,
          [field('button3_show').id]: third,
        });
        host.innerHTML = output;
        assert.equal(
          host.querySelectorAll('a').length,
          1 + (second === 'shown') + (third === 'shown'),
        );
        assert.equal(JSON.stringify(C.parse(output).issues), '[]');
      }
    for (let button = 1; button <= 3; button++)
      for (const style of ['primary', 'white', 'outline']) {
        host.innerHTML = C.render(m, { [field('button' + button + '_style').id]: style });
        const cell = host.querySelectorAll('.esc-button-row__cell')[button - 1];
        assert.ok(
          cell.querySelector(
            '.' + { primary: 'esc-btn', white: 'esc-btn-white', outline: 'esc-btn-outline' }[style],
          ),
        );
      }
    const folder = path.join(root, 'docs/clients/esc/esc-tv/modules', m.slug);
    const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
    const definition = JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))), definition);
    assert.deepEqual(definition, m.exportedDefinition);
    for (const [key, name] of [
      ['icon', 'icon.png'],
      ['dragIcon', 'dragIcon.png'],
    ])
      assert.deepEqual(
        Buffer.from(m.iconAssets[key], 'base64'),
        fs.readFileSync(path.join(folder, name)),
      );
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Disclaimer renders approved wording safely and matches its generated editor', async () => {
  const { BlockCore: C, BlockExport: E, BlockMaintenance: M, dom } = await environment();
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    const m = p.modules.find((m) => m.slug === 'esc-tv-disclaimer');
    C.assertProject(p);
    assert.deepEqual(Array.from(E.problems(m)), []);
    assert.deepEqual(Array.from(M.problems(m)), []);
    const host = dom.document.createElement('div');
    const output = C.render(m);
    host.innerHTML = output;
    assert.deepEqual(
      Array.from(host.querySelectorAll('p'), (p) => p.textContent),
      [
        'ESC TV Today is supported by Novartis through an independent funding.',
        'The programme has not been influenced in any way by its funding partner.',
      ],
    );
    for (const el of host.querySelectorAll('.content-outer, .content-inner, .side')) {
      assert.equal(el.getAttribute('bgcolor'), '#011933');
      assert.equal(el.style.backgroundColor, '#011933');
    }
    for (const el of host.querySelectorAll('p')) {
      assert.equal(el.style.color, '#ffffff');
      assert.equal(el.style.textAlign, 'center');
      assert.equal(el.style.fontSize, '12px');
      assert.equal(el.style.lineHeight, '16px');
    }
    assert.equal(JSON.stringify(C.parse(output).issues), '[]');
    for (const field of m.fields.filter((field) => field.type === 'text')) {
      assert.ok(C.validate(field, ''), 'Both disclaimer statements are required');
      const edited = C.render(m, { [field.id]: 'Approved <strong>copy</strong> & details' });
      host.innerHTML = edited;
      assert.equal(host.querySelector('strong'), null);
      assert.ok(
        Array.from(host.querySelectorAll('p')).some(
          (p) => p.textContent === 'Approved <strong>copy</strong> & details',
        ),
      );
    }
    const folder = path.join(root, 'docs/clients/esc/esc-tv/modules', m.slug);
    const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
    const definition = JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))), definition);
    assert.deepEqual(definition, m.exportedDefinition);
    assert.equal(definition.minifyOutput, true);
    for (const [key, name, size] of [
      ['icon', 'icon.png', 60],
      ['dragIcon', 'dragIcon.png', 120],
    ]) {
      const bytes = fs.readFileSync(path.join(folder, name));
      assert.deepEqual(Buffer.from(m.iconAssets[key], 'base64'), bytes);
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.equal(bytes.readUInt32BE(16), size);
      assert.equal(bytes.readUInt32BE(20), size);
    }
    const catalogue = fs.readFileSync(
      path.join(root, 'docs/clients/esc/esc-tv/index.html'),
      'utf8',
    );
    assert.match(catalogue, /modules\/esc-tv-disclaimer\//);
    for (const module of p.modules) assert.ok(catalogue.includes('modules/' + module.slug + '/'));
  } finally {
    await dom.happyDOM.close();
  }
});

test('Newsletter Full Width Image supports image proportions and the shared link tracking controls', async () => {
  const { BlockCore: C, BlockExport: E, BlockControls: Controls, dom } = await environment();
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/newsletter.jarrang.json')));
    const m = p.modules.find((m) => m.slug === 'full-width-image');
    C.assertProject(p);
    assert.deepEqual(Array.from(E.problems(m)), []);
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    assert.equal(host.querySelector('table').getAttribute('width'), '620');
    assert.equal(host.querySelector('table').getAttribute('bgcolor'), '#ffffff');
    assert.equal(host.querySelector('.side'), null);
    assert.equal(host.querySelector('img').getAttribute('width'), '620');
    assert.equal(host.querySelector('img').getAttribute('height'), '348');
    assert.equal(host.querySelector('img').style.height, 'auto');
    assert.equal(host.querySelector('img').style.borderRadius, '');
    const editor = dom.document.createElement('div');
    const formatValues = { image_height: '620' };
    Controls.mount(editor, m.fields, formatValues, () => {});
    const format = editor.querySelector('#image_format');
    const advanced = editor.querySelector('#image_height').closest('details');
    assert.equal(format.value, 'landscape');
    assert.equal(format.options[0].textContent, 'Promotional banner (600 × 150)');
    assert.equal(advanced.querySelector('summary').textContent, 'Advanced Outlook settings');
    assert.equal(advanced.open, false);
    format.value = 'promotional';
    format.dispatchEvent(new dom.Event('change'));
    host.innerHTML = C.render(m, formatValues);
    assert.equal(host.querySelector('img').getAttribute('height'), '156');
    assert.equal(host.querySelector('img').style.height, 'auto');
    assert.equal(formatValues.image_height, '620');
    const tv = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    assert.equal(
      tv.modules.some((module) => module.slug.includes('full-width-image')),
      false,
    );
    const legacyFolder = path.join(root, 'docs/clients/esc/esc-tv/modules/esc-tv-full-width-image');
    const legacy = JSON.parse(
      fs
        .readFileSync(path.join(legacyFolder, 'index.html'), 'utf8')
        .match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1],
    );
    assert.notEqual(m.id, legacy.id);
    assert.equal(C.render(legacy).includes('#011933'), true);
    assert.equal(
      fs
        .readFileSync(path.join(root, 'docs/clients/esc/esc-tv/index.html'), 'utf8')
        .includes('modules/esc-tv-full-width-image/'),
      false,
    );
    assert.equal(
      fs
        .readFileSync(path.join(root, 'docs/clients/esc/newsletter/index.html'), 'utf8')
        .includes('modules/full-width-image/'),
      true,
    );
    const link = m.fields.find((f) => f.key === 'image_link');
    const parent = dom.document.createElement('div');
    const values = {};
    Controls.mount(parent, [link], values, () => {});
    const checkbox = parent.querySelector('[type=checkbox]');
    assert.equal(checkbox.parentElement.textContent, 'Conversion Tracking Link');
    assert.equal(checkbox.checked, false);
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.Event('change'));
    const alt = 'ESC TV "image" & description';
    Object.assign(values, {
      image: 'https://example.com/tall-image.png',
      image_alt: alt,
      image_link: 'https://example.com/watch?source=email&campaign=esc-tv',
      image_height: '620',
      [C.linkOptionsKey]: { [link.id]: { title: 'Watch ESC TV', alias: 'esc_tv_image' } },
    });
    host.innerHTML = C.render(m, values);
    assert.equal(host.querySelector('img').getAttribute('src'), values.image);
    assert.equal(host.querySelector('img').getAttribute('alt'), alt);
    assert.equal(host.querySelector('img').getAttribute('height'), '620');
    assert.equal(host.querySelector('a').getAttribute('href'), values.image_link);
    assert.equal(host.querySelector('a').getAttribute('conversion'), 'true');
    assert.equal(host.querySelector('a').getAttribute('title'), 'Watch ESC TV');
    assert.equal(host.querySelector('a').getAttribute('alias'), 'esc_tv_image');
    checkbox.checked = false;
    checkbox.dispatchEvent(new dom.Event('change'));
    host.innerHTML = C.render(m, values);
    assert.equal(host.querySelector('a').hasAttribute('conversion'), false);
    assert.equal(JSON.stringify(C.parse(C.render(m, values)).issues), '[]');
    const folder = path.join(root, 'docs/clients/esc/newsletter/modules', m.slug);
    const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
    const definition = JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))), definition);
    assert.deepEqual(definition, m.exportedDefinition);
    for (const [key, name] of [
      ['icon', 'icon.png'],
      ['dragIcon', 'dragIcon.png'],
    ])
      assert.deepEqual(
        Buffer.from(m.iconAssets[key], 'base64'),
        fs.readFileSync(path.join(folder, name)),
      );
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Lead CTA avoids fractional border height and unpainted Outlook cell gaps', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    const m = p.modules.find((m) => m.slug === 'esc-tv-lead');
    const host = dom.document.createElement('div');
    host.innerHTML = C.render(m);
    const button = host.querySelector('table.esc-btn');
    const cell = button.querySelector('td');
    assert.equal(parseInt(button.style.border), 0);
    assert.equal(parseInt(button.style.borderSpacing), 0);
    assert.equal(button.getAttribute('cellspacing'), '0');
    assert.equal(button.getAttribute('cellpadding'), '0');
    assert.equal(button.getAttribute('bgcolor'), '%%=v(@ButtonBgColour)=%%');
    assert.equal(cell.getAttribute('bgcolor'), button.getAttribute('bgcolor'));
    assert.ok(cell.getAttribute('style').includes('background-color: %%=v(@ButtonBgColour)=%%;'));
    assert.equal(parseInt(cell.style.border), 0);
    assert.equal(cell.style.fontSize, '13px');
    assert.equal(cell.style.lineHeight, '20px');
    assert.equal(cell.style.padding, '14px 28px');
    assert.equal(parseInt(cell.style.lineHeight) + 2 * parseInt(cell.style.paddingTop), 48);
    for (const td of host.querySelectorAll('td')) {
      assert.ok(td.style.lineHeight, 'Every text-containing cell has an explicit line height');
      assert.match(td.getAttribute('style'), /mso-line-height-rule: exactly/);
    }
    for (const match of m.source.matchAll(/(font-size|line-height|height|padding):\s*([^;]+);/g)) {
      for (const value of match[2].matchAll(/(\d+)px/g)) {
        if (match[1] === 'font-size' && value[1] === '13') continue;
        if (match[1] === 'padding' && match[2] === cell.style.padding) continue;
        assert.equal(Number(value[1]) % 4, 0, match[0]);
      }
    }
    assert.deepEqual(Array.from(E.problems(m)), []);
    assert.equal(JSON.stringify(C.parse(C.render(m)).issues), '[]');
    const page = fs.readFileSync(
      path.join(root, 'docs/clients/esc/esc-tv/modules/esc-tv-lead/index.html'),
      'utf8',
    );
    const definition = JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))), definition);
  } finally {
    await dom.happyDOM.close();
  }
});

test('ESC TV Button Row keeps all button styles on a 48px painted Outlook layout', async () => {
  const { BlockCore: C, BlockExport: E, dom } = await environment();
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/esc-tv.jarrang.json')));
    const m = p.modules.find((m) => m.slug === 'esc-tv-button-row');
    const host = dom.document.createElement('div');
    for (const style of ['primary', 'white', 'outline']) {
      const values = Object.fromEntries(
        m.fields.filter((f) => /button\d_style/.test(f.key)).map((f) => [f.id, style]),
      );
      host.innerHTML = C.render(m, values);
      const buttons = host.querySelectorAll('.esc-btn, .esc-btn-white, .esc-btn-outline');
      assert.equal(buttons.length, 3);
      for (const button of buttons) {
        const cell = button.querySelector('td');
        assert.equal(parseInt(button.style.borderSpacing), 0);
        assert.equal(button.getAttribute('cellspacing'), '0');
        const border = parseInt(button.style.border);
        assert.equal(border, 0);
        const cellBorder = parseInt(cell.style.border);
        assert.equal(cellBorder, style === 'outline' ? 2 : 0);
        if (style === 'outline') {
          assert.match(cell.getAttribute('style'), /border: 2px solid #ffffff/);
          assert.match(cell.getAttribute('style'), /mso-border-alt: solid #ffffff 1.5pt/);
        }
        assert.equal(
          parseInt(cell.style.lineHeight) +
            2 * parseInt(cell.style.paddingTop) +
            2 * (border + cellBorder),
          48,
        );
        assert.equal(parseInt(cell.style.paddingLeft) + border + cellBorder, 24);
        assert.equal(
          cell.getAttribute('bgcolor'),
          { primary: '%%=v(@ButtonBgColour)=%%', white: '#ffffff', outline: '#011933' }[style],
        );
        assert.ok(
          cell
            .getAttribute('style')
            .includes('background-color: ' + cell.getAttribute('bgcolor') + ';'),
        );
        if (style === 'outline')
          assert.ok(
            button.getAttribute('style').includes('background-color: transparent !important;'),
          );
      }
      for (const td of host.querySelectorAll('td')) {
        assert.ok(td.style.lineHeight);
        assert.match(td.getAttribute('style'), /mso-line-height-rule: exactly/);
      }
      assert.equal(JSON.stringify(C.parse(C.render(m, values)).issues), '[]');
    }
    assert.deepEqual(Array.from(E.problems(m)), []);
    const page = fs.readFileSync(
      path.join(root, 'docs/clients/esc/esc-tv/modules/esc-tv-button-row/index.html'),
      'utf8',
    );
    const definition = JSON.parse(page.match(/id="block-definition"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(E.definition(E.themedModule(p, m)))), definition);
  } finally {
    await dom.happyDOM.close();
  }
});

test('all ESC button variants use painted cells, zero spacing and whole-point total heights', async () => {
  const { BlockCore: C, dom } = await environment();
  try {
    const suites = ['newsletter', 'congress', 'esc-tv'].map((name) =>
      JSON.parse(fs.readFileSync(path.join(root, 'projects/esc/' + name + '.jarrang.json'))),
    );
    const host = dom.document.createElement('div');
    let checked = 0;
    for (const p of suites)
      for (const m of p.modules.filter((m) => m.source.includes('esc-btn'))) {
        const shown = Object.fromEntries(
          m.fields.filter((f) => f.type === 'toggle').map((f) => [f.id, 'shown']),
        );
        const variants = [shown];
        for (const f of m.fields.filter((f) => f.type === 'select'))
          for (const option of f.options) variants.push({ ...shown, [f.id]: option.value });
        for (const values of variants) {
          const flags = Object.fromEntries(
            m.fields
              .filter((f) => f.type === 'url' && f.allowConversionTracking)
              .map((f) => [f.id, true]),
          );
          const lists = Object.fromEntries(
            m.fields
              .filter((f) => f.type === 'list')
              .map((f) => [
                f.id,
                f.defaultValue.map((row) => ({
                  ...row,
                  [C.conversionKey]: Object.fromEntries(
                    f.itemFields
                      .filter((child) => child.type === 'url' && child.allowConversionTracking)
                      .map((child) => [child.key, true]),
                  ),
                })),
              ]),
          );
          host.innerHTML = C.render(m, { ...values, ...lists, [C.conversionKey]: flags });
          assert.equal(
            host.querySelector('a.esc-btn, a.esc-btn-white, a.esc-btn-outline'),
            null,
            m.slug,
          );
          for (const table of host.querySelectorAll(
            'table.esc-btn, table.esc-btn-white, table.esc-btn-outline',
          )) {
            const cell = table.querySelector('td');
            const style = table.getAttribute('style');
            assert.equal(parseInt(table.style.borderSpacing), 0, m.slug);
            assert.match(style, /mso-table-lspace: 0pt/);
            assert.match(style, /mso-table-rspace: 0pt/);
            const border = Number(style.match(/(?:^|;)\s*border:\s*(\d+)/)?.[1]);
            assert.equal(
              border,
              table.classList.contains('esc-btn-outline')
                ? m.slug === 'hero-story'
                  ? 1
                  : m.slug === 'esc-tv-button-row'
                    ? 0
                    : 2
                : 0,
              m.slug,
            );
            assert.ok(cell.getAttribute('bgcolor'), m.slug);
            assert.ok(
              cell
                .getAttribute('style')
                .includes('background-color: ' + cell.getAttribute('bgcolor') + ';'),
              m.slug,
            );
            const cellBorder = parseInt(cell.style.border);
            assert.equal(
              cellBorder,
              m.slug === 'esc-tv-button-row' && table.classList.contains('esc-btn-outline') ? 2 : 0,
              m.slug,
            );
            assert.match(cell.getAttribute('style'), /mso-line-height-rule: exactly/);
            const total =
              parseInt(cell.style.lineHeight) +
              parseInt(cell.style.paddingTop) +
              parseInt(cell.style.paddingBottom) +
              2 * (border + cellBorder);
            assert.ok(total > 0 && total % 4 === 0, m.slug + ': ' + total);
            assert.doesNotMatch(cell.innerHTML, /mso-(?:font-width|text-raise):\s*\d+%/);
            assert.equal(cell.querySelector('a').getAttribute('conversion'), 'true', m.slug);
            checked++;
          }
        }
      }
    assert.ok(checked > 100, 'Exercise default and selectable button variants');
    const shared = fs.readFileSync(
      path.join(root, 'integrations/esc/email-settings/Brand-Dependent-Styles.html'),
      'utf8',
    );
    assert.match(shared, /\.esc-btn,\.esc-btn-white\{[^}]*border:0 !important/);
    assert.match(
      shared,
      /\.esc-btn-outline,a\.esc-btn-outline\{[^}]*border-color:#ffffff !important/,
    );
    assert.doesNotMatch(shared, /\.esc-btn,\.esc-btn-white\{[^}]*border:1px/);
    for (const css of [
      shared,
      fs.readFileSync(
        path.join(root, 'integrations/esc/email-settings/ESC-Email-Example.html'),
        'utf8',
      ),
    ]) {
      assert.match(
        css,
        /\[data-ogsc\] \.esc-btn,\[data-ogsc\] \.esc-btn-white\{[^}]*border:0 !important/,
      );
      assert.match(
        css,
        /\[data-ogsc\] \.esc-btn-outline,\[data-ogsc\] a\.esc-btn-outline\{[^}]*border-color:#ffffff !important/,
      );
      assert.doesNotMatch(css, /border:1px solid #(?:f0ebe4|ffffff) !important/);
    }
  } finally {
    await dom.happyDOM.close();
  }
});
