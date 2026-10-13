/* Authoring-only, in-memory module history. Export references are never rolled back. */
(function (root) {
  'use strict';
  const keys = [
    'name',
    'slug',
    'release',
    'source',
    'draftSource',
    'templateMode',
    'contextCss',
    'width',
    'fields',
    'analysed',
    'iconColour',
    'iconSymbol',
    'iconAssets',
  ];
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const snapshot = (module) =>
    JSON.stringify(
      Object.fromEntries(
        keys.filter((key) => Object.hasOwn(module, key)).map((key) => [key, module[key]]),
      ),
    );
  function apply(module, value) {
    const state = JSON.parse(value);
    for (const key of keys) {
      if (Object.hasOwn(state, key)) module[key] = state[key];
      else delete module[key];
    }
    module.reviewed = false;
    module.acknowledged = false;
  }
  function description(before, after) {
    const a = JSON.parse(before),
      b = JSON.parse(after);
    if (a.source !== b.source) return 'HTML and field changes';
    if (a.draftSource !== b.draftSource) return 'source import edit';
    if (JSON.stringify(a.fields) !== JSON.stringify(b.fields)) {
      if (a.fields.length > b.fields.length) return 'field removal';
      if (a.fields.length < b.fields.length) return 'field addition';
      if (a.fields.map((f) => f.id).join() !== b.fields.map((f) => f.id).join())
        return 'field order';
      return 'field settings';
    }
    if (a.name !== b.name) return 'module name';
    if (a.contextCss !== b.contextCss || a.width !== b.width) return 'preview settings';
    if (
      ['iconColour', 'iconSymbol', 'iconAssets'].some(
        (key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]),
      )
    )
      return 'block icon';
    return 'module settings';
  }
  function create({ limit = 40, maxBytes = 16 * 1024 * 1024 } = {}) {
    const states = new Map();
    let sequence = 0;
    function track(module) {
      if (!states.has(module))
        states.set(module, { current: snapshot(module), past: [], future: [], group: null });
      return states.get(module);
    }
    // Bound the retained undo/redo snapshots across the whole workspace, not per module.
    function trim() {
      const entries = [];
      for (const state of states.values())
        for (const stack of [state.past, state.future])
          for (const entry of stack) entries.push({ stack, entry });
      entries.sort((a, b) => a.entry.order - b.entry.order);
      let bytes = entries.reduce((n, { entry }) => n + entry.value.length * 2, 0);
      while (entries.length > limit || (bytes > maxBytes && entries.length > 1)) {
        const { stack, entry } = entries.shift();
        stack.splice(stack.indexOf(entry), 1);
        bytes -= entry.value.length * 2;
      }
    }
    function capture(module, label, group = null) {
      const state = track(module),
        next = snapshot(module);
      if (state.current === next) return false;
      if (!group || state.group !== group || !state.past.length)
        state.past.push({
          value: state.current,
          label: label || description(state.current, next),
          order: ++sequence,
        });
      state.current = next;
      state.future = [];
      state.group = group;
      trim();
      return true;
    }
    function move(module, redo = false) {
      const state = track(module);
      // Never overwrite a mutation that has not reached the history boundary yet.
      if (snapshot(module) !== state.current)
        throw Error('The module changed. Save the current edit before using history.');
      const from = redo ? state.future : state.past,
        to = redo ? state.past : state.future;
      const entry = from.pop();
      if (!entry) return null;
      to.push({ value: state.current, label: entry.label, order: ++sequence });
      apply(module, entry.value);
      state.current = snapshot(module);
      state.group = null;
      trim();
      return entry.label;
    }
    return {
      track,
      capture,
      undo: (module) => move(module),
      redo: (module) => move(module, true),
      status(module) {
        const s = track(module);
        return { undo: s.past.at(-1)?.label || '', redo: s.future.at(-1)?.label || '' };
      },
      endGroup() {
        for (const state of states.values()) state.group = null;
      },
      prune(modules) {
        const live = new Set(modules);
        for (const module of states.keys()) if (!live.has(module)) states.delete(module);
      },
    };
  }
  function exportedReference(module) {
    const saved = module.exportedDefinition;
    if (!saved)
      throw Error(
        'No exported content is saved for this module. Export it or open its repository first.',
      );
    if (saved.id !== module.id || !Array.isArray(saved.fields) || typeof saved.source !== 'string')
      throw Error(
        'The exported reference is invalid for this module. Reopen the repository to recover it.',
      );
    return saved;
  }
  function exportedContent(module) {
    const saved = exportedReference(module);
    const draft = copy(module);
    for (const key of [
      'name',
      'slug',
      'release',
      'source',
      'fields',
      'templateMode',
      'contextCss',
    ]) {
      if (Object.hasOwn(saved, key)) draft[key] = copy(saved[key]);
      else delete draft[key];
    }
    draft.draftSource = draft.source;
    draft.analysed = true;
    draft.reviewed = false;
    draft.acknowledged = false;
    return draft;
  }
  function comparison(module) {
    return {
      name: module.name,
      slug: module.slug,
      release: module.release,
      source: module.source,
      draftSource: module.draftSource,
      templateMode: !!module.templateMode,
      contextCss: module.contextCss || '',
      fields: module.fields,
    };
  }
  const api = {
    create,
    snapshot,
    exportedContent,
    comparison,
    hasRecoveryChanges(module) {
      const saved = exportedReference(module);
      const expected = comparison(saved);
      expected.draftSource = saved.source;
      return JSON.stringify(comparison(module)) !== JSON.stringify(expected);
    },
    restoreExportedContent(module) {
      apply(module, snapshot(exportedContent(module)));
    },
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BlockHistory = api;
})(typeof window === 'object' ? window : globalThis);
