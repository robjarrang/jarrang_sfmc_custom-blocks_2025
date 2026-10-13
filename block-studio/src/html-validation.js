/* Authoring-only structural checks. Never repair or serialise the email source. */
(function (root) {
  'use strict';
  const voids = new Set(
    'area base br col embed hr img input link meta param source track wbr'.split(' '),
  );
  const optional = new Set(
    'li dt dd p rt rp optgroup option colgroup thead tbody tfoot tr td th'.split(' '),
  );
  const blocks = new Set(
    'address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr menu nav ol p pre section table ul'.split(
      ' ',
    ),
  );
  function condition(text, version) {
    const expression = text
      .toLowerCase()
      .replace(/\b(gte|gt|lte|lt)\s+mso\s+(\d+)\b/g, (_, op, n) =>
        String(
          version !== null &&
            { gte: version >= +n, gt: version > +n, lte: version <= +n, lt: version < +n }[op],
        ),
      )
      .replace(/\bmso\s+(\d+)\b/g, (_, n) => String(version === +n))
      .replace(/\bmso\b/g, String(version !== null))
      .replace(/\bie\b/g, 'false');
    const tokens = expression.match(/true|false|[!&|()]/g) || [];
    if (tokens.join('') !== expression.replace(/\s/g, ''))
      throw Error('Unsupported Outlook condition: ' + text);
    let i = 0;
    function atom() {
      const t = tokens[i++];
      if (t === '!') return !atom();
      if (t === '(') {
        const v = or();
        if (tokens[i++] !== ')') throw Error('Unclosed Outlook condition.');
        return v;
      }
      if (!['true', 'false'].includes(t)) throw Error('Invalid Outlook condition.');
      return t === 'true';
    }
    function and() {
      let v = atom();
      while (tokens[i] === '&') {
        i++;
        const b = atom();
        v = v && b;
      }
      return v;
    }
    function or() {
      let v = and();
      while (tokens[i] === '|') {
        i++;
        const b = and();
        v = v || b;
      }
      return v;
    }
    const result = or();
    if (i !== tokens.length) throw Error('Invalid Outlook condition.');
    return result;
  }
  function projection(source, version) {
    return source.replace(
      /<!--\s*\[if\s+([^\]]+)\]\s*>(?:<!-->)?([\s\S]*?)(?:<!--)?<!\[endif\]-->/gi,
      (_, test, body) => (condition(test, version) ? body : ''),
    );
  }
  function check(source) {
    const errors = [],
      seen = new Set();
    const versions = /<!--\s*\[if\b/i.test(source) ? [null, 9, 12, 14, 15, 16] : [null];
    for (const version of versions) {
      let html;
      try {
        html = projection(source, version).replace(/%%[\s\S]*?%%/g, '');
      } catch (e) {
        errors.push(e.message);
        break;
      }
      if (seen.has(html)) continue;
      seen.add(html);
      const stack = [];
      const label = version === null ? 'HTML' : 'Outlook HTML';
      const fail = (message) => errors.push(label + ': ' + message);
      const re = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][\w:-]*(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
      let match;
      while ((match = re.exec(html))) {
        if (match[0].startsWith('<!')) continue;
        const tag = match[0].match(/^<(\/?)([\w:-]+)/);
        const closing = !!tag[1],
          name = tag[2].toLowerCase();
        if (closing) {
          const index = stack.lastIndexOf(name);
          if (index < 0) {
            fail('Unexpected </' + name + '>.');
            continue;
          }
          for (const open of stack.slice(index + 1))
            if (!optional.has(open)) fail('Close <' + open + '> before </' + name + '>.');
          stack.length = index;
        } else {
          const closeOptional = (names) => {
            for (let i = stack.length - 1; i >= 0; i--) {
              if (names.includes(stack[i])) {
                if (stack.slice(i + 1).every((t) => optional.has(t))) stack.length = i;
                return;
              }
              if (!optional.has(stack[i])) return;
            }
          };
          if (blocks.has(name)) closeOptional(['p']);
          if (name === 'li') closeOptional(['li']);
          if (['dt', 'dd'].includes(name)) closeOptional(['dt', 'dd']);
          if (name === 'tr') closeOptional(['tr']);
          if (['td', 'th'].includes(name)) closeOptional(['td', 'th']);
          if (['thead', 'tbody', 'tfoot'].includes(name))
            closeOptional(['thead', 'tbody', 'tfoot']);
          if (name === 'option') closeOptional(['option']);
          if (name === 'optgroup') closeOptional(['optgroup']);
          if (!voids.has(name) && !/\/\s*>$/.test(match[0])) stack.push(name);
          if (['style', 'script', 'textarea', 'title'].includes(name)) {
            const end = new RegExp('</' + name + '\\s*>', 'gi');
            end.lastIndex = re.lastIndex;
            const found = end.exec(html);
            if (found) {
              stack.pop();
              re.lastIndex = end.lastIndex;
            } else {
              fail('Missing </' + name + '>.');
              break;
            }
          }
        }
      }
      for (const name of stack) if (!optional.has(name)) fail('Missing </' + name + '>.');
    }
    return [...new Set(errors)];
  }
  function moduleProblems(module, C) {
    const cases = [{}];
    for (const f of module.fields.filter((f) => f.enabled)) {
      if (f.type === 'toggle') cases.push({ [f.id]: 'shown' }, { [f.id]: 'hidden' });
      if (f.type === 'select')
        for (const option of f.options || []) cases.push({ [f.id]: option.value });
      if (f.type === 'list') {
        const row =
          f.defaultValue[0] || Object.fromEntries(f.itemFields.map((c) => [c.key, c.defaultValue]));
        const counts = new Set([f.minItems ?? 0, f.maxItems ?? 50, 1]);
        for (const m of module.source.matchAll(
          /forloop\.index(?:0)?\s*(?:>=|<=|>|<|==|!=)\s*(\d+)/g,
        ))
          for (const n of [+m[1] - 1, +m[1], +m[1] + 1]) counts.add(n);
        for (const n of counts)
          if (n >= (f.minItems ?? 0) && n <= (f.maxItems ?? 50))
            cases.push({
              [f.id]: Array.from({ length: n }, () => JSON.parse(JSON.stringify(row))),
            });
      }
    }
    const errors = [],
      outputs = new Set();
    for (const values of cases) {
      let html;
      try {
        html = C.render(module, values);
      } catch (e) {
        errors.push(e.message);
        continue;
      }
      if (outputs.has(html)) continue;
      outputs.add(html);
      const issues = check(html);
      const field = module.fields.find((f) => Object.hasOwn(values, f.id));
      for (const issue of issues)
        errors.push(
          (field
            ? field.label +
              ' (' +
              (Array.isArray(values[field.id])
                ? values[field.id].length + ' items'
                : values[field.id]) +
              '): '
            : '') + issue,
        );
      if (errors.length > 15) break;
    }
    return [...new Set(errors)];
  }
  const api = { check, moduleProblems };
  root.BlockHTMLValidation = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
