/* Authoring helpers for existing conditional rules. Source remains authoritative. */
(function (root) {
  'use strict';
  const C = root.BlockCore;
  const path = '[a-zA-Z_]\\w*(?:\\.\\w+)*';
  function parse(expression) {
    const tokens = expression.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S+/g) || [];
    const groups = [[]];
    let join;
    for (const token of tokens) {
      if (token === 'and' || token === 'or') {
        if (join && join !== token) return null;
        join = token;
        groups.push([]);
      } else groups.at(-1).push(token);
    }
    const terms = [];
    for (const group of groups) {
      const text = group.join(' ');
      const simple = text.match(new RegExp('^(not\\s+)?(' + path + ')$'));
      if (simple) {
        terms.push({ path: simple[2], op: simple[1] ? 'absent' : 'present' });
        continue;
      }
      const comparison = text.match(
        new RegExp('^(' + path + ')\\s*(==|!=|>=|<=|>|<|contains)\\s*(.+)$'),
      );
      if (
        !comparison ||
        !/^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false)$/.test(comparison[3])
      )
        return null;
      terms.push({
        path: comparison[1],
        op: comparison[2],
        value: root.BlockLogic.evaluate(comparison[3], {}),
        quote: /^["']/.test(comparison[3]) ? comparison[3][0] : undefined,
      });
    }
    return terms.length ? { join: join || 'and', terms } : null;
  }
  function expression(rule) {
    return rule.terms
      .map((term) => {
        if (!new RegExp('^' + path + '$').test(term.path))
          throw Error('Choose a field for the rule.');
        if (term.op === 'present') return term.path;
        if (term.op === 'absent') return 'not ' + term.path;
        if (!['==', '!=', '>=', '<=', '>', '<', 'contains'].includes(term.op))
          throw Error('Choose a comparison for the rule.');
        if (
          !['string', 'number', 'boolean'].includes(typeof term.value) ||
          (typeof term.value === 'number' && !Number.isFinite(term.value))
        )
          throw Error('Enter a valid rule value.');
        const quote = term.quote === '"' ? '"' : "'";
        const literal =
          typeof term.value === 'string'
            ? quote + term.value.replace(/\\/g, '\\\\').replaceAll(quote, '\\' + quote) + quote
            : String(term.value);
        return term.path + ' ' + term.op + ' ' + literal;
      })
      .join(rule.join === 'or' ? ' or ' : ' and ');
  }
  function rules(module, field) {
    if (!module.templateMode) return [];
    root.BlockLogic.compile(module.source);
    const globals = module.fields
      .filter((f) => f.enabled !== false)
      .map((f) => ({ path: f.key || f.id, label: f.label, field: f, owner: f.id }));
    const loops = [],
      result = [];
    for (const match of module.source.matchAll(/%%[\s\S]*?%%|{%[\s\S]*?%}/g)) {
      if (match[0].startsWith('%%')) continue;
      const body = match[0].slice(2, -2).trim();
      const loop = body.match(/^for\s+(\w+)\s+in\s+([\w.]+)$/);
      if (loop) {
        const parent = globals.find((f) => f.path === loop[2]);
        loops.push({ alias: loop[1], parent });
        continue;
      }
      if (body === 'endfor') {
        loops.pop();
        continue;
      }
      const conditional = body.match(/^(if|elsif|elseif)\s+([\s\S]+)$/);
      if (!conditional) continue;
      const operands = new Map(globals.map((f) => [f.path, f]));
      for (const loop of loops) {
        for (const child of loop.parent?.field.itemFields || []) {
          const key = loop.alias + '.' + child.key;
          operands.set(key, {
            path: key,
            label: loop.parent.label + ' / ' + child.label,
            field: child,
            owner: loop.parent.owner,
          });
        }
      }
      if (loops.length) {
        for (const [key, label, type] of [
          ['index', 'Item position (from 1)', 'number'],
          ['index0', 'Item position (from 0)', 'number'],
          ['first', 'First item', 'boolean'],
          ['last', 'Last item', 'boolean'],
          ['length', 'Number of items', 'number'],
        ]) {
          const keyPath = 'forloop.' + key;
          operands.set(keyPath, {
            path: keyPath,
            label,
            field: { type },
            owner: loops.at(-1).parent?.owner,
          });
        }
      }
      const model = parse(conditional[2]);
      const references =
        conditional[2].match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[a-zA-Z_]\w*(?:\.\w+)*/g) || [];
      if (!references.some((key) => operands.get(key)?.owner === field.id)) continue;
      result.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        tag: conditional[1],
        condition: conditional[2],
        line: module.source.slice(0, match.index).split('\n').length,
        model: model && model.terms.every((t) => operands.has(t.path)) ? model : null,
        operands: [...operands.values()],
      });
    }
    return result;
  }
  function apply(module, changes) {
    const draft = JSON.parse(JSON.stringify(module));
    const patches = changes.filter((change) => change.value !== change.original);
    for (const patch of patches) {
      if (module.source.slice(patch.start, patch.end) !== patch.original)
        throw Error('The template changed. Reopen the field before editing its rules.');
    }
    if (patches.length) C.rebase(draft, patches);
    return draft;
  }
  root.BlockTemplateRules = { parse, expression, rules, apply };
})(window);
