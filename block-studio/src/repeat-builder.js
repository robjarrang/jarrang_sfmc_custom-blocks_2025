/* Guided repeating-group conversion. Work on a clone until the field editor is saved. */
(function (root) {
  'use strict';
  const C = root.BlockCore;
  const names = {
    li: 'List item',
    a: 'Button or link',
    td: 'Content cell',
    tr: 'Table row',
    table: 'Table section',
    div: 'Section',
    p: 'Paragraph',
    span: 'Text container',
  };
  function candidates(module, fieldId, range) {
    const nodes = C.parse(module.source).nodes,
      field = module.fields.find((f) => f.id === fieldId);
    return nodes
      .filter(
        (n) =>
          !n.hidden &&
          names[n.tag] &&
          (range
            ? n.start <= range.start &&
              n.end >= range.end &&
              (range.start !== range.end || range.start < n.end)
            : !field ||
              field.targets.some((t) => t.start >= n.start && t.end <= n.end) ||
              (field.binding === 'template' &&
                [...module.source.slice(n.start, n.end).matchAll(/{{\s*([A-Za-z_]\w*)/g)].some(
                  (match) => match[1] === (field.key || field.id),
                ))),
      )
      .map((n) => {
        const result = {
          start: n.start,
          startEnd: n.startEnd,
          end: n.end,
          nodeId: n.id,
          tag: n.tag,
          label: names[n.tag],
          siblings: nodes.filter(
            (x) => x.parent === n.parent && x.tag === n.tag && x.id !== n.id && !x.hidden,
          ).length,
        };
        try {
          const draft = JSON.parse(JSON.stringify(module)),
            group = C.repeatSelection(draft, n.start, n.end);
          result.fields = group.itemFields.map((f) => f.label);
        } catch (e) {
          result.error = e.message;
        }
        return result;
      })
      .sort((a, b) => a.end - a.start - (b.end - b.start));
  }
  function open(module, fieldId, onCreate, range) {
    const options = candidates(module, fieldId, range),
      dialog = document.createElement('dialog');
    dialog.className = 'repeat-builder';
    const el = (tag, text) => {
      const n = document.createElement(tag);
      if (text) n.textContent = text;
      return n;
    };
    const title = el('h2', 'Choose the item to repeat');
    title.id = 'repeat-builder-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const help = el(
      'p',
      'Choose a complete item. The outline shows exactly what will repeat. Nothing changes until you save the group.',
    );
    const select = el('select');
    select.id = 'repeat-boundary';
    const label = el('label', 'Item boundary');
    label.htmlFor = select.id;
    options.forEach((option, i) => {
      const o = el(
        'option',
        option.label + ' · ' + (option.error ? 'unavailable' : option.fields.join(', ')),
      );
      o.value = String(i);
      o.disabled = !!option.error;
      select.append(o);
    });
    const first = options.findIndex((o) => !o.error);
    select.value = String(first);
    const preview = el('iframe');
    preview.title = 'Highlighted repeating item';
    preview.setAttribute('sandbox', '');
    const codeDetails = el('details'),
      codeTitle = el('summary', 'HTML that will repeat'),
      code = el('pre');
    code.className = 'repeat-boundary-code';
    code.tabIndex = 0;
    codeDetails.append(codeTitle, code);
    codeDetails.open = !!range;
    const detail = el('p'),
      siblings = el('p'),
      ack = el('input');
    ack.type = 'checkbox';
    ack.id = 'repeat-siblings';
    const ackLabel = el('label');
    ackLabel.htmlFor = ack.id;
    ackLabel.append(
      ack,
      document.createTextNode(' Keep the other same-type sibling elements unchanged.'),
    );
    const error = el('p');
    error.setAttribute('role', 'alert');
    const actions = el('div');
    actions.className = 'dialog-actions';
    const cancel = el('button', 'Cancel'),
      next = el('button', 'Set up repeating group');
    cancel.type = next.type = 'button';
    cancel.className = 'button secondary';
    next.className = 'button primary';
    cancel.onclick = () => dialog.close();
    let previewReady = false;
    function show() {
      previewReady = false;
      ack.checked = false;
      error.textContent = '';
      const option = options[Number(select.value)];
      next.disabled = !option || !!option.error;
      ackLabel.hidden = !option?.siblings;
      if (!option || option.error) {
        detail.textContent =
          options.find((option) => option.error)?.error ||
          'No complete item was found. Place the cursor inside the HTML element you want to repeat.';
        siblings.textContent = '';
        return;
      }
      code.textContent = module.source.slice(option.start, option.end);
      detail.textContent =
        'Fields inside: ' + option.fields.join(', ') + '. One starting item will be created.';
      siblings.textContent = option.siblings
        ? option.siblings +
          ' other <' +
          option.tag +
          '> sibling element(s) remain outside this group. They will not be imported, removed or repeated.'
        : 'No other same-type sibling elements were found.';
      try {
        const marker = ' data-repeat-candidate="true"',
          at = option.startEnd - 1;
        const draft = JSON.parse(JSON.stringify(module));
        C.rebase(draft, [{ start: at, end: at, value: marker }]);
        const html = C.render(draft);
        const view = {
          ...module,
          contextCss:
            (module.contextCss || '') +
            '[data-repeat-candidate]{outline:3px solid #080043!important;outline-offset:-3px;background-color:#59dbca33!important}',
        };
        preview.srcdoc = root.BlockPreview.documentHTML(html, view);
      } catch (e) {
        error.textContent = e.message;
        next.disabled = true;
        return;
      }
      previewReady = true;
      next.disabled = !!option.siblings;
    }
    ack.onchange = () => {
      next.disabled = !previewReady || !ack.checked;
    };
    select.onchange = show;
    next.onclick = () => {
      const option = options[Number(select.value)];
      if (!previewReady || !option || option.error || (option.siblings && !ack.checked)) return;
      try {
        const draft = JSON.parse(JSON.stringify(module)),
          group = C.repeatSelection(draft, option.start, option.end);
        group.label =
          option.tag === 'li' ? 'List items' : option.tag === 'a' ? 'Buttons' : 'Repeating group';
        dialog.close();
        onCreate(group, draft);
      } catch (e) {
        error.textContent = e.message;
      }
    };
    actions.append(cancel, next);
    dialog.append(
      title,
      help,
      label,
      select,
      preview,
      codeDetails,
      detail,
      siblings,
      ackLabel,
      error,
      actions,
    );
    document.body.append(dialog);
    dialog.onclose = () => dialog.remove();
    show();
    dialog.showModal();
  }
  function singleDraft(module, fieldId, itemIndex = 0) {
    const draft = JSON.parse(JSON.stringify(module));
    const field = draft.fields.find((f) => f.id === fieldId && f.type === 'list');
    if (!field) throw Error('This repeating group is no longer available.');
    const groupKey = field.key || field.id;
    const model = root.BlockCodeEditor.scan(draft.source);
    const loops = model.groups.filter(
      (g) =>
        g.kind === 'for' &&
        model.tokens[g.members[0]].text.match(/{%\s*for\s+\w+\s+in\s+(\w+)\s*%}/)?.[1] ===
          field.key,
    );
    if (loops.length !== 1)
      throw Error(
        'This group needs one directly connected loop to convert automatically. Review its connections in Template code.',
      );
    const loop = loops[0],
      opening = model.tokens[loop.members[0]],
      closing = model.tokens[loop.members.at(-1)];
    const alias = opening.text.match(/{%\s*for\s+(\w+)/)[1];
    const logicTokens = model.tokens.filter((t) => ['expression', 'logic'].includes(t.kind));
    const words = (text) =>
      text.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_]\w*(?:\.\w+)*/g) || [];
    if (
      logicTokens.some(
        (t) =>
          (t.start < loop.start || t.start >= loop.end) &&
          words(t.text).some((w) => w.split('.')[0] === groupKey),
      )
    )
      throw Error(
        'Other template logic uses this group. Update those connections before making it non-repeatable.',
      );
    const bodyEnd = loop.members.length > 2 ? model.tokens[loop.members[1]].start : closing.start;
    const body = draft.source.slice(opening.end, bodyEnd);
    if (
      /{%\s*for\b/.test(body) ||
      logicTokens.some(
        (t) =>
          t.start >= opening.end &&
          t.end <= bodyEnd &&
          words(t.text).some((w) => w === 'forloop' || w.startsWith('forloop.')),
      )
    )
      throw Error(
        'This item uses nested loops or loop counters. Update that custom logic before making it non-repeatable.',
      );
    const rows = field.defaultValue;
    if (rows.length && (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= rows.length))
      throw Error('Choose a starting item to keep.');
    const values =
      rows[itemIndex] || Object.fromEntries(field.itemFields.map((f) => [f.key, f.defaultValue]));
    const replacements = new Map(),
      promoted = [];
    for (const child of field.itemFields) {
      const identity = C.templateField(draft, child.type, child.label);
      const next = {
        ...JSON.parse(JSON.stringify(child)),
        id: identity.id,
        key: identity.key,
        targets: [],
        binding: 'template',
        defaultValue: JSON.parse(JSON.stringify(values[child.key] ?? child.defaultValue)),
      };
      replacements.set(alias + '.' + child.key, next.key);
      promoted.push(next);
      draft.fields.push(next);
    }
    const replacement = body.replace(/{{[\s\S]*?}}|{%[\s\S]*?%}/g, (token) =>
      token.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_]\w*(?:\.\w+)*/g, (word) => {
        if (replacements.has(word)) return replacements.get(word);
        if (word === alias || word.startsWith(alias + '.') || word.split('.')[0] === groupKey)
          throw Error(
            'This item uses a custom group expression that cannot be converted automatically.',
          );
        return word;
      }),
    );
    const index = draft.fields.findIndex((f) => f.id === fieldId);
    draft.fields = draft.fields.filter((f) => !promoted.includes(f));
    C.rebase(draft, [{ start: loop.start, end: loop.end, value: replacement }], [fieldId]);
    draft.fields.splice(index, 0, ...promoted);
    C.render(draft);
    return { draft, fields: promoted };
  }
  root.BlockRepeatBuilder = { candidates, open, singleDraft };
})(window);
