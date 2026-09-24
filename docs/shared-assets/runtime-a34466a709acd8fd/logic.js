/* A bounded, deliberately small Liquid-style language. No eval or JavaScript execution. */
(function (root) {
  'use strict';
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  const truth = (value) =>
    !(value === false || value == null || value === '' || value === 'hidden');
  function lookup(path, scope) {
    const parts = path.split('.');
    let value = scope;
    for (const part of parts) {
      if (forbidden.has(part)) throw Error('That template property is not available.');
      if (part === 'size' && (Array.isArray(value) || typeof value === 'string')) {
        value = value.length;
        continue;
      }
      if (value == null || !Object.hasOwn(value, part))
        throw Error('Unknown template value: ' + path);
      value = value[part];
    }
    return value;
  }
  function evaluate(expression, scope) {
    const re =
        /\s*(==|!=|>=|<=|>|<|\(|\)|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|[a-zA-Z_][\w.]*)/gy,
      tokens = [];
    let at = 0,
      m;
    while (at < expression.length) {
      re.lastIndex = at;
      m = re.exec(expression);
      if (!m) {
        if (!expression.slice(at).trim()) break;
        throw Error('Unsupported condition: ' + expression);
      }
      tokens.push(m[1]);
      at = re.lastIndex;
    }
    let i = 0;
    const take = () => tokens[i++];
    function atom() {
      const t = take();
      if (t === undefined) throw Error('Incomplete condition: ' + expression);
      if (t === '(') {
        const v = or();
        if (take() !== ')') throw Error('Close the condition bracket.');
        return v;
      }
      if (t === 'not') return !truth(atom());
      if (t === 'true') return true;
      if (t === 'false') return false;
      if (t === 'nil' || t === 'null') return null;
      if (t === 'blank') return '';
      if (/^['"]/.test(t)) return t.slice(1, -1).replace(/\\(['"\\])/g, '$1');
      if (/^-?\d/.test(t)) return Number(t);
      return lookup(t, scope);
    }
    function compare() {
      let a = atom();
      if (['==', '!=', '>=', '<=', '>', '<', 'contains'].includes(tokens[i])) {
        const op = take(),
          b = atom();
        if (op === '==') return a === b;
        if (op === '!=') return a !== b;
        if (op === 'contains') return (typeof a === 'string' || Array.isArray(a)) && a.includes(b);
        if (op === '>') return a > b;
        if (op === '<') return a < b;
        if (op === '>=') return a >= b;
        return a <= b;
      }
      return a;
    }
    function and() {
      let a = compare();
      while (tokens[i] === 'and') {
        i++;
        const b = compare();
        a = truth(a) && truth(b);
      }
      return a;
    }
    function or() {
      let a = and();
      while (tokens[i] === 'or') {
        i++;
        const b = and();
        a = truth(a) || truth(b);
      }
      return a;
    }
    const result = or();
    if (i !== tokens.length) throw Error('Unsupported condition: ' + expression);
    return result;
  }
  function compile(source) {
    const nodes = [],
      stack = [],
      token = /%%[\s\S]*?%%|{%[\s\S]*?%}|{{[\s\S]*?}}/g;
    let children = nodes,
      at = 0,
      m;
    while ((m = token.exec(source))) {
      if (m[0].startsWith('%%')) continue;
      if (m.index > at) children.push({ type: 'text', start: at, end: m.index });
      const raw = m[0],
        start = m.index,
        end = token.lastIndex,
        body = raw.slice(2, -2).trim();
      if (raw.startsWith('{{')) {
        if (!/^[a-zA-Z_][\w.]*(?:\s*\|\s*(?:escape|richtext))?$/.test(body))
          throw Error('Use a field name with an optional escape or richtext filter: ' + raw);
        children.push({ type: 'value', expression: body, start, end });
      } else if (/^if\s+/.test(body)) {
        const node = {
          type: 'if',
          branches: [{ test: body.slice(3).trim(), children: [] }],
          otherwise: [],
          start,
          end: null,
        };
        children.push(node);
        stack.push({ node, parent: children, hasElse: false });
        children = node.branches[0].children;
      } else if (/^elsif\s+/.test(body) || /^elseif\s+/.test(body)) {
        const top = stack.at(-1);
        if (!top || top.node.type !== 'if' || top.hasElse)
          throw Error('elsif must be inside an if, before else.');
        const branch = {
          test: body.replace(/^else?if\s+|^elsif\s+/, ''),
          children: [],
        };
        top.node.branches.push(branch);
        children = branch.children;
      } else if (body === 'else') {
        const top = stack.at(-1);
        if (!top || top.hasElse) throw Error('else must follow an if or for, once per block.');
        top.hasElse = true;
        children = top.node.otherwise;
      } else if (/^for\s+/.test(body)) {
        const match = body.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+([a-zA-Z_][\w.]*)$/);
        if (!match || forbidden.has(match[1]) || ['forloop', 'block_id'].includes(match[1]))
          throw Error('Use: {% for item in items %}');
        const node = {
          type: 'for',
          variable: match[1],
          collection: match[2],
          children: [],
          otherwise: [],
          start,
          end: null,
        };
        children.push(node);
        stack.push({ node, parent: children, hasElse: false });
        children = node.children;
      } else if (body === 'endif' || body === 'endfor') {
        const top = stack.pop();
        if (!top || top.node.type !== (body === 'endif' ? 'if' : 'for'))
          throw Error('Mismatched ' + body + ' tag.');
        top.node.end = end;
        children = top.parent;
      } else throw Error('Unsupported template tag: ' + body);
      if (stack.length > 20) throw Error('Template nesting is limited to 20 levels.');
      at = end;
    }
    if (stack.length)
      throw Error('Missing ' + (stack.at(-1).node.type === 'if' ? 'endif' : 'endfor') + ' tag.');
    if (at < source.length) children.push({ type: 'text', start: at, end: source.length });
    return nodes;
  }
  function render(source, scope, patches = [], hidden = [], helpers = {}) {
    const tree = compile(source);
    let iterations = 0,
      total = 0;
    function output(value) {
      total += value.length;
      if (total > 2000000) throw Error('Rendered output exceeds 2 MB.');
      return value;
    }
    function literal(start, end) {
      let out = '',
        at = start;
      const changes = [...patches, ...hidden.map((h) => ({ ...h, value: '' }))]
        .filter((p) => p.start < end && p.end > start)
        .sort((a, b) => a.start - b.start);
      for (const p of changes) {
        if (p.start < at && p.end <= at) continue;
        out += source.slice(at, Math.max(at, p.start));
        if (p.start >= start && p.end <= end) out += p.value;
        else if (p.value) throw Error('A mapped field crosses a template tag. Review its mapping.');
        at = Math.min(end, Math.max(at, p.end));
      }
      return out + source.slice(at, end);
    }
    function walk(nodes, context) {
      return nodes
        .map((node) => {
          if (hidden.some((h) => node.start >= h.start && node.end <= h.end)) return '';
          if (node.type === 'text') return output(literal(node.start, node.end));
          if (node.type === 'value') {
            const [path, filter] = node.expression.split('|').map((s) => s.trim()),
              value = lookup(path, context);
            if (value !== null && typeof value === 'object')
              throw Error('Output an item field, not a whole list or object: ' + path);
            return output(
              filter === 'richtext'
                ? helpers.richtext(value ?? '', path, context)
                : helpers.escape(value ?? ''),
            );
          }
          if (node.type === 'if') {
            for (const branch of node.branches)
              if (truth(evaluate(branch.test, context))) return walk(branch.children, context);
            return walk(node.otherwise, context);
          }
          const list = lookup(node.collection, context);
          if (!Array.isArray(list)) throw Error(node.collection + ' must be a repeatable list.');
          if (!list.length) return walk(node.otherwise, context);
          return list
            .map((item, index) => {
              if (++iterations > 1000)
                throw Error('A template can render at most 1,000 repeated items.');
              const child = Object.defineProperties(Object.create(null), {
                ...Object.getOwnPropertyDescriptors(context),
                [node.variable]: {
                  value: item,
                  enumerable: true,
                  configurable: true,
                },
                forloop: {
                  value: {
                    index: index + 1,
                    index0: index,
                    first: index === 0,
                    last: index === list.length - 1,
                    length: list.length,
                  },
                  enumerable: true,
                  configurable: true,
                },
              });
              return walk(node.children, child);
            })
            .join('');
        })
        .join('');
    }
    return walk(tree, scope);
  }
  const api = { compile, evaluate, render, truth, lookup };
  root.BlockLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
