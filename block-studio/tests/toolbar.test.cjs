const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
function mount(toolbar, allowLinks = true) {
  function el(tag) {
    return {
      tag,
      children: [],
      attrs: {},
      append(...nodes) {
        this.children.push(...nodes);
      },
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    };
  }
  const context = {
    window: { BlockCore: { cleanRich: (v) => v } },
    document: { createElement: el },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require.resolve('../src/rich-editor.js'), 'utf8'), context);
  const parent = el('div'),
    input = context.window.BlockRichText.mount(
      parent,
      { label: 'Body', toolbar, allowLinks },
      'Original',
      () => {},
    );
  return {
    input,
    toolbar: parent.children[0],
    keys: context.window.BlockRichText.tools.map((t) => t[0]),
    buttons: parent.children[0].children.flatMap((g) => g.children),
  };
}
test('legacy fields retain all twelve tools', () => assert.equal(mount().buttons.length, 12));
test('each toolbar option can be hidden independently', () => {
  for (const key of mount().keys) {
    const view = mount({ [key]: false });
    assert.equal(view.buttons.length, 11);
  }
});
test('link controls and bold can be disabled while retaining the other nine tools', () => {
  const view = mount({ bold: false, link: false, unlink: false });
  assert.equal(view.buttons.length, 9);
  assert(
    !view.buttons.some((b) =>
      ['Bold', 'Add or edit link', 'Remove link'].includes(b.attrs['aria-label']),
    ),
  );
  assert.equal(view.toolbar.children.length, 4);
});
test('all controls off hides the empty toolbar without removing editable content', () => {
  const view = mount(Object.fromEntries(mount().keys.map((k) => [k, false])));
  assert.equal(view.toolbar.hidden, true);
  assert.equal(view.input.contentEditable, 'true');
  assert.equal(view.input.innerHTML, 'Original');
});
test('disabled bold blocks keyboard and beforeinput routes; enabled italic remains usable', () => {
  const { input } = mount({ bold: false });
  let blocked = 0;
  input.onkeydown({
    ctrlKey: true,
    key: 'b',
    preventDefault() {
      blocked++;
    },
  });
  input.onbeforeinput({
    inputType: 'formatBold',
    preventDefault() {
      blocked++;
    },
  });
  input.onkeydown({
    metaKey: true,
    key: 'i',
    preventDefault() {
      blocked++;
    },
  });
  assert.equal(blocked, 2);
});
test('a surrounding link overrides client toolbar settings', () => {
  const view = mount({ link: true, unlink: true }, false);
  assert.equal(view.buttons.length, 10);
});
test('list tools are grouped together and each can be blocked at the input level', () => {
  const view = mount();
  const group = view.toolbar.children.find((g) => g.attrs['aria-label'] === 'Lists');
  assert.deepEqual(
    group.children.map((b) => b.attrs['aria-label']),
    ['Bulleted list', 'Numbered list', 'List style'],
  );
  let blocked = 0;
  const { input } = mount({ bulletList: false, numberList: false });
  for (const inputType of ['insertUnorderedList', 'insertOrderedList'])
    input.onbeforeinput({ inputType, preventDefault: () => blocked++ });
  assert.equal(blocked, 2);
});
