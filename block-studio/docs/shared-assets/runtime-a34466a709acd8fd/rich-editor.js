/* Selection-aware formatted text, shared by authoring and exported editors. */
(function (root) {
  'use strict';
  const tools = [
    ['bold', 'Bold'],
    ['italic', 'Italic'],
    ['underline', 'Underline'],
    ['superscript', 'Superscript'],
    ['subscript', 'Subscript'],
    ['colour', 'Text colour'],
    ['link', 'Add or edit link'],
    ['unlink', 'Remove link'],
    ['clear', 'Clear formatting'],
  ];
  let serial = 0;
  function mount(group, field, value, onChange) {
    const C = root.BlockCore,
      input = document.createElement('div'),
      toolbar = document.createElement('div'),
      panel = document.createElement('div'),
      message = document.createElement('p');
    input.contentEditable = 'true';
    input.setAttribute('role', 'textbox');
    input.setAttribute('aria-multiline', 'true');
    input.setAttribute('aria-label', field.label);
    input.innerHTML = C.cleanRich(value, field);
    toolbar.className = 'rich-toolbar';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Formatting for ' + field.label);
    panel.className = 'rich-action-panel';
    panel.hidden = true;
    message.className = 'rich-message';
    message.setAttribute('role', 'status');
    const enabled = (key) =>
      field.toolbar?.[key] !== false &&
      (!['link', 'unlink'].includes(key) || field.allowLinks !== false);
    let savedRange = null,
      composing = false;
    const inEditor = (n) => n === input || input.contains(n);
    function capture() {
      const s = window.getSelection();
      if (s?.rangeCount) {
        const r = s.getRangeAt(0);
        if (inEditor(r.startContainer) && inEditor(r.endContainer)) savedRange = r.cloneRange();
      }
      return savedRange && inEditor(savedRange.startContainer) && inEditor(savedRange.endContainer)
        ? savedRange
        : null;
    }
    function restore() {
      const r = capture();
      if (!r) return null;
      input.focus();
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      return r;
    }
    function bookmark() {
      const r = capture();
      if (!r) return null;
      const before = document.createRange();
      before.selectNodeContents(input);
      before.setEnd(r.startContainer, r.startOffset);
      const start = before.toString().length;
      return { start, end: start + r.toString().length };
    }
    function restoreBookmark(mark) {
      if (!mark) return;
      const nodes = [],
        walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
      let n,
        total = 0;
      while ((n = walker.nextNode())) {
        nodes.push({ node: n, start: total, end: total + n.length });
        total += n.length;
      }
      const point = (offset) => {
        const hit = nodes.find((n) => n.end >= offset) || nodes.at(-1);
        return hit
          ? {
              node: hit.node,
              offset: Math.min(hit.node.length, Math.max(0, offset - hit.start)),
            }
          : { node: input, offset: 0 };
      };
      const a = point(mark.start),
        b = point(mark.end),
        range = document.createRange();
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      savedRange = range;
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(range);
    }
    function commit() {
      const mark = bookmark(),
        html = C.cleanRich(input.innerHTML, field);
      if (input.innerHTML !== html) {
        input.innerHTML = html;
        restoreBookmark(mark);
      }
      onChange(html);
      group.dispatchEvent(new CustomEvent('richchange', { bubbles: true }));
    }
    function selected() {
      const r = restore();
      if (!r || r.collapsed) {
        message.textContent = 'Select the text you want to format first.';
        return null;
      }
      message.textContent = '';
      return r;
    }
    function nodeElement(n) {
      return n?.nodeType === 1 ? n : n?.parentElement;
    }
    function anchorAtRange(r) {
      const a = nodeElement(r?.startContainer)?.closest('a');
      return a && input.contains(a) && a.contains(r.endContainer) ? a : null;
    }
    function overlapsLink(r) {
      return [...input.querySelectorAll('a')].some((a) => r.intersectsNode(a));
    }
    function closePanel() {
      panel.hidden = true;
      panel.replaceChildren();
    }
    // Inline SVGs keep the familiar toolbar available in offline exports.
    const icons = {
      Bold: '<path d="M6 4h7a4 4 0 0 1 0 8H6zm0 8h8a4 4 0 0 1 0 8H6z"/>',
      Italic: '<path d="M10 4h9M5 20h9M15 4 9 20"/>',
      Underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/>',
      Superscript: '<path d="m4 9 8 11m0-11L4 20M16 5a2.5 2.5 0 0 1 5 0c0 2-5 3-5 6h5"/>',
      Subscript: '<path d="m4 4 8 11m0-11L4 15M16 16a2.5 2.5 0 0 1 5 0c0 2-5 3-5 6h5"/>',
      'Text colour':
        '<path d="m6 16 6-12 6 12M8 12h8"/><path d="M4 21h16" stroke="#59dbca" stroke-width="3"/>',
      'Add or edit link':
        '<path d="m10 13 4-4m-5 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
      'Remove link':
        '<path d="m9 16-2 2a4 4 0 0 1-6-6l2-2m12-5 2-2a4 4 0 0 1 6 6l-2 2M3 3l18 18"/>',
      'Clear formatting': '<path d="M4 4h14M11 4l-3 12m6 0 6 6m0-6-6 6M3 21h6"/>',
    };
    const toolGroups = {};
    function tool(label, run) {
      const key = tools.find((t) => t[1] === label)[0];
      if (!enabled(key)) {
        const hidden = document.createElement('button');
        hidden.disabled = true;
        return hidden;
      }
      const category = ['Bold', 'Italic', 'Underline'].includes(label)
        ? 'Text style'
        : ['Superscript', 'Subscript', 'Text colour'].includes(label)
          ? 'Text appearance'
          : ['Add or edit link', 'Remove link'].includes(label)
            ? 'Links'
            : 'Reset formatting';
      if (!toolGroups[category]) {
        const section = document.createElement('span');
        section.className = 'rich-tool-group';
        section.setAttribute('role', 'group');
        section.setAttribute('aria-label', category);
        toolbar.append(section);
        toolGroups[category] = section;
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rich-tool';
      b.title = label;
      b.setAttribute('aria-label', label);
      b.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
        icons[label] +
        '</svg>';
      b.onmousedown = (e) => {
        capture();
        e.preventDefault();
      };
      b.onclick = run;
      toolGroups[category].append(b);
      return b;
    }
    function command(name, affectsLink) {
      const r = selected();
      if (!r) return;
      if (affectsLink && overlapsLink(r)) {
        message.textContent =
          'Link appearance is fixed by the module developer. Select text outside the link.';
        return;
      }
      closePanel();
      document.execCommand(name, false);
      commit();
    }
    tool('Bold', () => command('bold', true));
    tool('Italic', () => command('italic', false));
    tool('Underline', () => command('underline', true));
    tool('Superscript', () => command('superscript', false));
    tool('Subscript', () => command('subscript', false));
    function formInput(label, type, value) {
      const l = document.createElement('label'),
        control = document.createElement('input');
      control.type = type;
      control.value = value;
      control.id = 'rich-action-' + ++serial;
      l.htmlFor = control.id;
      l.textContent = label;
      panel.append(l, control);
      return control;
    }
    function action(label, run) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.onclick = run;
      return b;
    }
    function buttons(saveLabel, save) {
      const row = document.createElement('div');
      row.className = 'rich-action-buttons';
      row.append(
        action(saveLabel, save),
        action('Cancel', () => {
          closePanel();
          restore();
        }),
      );
      panel.append(row);
    }
    tool('Text colour', () => {
      const r = selected();
      if (!r) return;
      if (overlapsLink(r)) {
        message.textContent =
          'Link colour is fixed by the module developer. Select text outside the link.';
        return;
      }
      closePanel();
      panel.hidden = false;
      const picker = formInput('Choose text colour', 'color', '#000000'),
        hex = formInput('Text colour hex', 'text', '#000000');
      picker.oninput = () => (hex.value = picker.value);
      hex.oninput = () => {
        const v = C.normaliseColour(hex.value);
        if (v) picker.value = v;
      };
      const issue = document.createElement('p');
      issue.className = 'field-error';
      issue.setAttribute('role', 'alert');
      panel.append(issue);
      buttons('Apply colour', () => {
        const colour = C.normaliseColour(hex.value);
        if (!colour) {
          issue.textContent = 'Enter a hex colour, such as #0055aa.';
          return;
        }
        if (!restore()) {
          issue.textContent = 'Select the text again.';
          return;
        }
        document.execCommand('foreColor', false, colour);
        closePanel();
        commit();
      });
      hex.focus();
      hex.select();
    });
    const linkButton = tool('Add or edit link', () => {
      const r = restore();
      if (!r) {
        message.textContent =
          'Select text to add a link, or place the cursor inside a link to edit it.';
        return;
      }
      const existing = anchorAtRange(r);
      if (!existing && r.collapsed) {
        message.textContent = 'Select the text you want to link first.';
        return;
      }
      if (!existing && overlapsLink(r)) {
        message.textContent = 'Edit one existing link at a time, or select text without a link.';
        return;
      }
      closePanel();
      message.textContent = '';
      panel.hidden = false;
      const destination = formInput(
        'Link destination',
        'text',
        existing?.getAttribute('href') || '',
      );
      destination.placeholder = 'https://example.com/';
      const help = document.createElement('p');
      help.className = 'help';
      help.textContent = 'Link appearance is set by the module developer.';
      panel.append(help);
      const issue = document.createElement('p');
      issue.className = 'field-error';
      issue.setAttribute('role', 'alert');
      panel.append(issue);
      buttons(existing ? 'Update link' : 'Insert link', () => {
        const href = destination.value.trim();
        if (!href || !C.validUrl(href, 'url')) {
          issue.textContent = 'Enter a complete web, mailto or tel link.';
          destination.setAttribute('aria-invalid', 'true');
          return;
        }
        const range = restore();
        if (!range) {
          issue.textContent = 'Select the text again.';
          return;
        }
        if (existing && input.contains(existing)) {
          existing.setAttribute('href', href);
          existing.setAttribute('style', C.linkStyleCSS(field));
        } else {
          const a = document.createElement('a');
          a.setAttribute('href', href);
          a.setAttribute('style', C.linkStyleCSS(field));
          a.append(range.extractContents());
          range.insertNode(a);
          range.selectNodeContents(a);
          savedRange = range;
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        closePanel();
        commit();
      });
      destination.focus();
      destination.select();
    });
    const unlinkButton = tool('Remove link', () => {
      const r = restore(),
        a = r && anchorAtRange(r);
      if (!a) {
        message.textContent = 'Place the cursor inside the link you want to remove.';
        return;
      }
      const mark = bookmark();
      a.replaceWith(...a.childNodes);
      restoreBookmark(mark);
      closePanel();
      commit();
      message.textContent = 'Link removed. The text has been kept.';
    });
    linkButton.disabled = unlinkButton.disabled = field.allowLinks === false;
    if (field.allowLinks === false) {
      linkButton.title = unlinkButton.title =
        'This text is already inside a link. Edit its destination using the separate link field.';
    }
    tool('Clear formatting', () => {
      const r = selected();
      if (!r) return;
      if (overlapsLink(r)) {
        message.textContent =
          'Link appearance is fixed. Use Remove link to keep its text without a destination.';
        return;
      }
      closePanel();
      document.execCommand('removeFormat', false);
      commit();
    });
    toolbar.hidden = !toolbar.children.length;
    input.onkeydown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = { b: 'bold', i: 'italic', u: 'underline', k: 'link' }[e.key.toLowerCase()];
      if (key && !enabled(key)) {
        e.preventDefault();
        message.textContent = 'This formatting option is not available for this field.';
      }
    };
    input.onbeforeinput = (e) => {
      const key = {
        formatBold: 'bold',
        formatItalic: 'italic',
        formatUnderline: 'underline',
        formatSuperscript: 'superscript',
        formatSubscript: 'subscript',
        formatFontColor: 'colour',
        formatRemove: 'clear',
        insertLink: 'link',
      }[e.inputType];
      if (key && !enabled(key)) e.preventDefault();
    };
    input.oninput = () => {
      if (!composing) commit();
    };
    input.oncompositionstart = () => (composing = true);
    input.oncompositionend = () => {
      composing = false;
      commit();
    };
    input.onmouseup = capture;
    input.onkeyup = capture;
    input.onblur = capture;
    input.onclick = (e) => {
      if (nodeElement(e.target)?.closest('a')) e.preventDefault();
    };
    input.onpaste = (e) => {
      e.preventDefault();
      restore();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    };
    panel.onkeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        restore();
      }
    };
    group.append(toolbar, panel, message);
    return input;
  }
  root.BlockRichText = { mount, tools };
})(window);
