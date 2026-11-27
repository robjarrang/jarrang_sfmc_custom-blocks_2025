(function (root) {
  'use strict';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let linkSerial = 0;
  // Keep the address and subject separate in the editor and save one destination string.
  function linkDestination(input, onChange, onBlur) {
    const C = root.BlockCore;
    input.placeholder = 'Web URL or email address';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    const options = document.createElement('div'),
      status = document.createElement('p'),
      label = document.createElement('label'),
      subject = document.createElement('input');
    status.className = 'help';
    status.setAttribute('role', 'status');
    status.textContent = 'Opens a new email.';
    subject.type = 'text';
    subject.className = 'control';
    subject.id = 'email-subject-' + ++linkSerial;
    label.htmlFor = subject.id;
    label.textContent = 'Email subject (optional)';
    options.append(status, label, subject);
    input.after(options);

    let displayed, raw, email;
    const decode = (part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    };
    const isSubject = (header) => decode(header.split('=', 1)[0]).toLowerCase() === 'subject';
    const assemble = (recipient, headers) =>
      recipient + (headers.length ? '?' + headers.join('&') : '');
    function read() {
      displayed = raw = input.value;
      const href = C.normaliseLink(raw);
      const valid = !!href && C.validUrl(href, 'url');
      options.hidden = !valid || !/^mailto:/i.test(href);
      email = null;
      if (options.hidden) {
        if (valid) subject.value = '';
        return;
      }
      const split = href.indexOf('?');
      const recipient = split < 0 ? href : href.slice(0, split);
      const headers =
        split < 0
          ? []
          : href
              .slice(split + 1)
              .split('&')
              .filter(Boolean);
      const index = headers.findIndex(isSubject);
      if (index >= 0) {
        subject.value = decode(headers[index].replace(/^[^=]*=?/, ''));
      } else if (split >= 0) subject.value = '';
      email = { recipient, headers, index, originalSubject: index >= 0 ? subject.value : '' };
    }
    function tidy() {
      if (email?.index >= 0) {
        const { recipient, headers } = email;
        const address = recipient.slice(7);
        const rest = headers.filter((header) => !isSubject(header));
        displayed = input.value =
          !rest.length && C.normaliseLink(address) === recipient
            ? address
            : assemble(recipient, rest);
      }
      if (!input.value.trim()) subject.value = '';
    }
    function value() {
      if (displayed !== input.value) read();
      if (!email || subject.value === email.originalSubject) return raw;
      const { recipient, headers, index } = email;
      const remaining = headers.filter((header) => !isSubject(header));
      if (subject.value.trim())
        remaining.splice(
          index < 0 ? remaining.length : index,
          0,
          'subject=' + encodeURIComponent(subject.value),
        );
      return assemble(recipient, remaining);
    }
    input.addEventListener('input', () => {
      read();
      onChange?.(value());
    });
    input.addEventListener('blur', tidy);
    subject.addEventListener('input', () => onChange?.(value()));
    if (onBlur) subject.addEventListener('focusout', onBlur);
    read();
    tidy();
    return value;
  }
  // Shared by URL fields and the formatted-text link dialogue.
  function linkOptions(parent, field, initial, onChange) {
    const C = root.BlockCore;
    const attributes = C.linkAttributes.filter(([, allow]) => field[allow] === true);
    if (!attributes.length && field.allowConversionTracking !== true) return parent;
    const details = document.createElement('details'),
      summary = document.createElement('summary');
    details.className = 'link-options';
    summary.textContent = 'Link options';
    details.append(summary);
    for (const [attr, , , caption] of attributes) {
      const label = document.createElement('label'),
        input = document.createElement('input');
      input.type = 'text';
      input.className = 'control';
      input.id = 'link-option-' + ++linkSerial;
      label.htmlFor = input.id;
      label.textContent = caption;
      input.value = initial[attr] || '';
      input.oninput = () => onChange(attr, input.value);
      details.append(label, input);
    }
    parent.append(details);
    return details;
  }
  function pastedListItems(html) {
    if (!/<li[\s>]/i.test(html)) return [];
    // Parse clipboard markup in inert template contents. Only item text is imported.
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const node of template.content.querySelectorAll('script, style, template, noscript'))
      node.remove();
    return [...template.content.querySelectorAll('li')]
      .map((item) => {
        const ownText = item.cloneNode(true);
        for (const list of ownText.querySelectorAll('ul, ol')) list.remove();
        for (const br of ownText.querySelectorAll('br')) br.replaceWith(' ');
        return ownText.textContent.replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean);
  }
  function pasteList(parent, field, onReplace) {
    const C = root.BlockCore;
    const textField = field.itemFields.find((item) => item.key === field.pasteTextKey);
    const details = document.createElement('details'),
      summary = document.createElement('summary'),
      input = document.createElement('textarea'),
      replace = document.createElement('button'),
      error = document.createElement('p');
    details.className = 'paste-list';
    summary.textContent = 'Paste list';
    input.className = 'control';
    input.rows = 4;
    input.setAttribute('aria-label', field.label + ' to paste');
    input.placeholder = 'Paste bullets or one item per line';
    replace.type = 'button';
    replace.className = 'add-repeat-item';
    replace.textContent = 'Replace items';
    error.className = 'field-error';
    error.setAttribute('aria-live', 'polite');
    input.oninput = () => (error.textContent = '');
    input.onpaste = (event) => {
      const items = pastedListItems(event.clipboardData?.getData('text/html') || '');
      if (!items.length) return;
      event.preventDefault();
      input.value = items.map((text) => '• ' + text).join('\n');
      error.textContent = '';
    };
    replace.onclick = () => {
      const htmlItems = pastedListItems(input.value);
      const lines = input.value
        .split(/\r?\n|\r/)
        .map((line) => line.trim())
        .filter(Boolean);
      const marked = lines
        .map((line) => /^(?:[•◦▪‣●○·✓]\s*|(?:[-–—*]|\d+[.)])\s+)(.+)$/.exec(line)?.[1])
        .filter(Boolean);
      const items = htmlItems.length ? htmlItems : marked.length ? marked : lines;
      if (!items.length) {
        error.textContent = 'Paste at least one item.';
        return;
      }
      const defaults = Object.fromEntries(
        field.itemFields.map((item) => [item.key, item.defaultValue]),
      );
      const rows = items.map((text) => ({
        ...clone(defaults),
        [textField.key]: textField.type === 'richtext' ? C.escape(text.trim()) : text.trim(),
      }));
      error.textContent = C.validate(field, rows);
      if (error.textContent) return;
      input.value = '';
      details.open = false;
      onReplace(rows);
    };
    details.append(summary, input, replace, error);
    parent.append(details);
  }
  function mount(container, fields, values, onChange, options = {}) {
    const C = root.BlockCore,
      refs = new Map(),
      prefix = options.prefix || '';
    container.replaceChildren();
    for (const field of C.editableFields(fields)) {
      if (!Object.hasOwn(values, field.id))
        values[field.id] = clone(
          field.legacyItem || field.legacyRows ? C.fieldValue(field, values) : field.defaultValue,
        );
      const group = document.createElement('div');
      group.className = 'field trial-field' + (field.type === 'toggle' ? ' inline-toggle' : '');
      const label = document.createElement('label');
      label.htmlFor = prefix + field.id;
      label.textContent = field.label + (field.required ? ' *' : '');
      group.append(label);
      const error = document.createElement('p');
      error.className = 'field-error';
      error.id = prefix + field.id + '-error';
      error.setAttribute('aria-live', 'polite');
      let input;
      const changed = (value) => {
        const legacy = field.legacyVisibilityId;
        if (legacy) {
          // Editing one field should not bring back sibling copy hidden by the old switch.
          if (['hidden', false].includes(values[legacy]))
            for (const other of fields)
              if (other.legacyVisibilityId === legacy) values[other.id] = '';
          values[legacy] = 'shown';
        }
        values[field.id] = value;
        const issue = C.validate(field, value);
        error.textContent = issue;
        input.setAttribute('aria-invalid', String(!!issue));
        onChange(field, value);
      };
      if (field.type === 'list') {
        input = document.createElement('div');
        input.className = 'repeat-items';
        const itemFields = C.editableItemFields(field).map((f) => ({ ...f, id: f.key }));
        function focusItem(index, action) {
          const card = input.querySelectorAll('.repeat-card')[index];
          const sameAction =
            action &&
            [...(card?.querySelectorAll('.repeat-heading button') || [])].find(
              (b) => b.textContent === action && !b.disabled,
            );
          const target =
            sameAction ||
            card?.querySelector(
              'textarea, input:not([type=hidden]), select, [contenteditable=true]',
            ) ||
            input.querySelector('.add-repeat-item');
          target?.focus();
        }
        function draw() {
          input.replaceChildren();
          const rows = values[field.id];
          rows.forEach((row, index) => {
            const card = document.createElement('section');
            card.className = 'repeat-card';
            const head = document.createElement('div');
            head.className = 'repeat-heading';
            const name = document.createElement('strong');
            name.textContent = 'Item ' + (index + 1);
            head.append(name);
            const action = (text, title, disabled, run, destination = () => index) => {
              const b = document.createElement('button');
              b.type = 'button';
              b.textContent = text;
              b.title = title;
              b.setAttribute('aria-label', title + ' ' + (index + 1));
              b.disabled = disabled;
              b.onclick = () => {
                run();
                changed(clone(rows));
                draw();
                focusItem(destination(), text);
              };
              head.append(b);
            };
            action(
              '↑',
              'Move up item',
              index === 0,
              () => ([rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]),
              () => index - 1,
            );
            action(
              '↓',
              'Move down item',
              index === rows.length - 1,
              () => ([rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]),
              () => index + 1,
            );
            action(
              'Duplicate',
              'Duplicate item',
              rows.length >= (field.maxItems ?? 50),
              () => rows.splice(index + 1, 0, clone(row)),
              () => index + 1,
            );
            action(
              'Remove',
              'Remove item',
              rows.length <= (field.minItems ?? 0),
              () => rows.splice(index, 1),
              () => Math.min(index, rows.length - 1),
            );
            card.append(head);
            const body = document.createElement('div');
            card.append(body);
            for (const item of itemFields)
              if (item.legacyTextKey && !Object.hasOwn(row, item.key))
                row[item.key] = C.listItemValue(field, item, row);
            mount(body, itemFields, row, () => changed(clone(rows)), {
              prefix: prefix + field.id + '-' + index + '-',
            });
            input.append(card);
          });
          const add = document.createElement('button');
          add.type = 'button';
          add.className = 'add-repeat-item';
          add.textContent = '＋ Add item';
          add.disabled = rows.length >= (field.maxItems ?? 50);
          add.onclick = () => {
            rows.push(
              Object.fromEntries(field.itemFields.map((f) => [f.key, clone(f.defaultValue)])),
            );
            changed(clone(rows));
            draw();
            focusItem(rows.length - 1);
          };
          input.append(add);
          const note = document.createElement('p');
          note.className = 'help';
          note.textContent = rows.length + ' of ' + (field.maxItems ?? 50) + ' items';
          input.append(note);
        }
        if (field.pasteTextKey)
          pasteList(group, field, (rows) => {
            changed(rows);
            draw();
            focusItem(0);
          });
        draw();
      } else if (field.type === 'toggle') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = values[field.id] === true || values[field.id] === 'shown';
        input.className = field.style === 'checkbox' ? '' : 'toggle-switch';
        input.onchange = () => changed(input.checked ? 'shown' : 'hidden');
      } else if (field.type === 'select') {
        input = document.createElement('select');
        (field.options || []).forEach((o) => {
          const el = document.createElement('option');
          el.value = o.value;
          el.textContent = o.label;
          input.append(el);
        });
        input.value = values[field.id];
        input.onchange = () => changed(input.value);
      } else if (field.type === 'richtext') {
        input = root.BlockRichText.mount(group, field, C.fieldValue(field, values), changed);
      } else {
        input = document.createElement(field.type === 'text' ? 'textarea' : 'input');
        if (input.tagName === 'TEXTAREA') input.rows = 2;
        else input.type = field.type === 'number' ? 'number' : 'text';
        input.value = C.fieldValue(field, values);
        if (field.type === 'colour') {
          const picker = document.createElement('input');
          picker.type = 'color';
          picker.className = 'colour-picker';
          picker.setAttribute('aria-label', field.label + ' picker');
          picker.value = /^#[0-9a-f]{6}$/i.test(values[field.id]) ? values[field.id] : '#ffffff';
          picker.oninput = () => {
            input.value = picker.value;
            changed(picker.value);
          };
          group.append(picker);
          input.oninput = () => {
            if (/^#[0-9a-f]{6}$/i.test(input.value)) picker.value = input.value;
            changed(input.value);
          };
        } else if (field.type !== 'url') input.oninput = () => changed(input.value);
      }
      input.id = prefix + field.id;
      if (field.type !== 'toggle' && field.type !== 'list') input.classList.add('control');
      input.setAttribute('aria-describedby', error.id);
      if (options.onBlur) input.addEventListener('focusout', options.onBlur);
      if (field.type === 'select') {
        const wrapper = document.createElement('div');
        wrapper.className = 'select-control';
        wrapper.append(input);
        group.append(wrapper);
      } else group.append(input);
      let linkParent = group;
      if (field.type === 'url') {
        linkDestination(input, changed, options.onBlur);
        const choice = C.linkOptionsChoice(field, values);
        linkParent = linkOptions(group, field, choice, (name, text) => {
          values[C.linkOptionsKey] = {
            ...C.linkOptionsData(values[C.linkOptionsKey]),
            [field.id]: { ...choice, [name]: text },
          };
          choice[name] = text;
          onChange(field, values[field.id]);
        });
        if (field.allowLinkTitle || field.allowTrackingAlias)
          values[C.linkOptionsKey] = {
            ...C.linkOptionsData(values[C.linkOptionsKey]),
            [field.id]: choice,
          };
      }
      if (linkParent !== group && options.onBlur)
        linkParent.addEventListener('focusout', options.onBlur);
      if (field.type === 'url' && field.allowConversionTracking === true) {
        const option = document.createElement('label'),
          check = document.createElement('input');
        option.className = 'conversion-option';
        check.type = 'checkbox';
        check.id = prefix + field.id + '-conversion';
        check.checked = C.conversionChoice(field, values);
        values[C.conversionKey] = {
          ...C.conversionData(values[C.conversionKey]),
          [field.id]: check.checked,
        };
        const available = () => {
          check.disabled = !C.webLink(input.value);
        };
        available();
        input.addEventListener('input', available);
        check.onchange = () => {
          values[C.conversionKey] = {
            ...C.conversionData(values[C.conversionKey]),
            [field.id]: check.checked,
          };
          onChange(field, values[field.id]);
        };
        option.append(check, document.createTextNode('Conversion Tracking Link'));
        linkParent.append(option);
      }
      if (field.help) {
        const help = document.createElement('p');
        help.className = 'help';
        help.textContent = field.help;
        group.append(help);
      }
      if (field.disclosure) {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = field.disclosure;
        details.append(summary, ...group.children);
        group.append(details);
      }
      group.append(error);
      container.append(group);
      refs.set(field.id, { input, error, group });
    }
    return refs;
  }
  root.BlockControls = { mount, linkOptions, linkDestination };
})(window);
