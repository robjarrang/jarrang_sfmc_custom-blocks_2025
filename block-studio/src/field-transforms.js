/* Atomic authoring changes to field references. Quoted literals and AMPscript stay opaque. */
(function (root) {
  'use strict';
  const C = root.BlockCore;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function content(value, before, after) {
    if (before === 'text' && after === 'richtext') return C.escape(value).replace(/\n/g, '<br>');
    if (before === 'richtext' && after === 'text')
      return C.decode(
        String(value)
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/(?:p|div|li|ul|ol)>/gi, '\n')
          .replace(/<[^>]*>/g, ''),
      ).replace(/\n+$/, '');
    return value;
  }
  function apply(module, original, edited) {
    const draft = copy(module),
      field = copy(edited);
    const index = draft.fields.findIndex((f) => f.id === field.id);
    if (index < 0) draft.fields.push(field);
    else draft.fields[index] = field;
    const oldKey = original.key || original.id,
      newKey = field.key || field.id;
    const children = new Map(
      (original.itemFields || []).map((f) => [
        f.key,
        field.itemFields?.find((n) => n.id === f.id) || null,
      ]),
    );
    const stack = [],
      patches = [];
    for (const match of draft.source.matchAll(/%%[\s\S]*?%%|{{[\s\S]*?}}|{%[\s\S]*?%}/g)) {
      const token = match[0];
      if (token.startsWith('%%')) continue;
      const body = token.slice(2, -2).trim();
      const loop = body.match(/^for\s+(\w+)\s+in\s+([\w.]+)$/);
      function reference(word) {
        const parts = word.split('.');
        const loop = [...stack].reverse().find((l) => l.alias === parts[0]);
        if (loop) {
          if (loop.collection !== oldKey || parts.length !== 2) return null;
          const child = children.get(parts[1]);
          if (!child) return null;
          const before = original.itemFields.find((f) => f.key === parts[1]);
          return { path: parts[0] + '.' + child.key, before, after: child };
        }
        if (parts[0] === oldKey)
          return { path: [newKey, ...parts.slice(1)].join('.'), before: original, after: field };
        return null;
      }
      let replacement = token;
      const conditionPrefix = token.match(/^({%\s*(?:if|elsif|elseif)\s+)/);
      if (conditionPrefix) {
        const start = conditionPrefix[0].length;
        replacement =
          token.slice(0, start) +
          token
            .slice(start)
            .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[A-Za-z_]\w*(?:\.\w+)*/g, (word) =>
              ['and', 'or', 'not', 'contains', 'true', 'false', 'nil', 'null', 'blank'].includes(
                word,
              )
                ? word
                : reference(word)?.path || word,
            );
      }
      if (loop) {
        const collection = reference(loop[2])?.path || loop[2];
        replacement =
          collection === loop[2] ? token : token.replace(/(\bin\s+)[\w.]+/, '$1' + collection);
      }
      if (token.startsWith('{{')) {
        const value = body.match(/^([A-Za-z_]\w*(?:\.\w+)*)(?:\s*\|\s*(escape|richtext))?$/);
        const ref = value && reference(value[1]);
        if (ref) {
          if (
            ref.after.type === 'richtext' &&
            ref.before.type !== 'richtext' &&
            C.parse(draft.source).nodes.some((n) =>
              n.attrs.some((a) => match.index >= a.start && match.index + token.length <= a.end),
            )
          )
            throw Error(
              'This field also supplies an HTML attribute. Keep that as a separate plain-text field before enabling formatted text.',
            );
          replacement = token.replace(/^({{\s*)[\w.]+/, '$1' + ref.path);
          if (
            ref.before.type !== ref.after.type &&
            [ref.before.type, ref.after.type].includes('richtext')
          )
            replacement =
              '{{ ' + ref.path + (ref.after.type === 'richtext' ? ' | richtext' : '') + ' }}';
        }
      }
      if (replacement !== token)
        patches.push({ start: match.index, end: match.index + token.length, value: replacement });
      if (loop) stack.push({ alias: loop[1], collection: loop[2] });
      if (body === 'endfor') stack.pop();
    }
    if (patches.length) C.rebase(draft, patches);
    return draft;
  }
  root.BlockFieldTransforms = { content, apply };
})(window);
