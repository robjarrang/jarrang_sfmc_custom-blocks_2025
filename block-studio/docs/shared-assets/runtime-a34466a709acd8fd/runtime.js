/* Shared editor, used by every independent exported SFMC block. */
(function () {
  'use strict';
  const C = window.BlockCore,
    definition = JSON.parse(document.getElementById('block-definition').textContent);
  const fields = definition.fields.filter((f) => f.enabled),
    form = document.getElementById('fields'),
    status = document.getElementById('status');
  let metadata = {},
    values = {},
    sdk = null,
    timer,
    busy = false,
    dirty = false,
    ready = false;
  let controls = new Map();
  let blockId =
    'bs_' + (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
  const say = (message, error = false) => {
    status.textContent = message;
    status.className = error ? 'status error' : 'status';
  };
  function localPreview(html) {
    const frame = document.getElementById('local-preview');
    if (!frame) return;
    frame.srcdoc =
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: http: data:; style-src \'unsafe-inline\';"><style>body{margin:0;padding:20px;background:#f1f3f5}' +
      (definition.contextCss || '') +
      '</style></head><body>' +
      html +
      '</body></html>';
  }
  function check() {
    controls.forEach((ref) => {
      ref.error.textContent = '';
      ref.input.setAttribute('aria-invalid', 'false');
    });
    try {
      C.render(definition, values, { blockId });
      return true;
    } catch (error) {
      const field = fields.find((f) => error.message.startsWith(f.label + ':'));
      if (field) {
        controls.get(field.id).error.textContent = error.message;
        controls.get(field.id).input.setAttribute('aria-invalid', 'true');
      }
      say(error.message, true);
      return false;
    }
  }
  function save() {
    clearTimeout(timer);
    if (!ready || busy || !dirty) return;
    if (!check()) {
      say('Check the highlighted fields. The last valid content is unchanged.', true);
      return;
    }
    let html;
    const snapshot = JSON.parse(JSON.stringify(values));
    try {
      html = C.render(definition, snapshot, { blockId });
    } catch (e) {
      say(e.message, true);
      return;
    }
    dirty = false;
    if (!sdk) {
      localPreview(html);
      say('Standalone preview. Open this block in SFMC to save email content.');
      return;
    }
    busy = true;
    say('Saving…');
    const timeout = setTimeout(() => {
      busy = false;
      ready = false;
      form.disabled = true;
      say('SFMC did not confirm the save. Reopen the block before continuing.', true);
    }, 10000);
    sdk.setContent(html, (accepted) => {
      if (!ready) return;
      const next = {
        ...metadata,
        studio: {
          schemaVersion: 1,
          blockId,
          moduleId: definition.id,
          moduleVersion: definition.release,
          values: snapshot,
        },
      };
      sdk.setData(next, (saved) => {
        if (!ready) return;
        clearTimeout(timeout);
        metadata = saved || next;
        busy = false;
        say(
          typeof accepted === 'string' && accepted !== html
            ? 'Saved. Content Builder adjusted the HTML; verify the SFMC preview.'
            : 'Saved in Content Builder',
        );
        if (dirty) save();
      });
    });
  }
  function change(field, input) {
    values[field.id] =
      field.type === 'richtext'
        ? input.innerHTML
        : field.type === 'toggle'
          ? input.checked
            ? 'shown'
            : 'hidden'
          : input.value;
    dirty = true;
    say('Unsaved changes');
    clearTimeout(timer);
    timer = setTimeout(save, 200);
  }
  function mount() {
    controls = window.BlockControls.mount(
      form,
      fields,
      values,
      (field, value) => {
        values[field.id] = value;
        dirty = true;
        say('Unsaved changes');
        clearTimeout(timer);
        timer = setTimeout(save, 200);
      },
      { onBlur: save },
    );
    form.disabled = false;
    ready = true;
    if (!sdk) {
      dirty = true;
      save();
    } else say('Ready to edit');
  }
  function load(data) {
    metadata = data || {};
    if (metadata.studio?.blockId) blockId = metadata.studio.blockId;
    if (
      metadata.studio &&
      (metadata.studio.moduleId !== definition.id ||
        metadata.studio.moduleVersion !== definition.release ||
        metadata.studio.schemaVersion !== 1)
    ) {
      say(
        'This content belongs to another module version. Restore its original exported folder to edit it safely.',
        true,
      );
      return;
    }
    try {
      values = Object.fromEntries(
        fields.map((f) => {
          const saved = metadata.studio?.values;
          const value = saved && Object.hasOwn(saved, f.id) ? saved[f.id] : f.defaultValue;
          const error = C.valueShape(f, value);
          if (error) throw Error(f.label + ': ' + error);
          return [f.id, JSON.parse(JSON.stringify(value))];
        }),
      );
    } catch (error) {
      say(
        'The saved field data is invalid. Restore valid block data before editing. ' +
          error.message,
        true,
      );
      return;
    }
    if (sdk && !metadata.studio) {
      let waiting = true;
      const timeout = setTimeout(() => {
        waiting = false;
        say('SFMC did not return the existing content. Reopen the block before editing.', true);
      }, 10000);
      sdk.getContent((content) => {
        if (!waiting) return;
        waiting = false;
        clearTimeout(timeout);
        if (typeof content !== 'string') {
          say('SFMC returned invalid content. Reopen the block before editing.', true);
          return;
        }
        if (content.trim()) {
          say(
            'Existing HTML has no matching Block Studio data. It has been preserved. Use a new block for this module.',
            true,
          );
          return;
        }
        mount();
        dirty = true;
        save();
      });
    } else mount();
  }
  function closeEditor() {
    // The SDK posts blockReadyToClose after this hook. Post the latest state
    // first, without depending on callbacks after the editor iframe closes.
    clearTimeout(timer);
    if (!ready || (!dirty && !busy) || !check()) return;
    try {
      const snapshot = JSON.parse(JSON.stringify(values)),
        html = C.render(definition, snapshot, { blockId });
      ready = false;
      dirty = false;
      sdk.setContent(html);
      sdk.setData({
        ...metadata,
        studio: {
          schemaVersion: 1,
          blockId,
          moduleId: definition.id,
          moduleVersion: definition.release,
          values: snapshot,
        },
      });
    } catch (e) {
      say(e.message, true);
    }
  }
  document.getElementById('block-name').textContent = definition.name;
  if (window.parent === window) {
    document.body.classList.add('standalone');
    const frame = document.createElement('iframe');
    frame.id = 'local-preview';
    frame.title = 'Email preview';
    frame.setAttribute('sandbox', '');
    document.getElementById('standalone-area').append(frame);
    load({});
  } else {
    say('Connecting to Content Builder…');
    const timeout = setTimeout(
      () =>
        say(
          'Unable to connect to Content Builder. Check the installed block endpoint and reopen it.',
          true,
        ),
      10000,
    );
    try {
      sdk = new window.sfdc.BlockSDK({ tabs: [], onEditClose: closeEditor });
      sdk.getData((data) => {
        clearTimeout(timeout);
        load(data);
      });
    } catch (e) {
      clearTimeout(timeout);
      say('The Content Builder SDK could not start. ' + e.message, true);
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
  window.addEventListener('pagehide', save);
})();
