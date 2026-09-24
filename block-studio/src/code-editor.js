/* Shared, dependency-free code view. All source rendering uses text nodes. */
(function (root) {
  'use strict';
  const voids = new Set(
    'area base br col embed hr img input link meta param source track wbr'.split(' '),
  );
  const normal = (s) => s.replace(/\r\n?/g, '\n');
  function rawOffset(source, offset) {
    let raw = 0,
      display = 0;
    while (display < offset && raw < source.length) {
      raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1;
      display++;
    }
    return raw;
  }
  function scan(source) {
    const tokens = [],
      groups = [],
      html = [],
      logic = [];
    // Quotes and personalisation inside attributes must not terminate an HTML tag.
    const pattern =
      /<!--[\s\S]*?-->|%%[\s\S]*?%%|{{[\s\S]*?}}|{%[\s\S]*?%}|<\/?[A-Za-z][\w:-]*(?:"[^"]*"|'[^']*'|[^'">])*\/?>|<![^>]*>/g;
    for (const match of source.matchAll(pattern)) {
      const text = match[0],
        kind = text.startsWith('<!--')
          ? 'comment'
          : text.startsWith('%%')
            ? 'personalisation'
            : text.startsWith('{{')
              ? 'expression'
              : text.startsWith('{%')
                ? 'logic'
                : 'tag';
      tokens.push({
        start: match.index,
        end: match.index + text.length,
        text,
        kind,
        group: null,
      });
      if (kind === 'tag')
        for (const child of text.matchAll(/%%[\s\S]*?%%|{{[\s\S]*?}}|{%[\s\S]*?%}/g))
          tokens.push({
            start: match.index + child.index,
            end: match.index + child.index + child[0].length,
            text: child[0],
            kind: child[0].startsWith('%%')
              ? 'personalisation'
              : child[0].startsWith('{{')
                ? 'expression'
                : 'logic',
            group: null,
          });
    }
    tokens.sort((a, b) => a.start - b.start || b.end - a.end);
    tokens.forEach((token, index) => {
      const text = token.text;
      if (token.kind === 'comment') {
        groups.push({
          kind: 'comment',
          start: token.start,
          end: token.end,
          from: token.start + 4,
          to: token.end - 3,
          members: [index],
          label: 'HTML comment',
        });
        return;
      }
      if (token.kind === 'logic') {
        const command = text.slice(2, -2).trim().split(/\s/)[0];
        if (['if', 'for', 'unless'].includes(command))
          logic.push({ command, index, members: [index] });
        else if (['else', 'elsif'].includes(command)) {
          if (logic.length) logic[logic.length - 1].members.push(index);
        } else if (/^end(?:if|for|unless)$/.test(command)) {
          const top = logic[logic.length - 1];
          if (top && command === 'end' + top.command) {
            logic.pop();
            top.members.push(index);
            const first = tokens[top.index];
            const group = {
              kind: top.command,
              start: first.start,
              end: token.end,
              from: first.end,
              to: token.start,
              members: top.members,
              label: first.text,
            };
            groups.push(group);
            top.members.forEach((i) => (tokens[i].group = group));
          }
        }
        return;
      }
      if (token.kind !== 'tag') return;
      const tag = text.match(/^<(\/)?([\w:-]+)/);
      if (!tag) return;
      token.name = tag[2].toLowerCase();
      if (tag[1]) {
        const at = html.map((x) => x.name).lastIndexOf(token.name);
        if (at >= 0) {
          const open = html[at];
          html.splice(at);
          const first = tokens[open.index];
          const group = {
            kind: 'html',
            start: first.start,
            end: token.end,
            from: first.end,
            to: token.start,
            members: [open.index, index],
            label: '<' + token.name + '>',
          };
          groups.push(group);
          first.group = token.group = group;
        }
      } else if (!voids.has(token.name) && !text.endsWith('/>'))
        html.push({ name: token.name, index });
    });
    const colours = [];
    tokens.forEach((t) => {
      if (t.kind !== 'tag') {
        colours.push({ start: t.start, end: t.end, kind: t.kind });
        return;
      }
      let at = 0;
      const re = /\b[\w:-]+(?=\s*=)|"[^"]*"|'[^']*'/g;
      let match;
      while ((match = re.exec(t.text))) {
        if (match.index > at)
          colours.push({
            start: t.start + at,
            end: t.start + match.index,
            kind: 'tag',
          });
        colours.push({
          start: t.start + match.index,
          end: t.start + match.index + match[0].length,
          kind: /^["']/.test(match[0]) ? 'value' : 'attribute',
        });
        at = match.index + match[0].length;
      }
      if (at < t.text.length) colours.push({ start: t.start + at, end: t.end, kind: 'tag' });
    });
    return { tokens, groups, colours };
  }
  function matches(source, query, caseSensitive = false) {
    if (!query) return [];
    const pattern = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        caseSensitive ? 'g' : 'gi',
      ),
      out = [];
    for (const match of source.matchAll(pattern)) {
      out.push({ start: match.index, end: match.index + match[0].length });
      if (out.length === 10000) break;
    }
    return out;
  }
  function projection(source, folds) {
    const hidden = [...folds]
        .filter((f) => f.to > f.from)
        .sort((a, b) => a.from - b.from || b.to - a.to),
      parts = [];
    let offset = 0,
      text = '';
    for (const f of hidden) {
      if (f.from < offset) continue;
      const before = source.slice(offset, f.from);
      parts.push({
        display: text.length,
        start: offset,
        end: f.from,
        text: before,
      });
      text += before;
      const marker =
        ' … ' + normal(source.slice(f.from, f.to)).split('\n').length + ' lines folded … ';
      parts.push({
        display: text.length,
        start: f.from,
        end: f.to,
        text: marker,
        fold: true,
      });
      text += marker;
      offset = f.to;
    }
    parts.push({
      display: text.length,
      start: offset,
      end: source.length,
      text: source.slice(offset),
    });
    text += source.slice(offset);
    const toSource = (pos) => {
      const part =
        parts.find((p) => pos >= p.display && pos < p.display + p.text.length) ||
        parts[parts.length - 1];
      return part.fold ? part.start : part.start + Math.max(0, pos - part.display);
    };
    return { text, parts, toSource };
  }
  function mount(host, options = {}) {
    const doc = host.ownerDocument,
      input = options.input || doc.createElement('textarea');
    const rootNode = doc.createElement('div');
    rootNode.className = 'code-surface';
    if (options.input) {
      input.parentNode.insertBefore(rootNode, input);
      rootNode.append(input);
    } else {
      host.replaceChildren(rootNode);
      rootNode.append(input);
    }
    input.className = 'code-input';
    input.spellcheck = false;
    input.wrap = 'off';
    input.setAttribute('aria-label', options.label || 'HTML source');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    let normalText = '',
      crlf = [],
      rawLines = [0],
      foldLines = new Map(),
      beforeEdit = null;
    let source = '',
      fields = [],
      loops = [],
      selected = null,
      model = scan(''),
      folds = [],
      view = projection('', []),
      lastSelection = { start: 0, end: 0 },
      activeMatch = -1,
      query = '',
      sensitive = false,
      matchList = [],
      identity = null;
    const toolbar = doc.createElement('div');
    toolbar.className = 'code-tools';
    const searchbar = doc.createElement('div');
    searchbar.className = 'code-search';
    searchbar.hidden = true;
    const stage = doc.createElement('div');
    stage.className = 'code-stage';
    const gutter = doc.createElement('div');
    gutter.className = 'code-gutter';
    gutter.setAttribute('aria-label', 'Line numbers and folding');
    const layers = doc.createElement('div');
    layers.className = 'code-layers';
    const paint = doc.createElement('pre');
    paint.className = 'code-paint';
    paint.setAttribute('aria-hidden', 'true');
    // Only the textarea scrolls. Translate decoration content without scroll-range clamping.
    const paintContent = doc.createElement('div');
    paintContent.className = 'code-paint-content';
    paint.append(paintContent);
    const gutterContent = doc.createElement('div');
    gutter.append(gutterContent);
    const status = doc.createElement('div');
    status.className = 'code-status';
    status.setAttribute('role', 'status');
    function button(parent, label, action, title = label) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.onclick = action;
      parent.append(b);
      return b;
    }
    button(
      toolbar,
      'Find',
      () => {
        searchbar.hidden = !searchbar.hidden;
        if (!searchbar.hidden) find.focus();
      },
      'Find in HTML (Ctrl/Cmd+F)',
    );
    const line = doc.createElement('input');
    line.type = 'number';
    line.min = '1';
    line.placeholder = 'Line';
    line.setAttribute('aria-label', 'Go to line number');
    toolbar.append(line);
    function go() {
      const value = Number(line.value);
      const starts = rawLines;
      if (!Number.isInteger(value) || value < 1 || value > starts.length) {
        status.textContent = 'Enter a line from 1 to ' + starts.length + '.';
        return;
      }
      reveal(starts[value - 1], starts[value - 1]);
    }
    button(toolbar, 'Go', go);
    line.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        go();
      }
    };
    const partner = button(
      toolbar,
      'Matching tag',
      () => {
        const t = tokenAt(lastSelection.start);
        if (t?.group) {
          const group = t.group,
            members = group.members;
          const next = members[(members.indexOf(model.tokens.indexOf(t)) + 1) % members.length],
            target = model.tokens[next];
          reveal(target.start, target.end);
        } else status.textContent = 'Place the cursor in a paired HTML tag or template statement.';
      },
      'Jump to the matching tag or template statement',
    );
    if (options.onRepeat)
      button(
        toolbar,
        'Make repeating',
        () => options.onRepeat({ ...lastSelection }),
        'Choose a complete repeating item around the cursor or selection',
      );
    button(toolbar, 'Expand all', () => {
      const offset = lastSelection.start;
      folds = [];
      render();
      reveal(offset, offset);
    });
    const find = doc.createElement('input');
    find.type = 'search';
    find.placeholder = 'Find literal text';
    find.setAttribute('aria-label', 'Find literal text');
    searchbar.append(find);
    const caseLabel = doc.createElement('label'),
      caseBox = doc.createElement('input');
    caseBox.type = 'checkbox';
    caseLabel.append(caseBox, doc.createTextNode('Match case'));
    searchbar.append(caseLabel);
    function updateSearch() {
      query = find.value;
      sensitive = caseBox.checked;
      matchList = matches(source, query, sensitive);
      activeMatch = -1;
      render();
      status.textContent =
        matchList.length +
        ' matches' +
        (matchList.length === 10000 ? ' (limit reached)' : '') +
        '.';
    }
    find.oninput = updateSearch;
    caseBox.onchange = updateSearch;
    function next(direction) {
      if (!matchList.length) {
        status.textContent = 'No matches.';
        return;
      }
      activeMatch =
        activeMatch < 0
          ? direction > 0
            ? 0
            : matchList.length - 1
          : (activeMatch + direction + matchList.length) % matchList.length;
      const m = matchList[activeMatch];
      reveal(m.start, m.end);
      status.textContent = activeMatch + 1 + ' of ' + matchList.length + ' matches.';
    }
    button(searchbar, 'Previous', () => next(-1));
    button(searchbar, 'Next', () => next(1));
    find.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        next(e.shiftKey ? -1 : 1);
      }
    };
    if (options.onReplace) {
      const replacement = doc.createElement('input');
      replacement.type = 'text';
      replacement.placeholder = 'Replace with';
      replacement.setAttribute('aria-label', 'Replacement text');
      searchbar.append(replacement);
      const replace = (all) => {
        if (!query || !matchList.length) {
          status.textContent = 'Find text before replacing it.';
          return;
        }
        if (all && matchList.length === 10000) {
          status.textContent = 'Narrow your search before replacing more than 10,000 matches.';
          return;
        }
        if (!all && activeMatch < 0) {
          next(1);
          return;
        }
        const list = all ? matchList : [matchList[activeMatch]],
          edits = list.map((m) => ({
            start: m.start,
            end: m.end,
            value: replacement.value,
          }));
        try {
          const result = options.onReplace(edits);
          folds = [];
          setSource(result, {
            fields: options.getFields?.() || fields,
            loops: options.getLoops?.() || loops,
            identity,
          });
          status.textContent =
            list.length +
            ' replacement' +
            (list.length === 1 ? '' : 's') +
            ' applied. Refresh the preview before saving.';
        } catch (error) {
          status.textContent = error.message;
        }
      };
      button(searchbar, 'Replace', () => replace(false));
      button(searchbar, 'Replace all', () => replace(true));
    }
    rootNode.prepend(toolbar, searchbar);
    layers.append(paint, input);
    stage.append(gutter, layers);
    rootNode.append(stage, status);
    function tokenAt(offset) {
      return model.tokens
        .filter((t) => offset >= t.start && offset < t.end)
        .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    }
    function lineStarts(text) {
      const starts = [0];
      for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
      return starts;
    }
    function lowerBound(values, value) {
      let lo = 0,
        hi = values.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (values[mid] < value) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }
    function offsetToLine(offset) {
      return Math.max(1, lowerBound(rawLines, offset + 1));
    }
    function toDisplay(offset) {
      return offset - lowerBound(crlf, offset);
    }
    function toRaw(offset) {
      let lo = offset,
        hi = Math.min(source.length, offset + crlf.length);
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (toDisplay(mid) < offset) lo = mid + 1;
        else hi = mid;
      }
      return source[lo - 1] === '\r' && source[lo] === '\n' ? lo + 1 : lo;
    }

    function render() {
      const plain = normalText;
      const projectedFolds = folds.map((f) => ({
        ...f,
        from: toDisplay(f.from),
        to: toDisplay(f.to),
      }));
      view = projection(plain, projectedFolds);
      const oldStart = input.selectionStart || 0,
        oldEnd = input.selectionEnd || 0,
        direction = input.selectionDirection,
        top = input.scrollTop,
        left = input.scrollLeft;
      if (input.value !== view.text) input.value = view.text;
      input.readOnly = !!options.readOnly || folds.length > 0;
      input.classList.toggle('code-folded', folds.length > 0);
      paintContent.replaceChildren();
      gutterContent.replaceChildren();
      const caret = lastSelection.start,
        token = tokenAt(caret),
        paired = token?.group?.members.map((i) => model.tokens[i]) || [];
      partner.disabled = !paired.length;
      // Intervals are split only at meaningful boundaries, including visible folds.
      const annotations = [
        ...model.colours.map((c) => ({ ...c, css: 'syntax-' + c.kind })),
        ...fields.map((f) => ({
          ...f,
          css: 'code-field' + (f.id === selected ? ' code-field-active' : ''),
          label: f.label,
        })),
        ...loops.map((l) => ({
          ...l,
          css: 'code-loop',
          label: 'Repeat: ' + l.label,
        })),
        ...model.groups
          .filter((g) => g.kind === 'for')
          .flatMap((g) =>
            [model.tokens[g.members[0]], model.tokens[g.members[g.members.length - 1]]].map(
              (t) => ({ ...t, css: 'code-loop-boundary' }),
            ),
          ),
        ...paired.map((t) => ({ ...t, css: 'code-pair' })),
        ...matchList.map((m) => ({ ...m, css: 'code-found' })),
      ];
      for (const part of view.parts) {
        if (part.fold) {
          const span = doc.createElement('span');
          span.className = 'code-fold-marker';
          span.textContent = part.text;
          paintContent.append(span);
          continue;
        }
        // Projection uses normalised offsets; model and fields use raw source offsets.
        const intervals = annotations
          .map((a) => ({
            ...a,
            start: toDisplay(a.start),
            end: toDisplay(a.end),
          }))
          .filter((a) => a.end > part.start && a.start < part.end);
        const events = new Map([
          [part.start, { add: [], remove: [] }],
          [part.end, { add: [], remove: [] }],
        ]);
        for (const interval of intervals) {
          const a = Math.max(part.start, interval.start),
            b = Math.min(part.end, interval.end);
          if (!events.has(a)) events.set(a, { add: [], remove: [] });
          if (!events.has(b)) events.set(b, { add: [], remove: [] });
          events.get(a).add.push(interval);
          events.get(b).remove.push(interval);
        }
        const points = [...events.keys()].sort((a, b) => a - b),
          active = new Set();
        for (let i = 0; i < points.length - 1; i++) {
          const start = points[i],
            end = points[i + 1],
            event = events.get(start);
          event.remove.forEach((a) => active.delete(a));
          event.add.forEach((a) => active.add(a));
          const span = doc.createElement('span');
          span.textContent = plain.slice(start, end);
          span.className = [...active].map((a) => a.css).join(' ');
          paintContent.append(span);
        }
      }
      paintContent.append(doc.createTextNode(' ')); // Preserve a final empty line without adding a line.
      const starts = lineStarts(view.text);
      starts.forEach((offset) => {
        const raw = toRaw(view.toSource(offset)),
          number = offsetToLine(raw),
          row = doc.createElement('div');
        row.className = 'code-gutter-line';
        const group = foldLines.get(number);
        const label = doc.createElement('span');
        label.textContent = number;
        row.append(label);
        if (group) {
          const collapsed = folds.some((f) => f.start === group.start);
          const toggle = button(
            row,
            collapsed ? '▸' : '▾',
            () => {
              lastSelection = { start: group.start, end: group.start };
              folds = collapsed ? folds.filter((f) => f.start !== group.start) : [...folds, group];
              render();
              status.textContent = folds.length
                ? 'Folded view. Expand all to edit or select a continuous code range.'
                : 'All code visible.';
            },
            (collapsed ? 'Expand ' : 'Fold ') + group.label,
          );
          toggle.setAttribute('aria-expanded', String(!collapsed));
        }
        gutterContent.append(row);
      });
      input.setSelectionRange(
        Math.min(oldStart, input.value.length),
        Math.min(oldEnd, input.value.length),
        direction,
      );
      input.scrollTop = top;
      input.scrollLeft = left;
      syncScroll();
    }
    function syncScroll() {
      paintContent.style.transform =
        'translate(' + -input.scrollLeft + 'px,' + -input.scrollTop + 'px)';
      gutterContent.style.transform = 'translateY(' + -input.scrollTop + 'px)';
    }
    function selection() {
      if (folds.length) return null;
      return {
        start: toRaw(input.selectionStart),
        end: toRaw(input.selectionEnd),
      };
    }
    function highlight() {
      const start = toRaw(view.toSource(input.selectionStart)),
        end = toRaw(view.toSource(input.selectionEnd));
      lastSelection = { start, end };
      render();
      const field = fields
        .filter((f) => start >= f.start && start < f.end)
        .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
      const loop = loops.find((l) => start >= l.start && start < l.end);
      status.textContent =
        'Line ' +
        offsetToLine(start) +
        (loop ? ' · Repeat: ' + loop.label : '') +
        (field ? ' · Field: ' + field.label : '') +
        (folds.length ? ' · Expand all to edit' : '');
    }
    function reveal(start, end) {
      folds = [];
      render();
      const a = toDisplay(start),
        b = toDisplay(end);
      input.focus();
      input.setSelectionRange(a, b);
      input.scrollTop = Math.max(0, (offsetToLine(start) - 4) * 21);
      lastSelection = { start, end };
      render();
    }
    function setSource(value, meta = {}) {
      const changed = value !== source,
        newIdentity = meta.identity !== undefined && meta.identity !== identity;
      if (changed || newIdentity) {
        folds = [];
        activeMatch = -1;
      }
      source = value;
      identity = meta.identity ?? identity;
      fields = meta.fields || fields;
      loops = meta.loops || loops;
      if (Object.prototype.hasOwnProperty.call(meta, 'selected')) selected = meta.selected;
      if (changed || newIdentity) {
        normalText = normal(source);
        crlf = [...source.matchAll(/\r\n/g)].map((m) => m.index + 1);
        rawLines = [0, ...[...source.matchAll(/\r\n|\r|\n/g)].map((m) => m.index + m[0].length)];
        model = scan(source);
        foldLines = new Map();
        for (const group of model.groups) {
          const number = offsetToLine(group.start);
          if (
            offsetToLine(group.end) > number &&
            (!foldLines.has(number) || foldLines.get(number).end < group.end)
          )
            foldLines.set(number, group);
        }
      }
      if (newIdentity) {
        status.textContent = options.readOnly
          ? 'Read-only · Underlined code is connected to a field. Click a tag to highlight its partner.'
          : 'Edit code · Connected field values stay protected.';
        lastSelection = { start: 0, end: 0 };
        input.setSelectionRange(0, 0);
        input.scrollTop = 0;
        input.scrollLeft = 0;
      }
      matchList = matches(source, query, sensitive);
      render();
    }
    rootNode.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !searchbar.hidden) {
        event.preventDefault();
        event.stopPropagation();
        searchbar.hidden = true;
        input.focus();
      }
    });
    input.addEventListener('scroll', syncScroll);
    input.addEventListener('keyup', highlight);
    input.addEventListener('mouseup', highlight);
    input.addEventListener('click', () => {
      if (input.selectionStart !== input.selectionEnd || folds.length) return;
      const range = selection(),
        ids = [
          ...new Set(
            fields
              .filter((f) => range.start >= f.start && range.start < f.end)
              .sort((a, b) => a.end - a.start - (b.end - b.start))
              .map((f) => f.id),
          ),
        ];
      if (ids.length) options.onField?.(ids);
    });
    input.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchbar.hidden = false;
        find.focus();
      }
      if (event.key === 'Escape' && !searchbar.hidden) {
        event.preventDefault();
        event.stopPropagation();
        searchbar.hidden = true;
        input.focus();
      }
      if (options.readOnly && event.key === 'Enter') {
        const range = selection();
        if (range && range.start === range.end) {
          const ids = [
            ...new Set(
              fields.filter((f) => range.start >= f.start && range.start < f.end).map((f) => f.id),
            ),
          ];
          options.onField?.(ids);
        }
      }
    });
    input.addEventListener('beforeinput', () => {
      beforeEdit = {
        start: input.selectionStart,
        end: input.selectionEnd,
        direction: input.selectionDirection,
      };
    });
    input.addEventListener('input', () => {
      if (options.onInput) {
        try {
          const value = options.onInput(input.value);
          setSource(value, {
            fields: options.getFields?.() || fields,
            loops: options.getLoops?.() || loops,
            identity,
          });
          highlight();
        } catch (error) {
          input.value = normalText;
          if (beforeEdit)
            input.setSelectionRange(beforeEdit.start, beforeEdit.end, beforeEdit.direction);
          status.textContent = error.message;
          render();
        }
      }
    });
    input.addEventListener('copy', (event) => {
      if (folds.length) {
        event.preventDefault();
        status.textContent = 'Expand all before copying, so folded code is not omitted.';
      }
    });
    setSource(options.value || '', options);
    return {
      setSource,
      getSelection: selection,
      revealRange: reveal,
      getCursorRange: () => ({ ...lastSelection }),
      setSelected(id) {
        selected = id;
        render();
      },
      focus() {
        input.focus();
      },
      input,
    };
  }
  const api = { scan, matches, projection, rawOffset, mount };
  root.BlockCodeEditor = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
