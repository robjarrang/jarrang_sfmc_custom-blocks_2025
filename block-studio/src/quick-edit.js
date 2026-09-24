/* Small source fixes preserve field definitions; no automatic rediscovery. */
(function (root) {
  'use strict';
  const C = root.BlockCore || (typeof require === 'function' ? require('./core.js') : null);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function patch(module, source) {
    if (source.length > 2000000) throw Error('Keep the module smaller than 2 MB.');
    const before = module.source;
    if (source === before) return clone(module);
    let start = 0;
    while (start < before.length && start < source.length && before[start] === source[start])
      start++;
    let end = before.length,
      newEnd = source.length;
    while (end > start && newEnd > start && before[end - 1] === source[newEnd - 1]) {
      end--;
      newEnd--;
    }
    for (const field of module.fields)
      for (const target of field.targets) {
        const intersects =
          start === end
            ? start > target.start && start < target.end
            : start < target.end && end > target.start;
        if (!intersects) continue;
        if (target.kind === 'element' && start >= target.start && end <= target.end) continue;
        throw Error(
          'This edit touches “' +
            field.label +
            '”. Its connected value is protected here. Use Edit field to change that value, or make smaller code edits around it.',
        );
      }
    const draft = clone(module),
      mode = module.templateMode,
      reviewed = module.reviewed;
    C.rebase(draft, [{ start, end, value: source.slice(start, newEnd) }]);
    if (mode === undefined) delete draft.templateMode;
    else draft.templateMode = mode;
    draft.reviewed = reviewed;
    return draft;
  }
  function patchInput(module, displaySource) {
    // Textareas expose LF line endings. Map edits back to the original source.
    const before = module.source.replace(/\r\n/g, '\n');
    if (displaySource === before) return clone(module);
    let start = 0;
    while (
      start < before.length &&
      start < displaySource.length &&
      before[start] === displaySource[start]
    )
      start++;
    let end = before.length,
      newEnd = displaySource.length;
    while (end > start && newEnd > start && before[end - 1] === displaySource[newEnd - 1]) {
      end--;
      newEnd--;
    }
    const rawStart = C.sourceOffset(module.source, start),
      rawEnd = C.sourceOffset(module.source, end);
    let added = displaySource.slice(start, newEnd);
    if (module.source.includes('\r\n')) added = added.replace(/\n/g, '\r\n');
    return patch(module, module.source.slice(0, rawStart) + added + module.source.slice(rawEnd));
  }
  function validate(original, draft) {
    if (!draft.source.trim()) throw Error('The module HTML cannot be empty.');
    if (/<(?:script|iframe|object|embed)\b|\son\w+\s*=/i.test(draft.source))
      throw Error('Remove executable HTML from the module.');
    if (/<!doctype|<html\b|<body\b/i.test(draft.source))
      throw Error('Keep this as a module fragment, not a complete email.');
    // Quick fixes do not rewrite conditional logic, field references or personalisation.
    const expressions = (s) =>
      [...s.matchAll(/%%[\s\S]*?%%|{{[\s\S]*?}}|{%[\s\S]*?%}/g)].map((m) => m[0]);
    if (JSON.stringify(expressions(original.source)) !== JSON.stringify(expressions(draft.source)))
      throw Error(
        'Keep template logic and personalisation unchanged for a quick fix. Use Template code for those changes.',
      );
    const parsed = C.parse(draft.source);
    if (parsed.issues.length) throw Error(parsed.issues[0]);
    const result = clone(draft);
    for (const field of result.fields)
      for (const t of field.targets) {
        if (t.kind === 'element') {
          const node = parsed.nodes.find((n) => n.start === t.start && n.end === t.end);
          if (!node)
            throw Error(
              'The section connected to “' +
                field.label +
                '” no longer has the same boundaries. Keep its outer element intact.',
            );
          t.nodeId = node.id;
        } else {
          let mapped;
          try {
            mapped = C.mappingTarget(result.source, t.start, t.end);
          } catch {
            throw Error(
              'The connection for “' +
                field.label +
                '” is no longer valid. Check its surrounding HTML.',
            );
          }
          if (mapped.kind !== t.kind || mapped.name !== t.name)
            throw Error(
              'The edit changes what “' +
                field.label +
                '” is connected to. Keep its original attribute or content location.',
            );
          Object.assign(t, mapped);
        }
      }
    C.assertProject({
      format: 'jarrang-block-studio',
      version: 1,
      modules: [result],
    });
    C.render(result);
    result.draftSource = result.source;
    result.acknowledged = false;
    return result;
  }
  const api = { patch, patchInput, validate };
  root.BlockQuickEdit = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
