(function (root) {
  'use strict';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  let linkSerial = 0;
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
  function mount(container, fields, values, onChange, options = {}) {
    const C = root.BlockCore,
      refs = new Map(),
      prefix = options.prefix || '';
    container.replaceChildren();
    for (const field of fields) {
      if (!Object.hasOwn(values, field.id)) values[field.id] = clone(field.defaultValue);
      const group = document.createElement('div');
      group.className = 'field trial-field';
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
        values[field.id] = value;
        const issue = C.validate(field, value);
        error.textContent = issue;
        input.setAttribute('aria-invalid', String(!!issue));
        onChange(field, value);
      };
      if (field.type === 'list') {
        input = document.createElement('div');
        input.className = 'repeat-items';
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
            mount(
              body,
              field.itemFields.map((f) => ({ ...f, id: f.key })),
              row,
              () => changed(clone(rows)),
              { prefix: prefix + field.id + '-' + index + '-' },
            );
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
        input = root.BlockRichText.mount(group, field, values[field.id], changed);
      } else {
        input = document.createElement(field.type === 'text' ? 'textarea' : 'input');
        if (input.tagName === 'TEXTAREA') input.rows = 2;
        else input.type = field.type === 'number' ? 'number' : 'text';
        input.value = values[field.id];
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
        } else input.oninput = () => changed(input.value);
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
      group.append(error);
      container.append(group);
      refs.set(field.id, { input, error, group });
    }
    return refs;
  }
  root.BlockControls = { mount, linkOptions };
})(window);
