/* Jarrang Block Studio - lean runtime core: parsing, validation and rendering for exported SFMC blocks. */
(function (root) {
  'use strict';
  const escape = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const dynamic = (value) => /%%|\{\{|\{%|<%/.test(value);
  const L = root.BlockLogic || (typeof require === 'function' ? require('./logic.js') : null);
  function parse(source) {
    const nodes = [],
      issues = [];
    // Mask server-side expressions without changing source offsets.
    const masked = source.replace(/%%[\s\S]*?%%|{%[\s\S]*?%}|{{[\s\S]*?}}/g, (s) =>
      s.replace(/[^\r\n]/g, ' '),
    );
    const voidTags = new Set([
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ]);
    function scan(from, to, hidden) {
      const stack = [];
      let at = from;
      while (at < to) {
        const start = masked.indexOf('<', at);
        if (start < 0 || start >= to) break;
        if (masked.startsWith('<!--', start)) {
          const isConditional = /^<!--\s*\[if\b/i.test(masked.slice(start, start + 40));
          if (isConditional) {
            const closeIndex = masked.indexOf('<![endif]-->', start + 4);
            if (closeIndex >= 0) {
              scan(start + 4, closeIndex, true);
              at = closeIndex + '<![endif]-->'.length;
              continue;
            }
          }
          const end = masked.indexOf('-->', start + 4);
          if (end < 0) {
            issues.push('An HTML comment is not closed.');
            break;
          }
          if (isConditional) scan(start + 4, end, true);
          at = end + 3;
          continue;
        }
        let end = start + 1,
          quote = '';
        for (; end < to; end++) {
          const ch = masked[end];
          if (quote) {
            if (ch === quote) quote = '';
          } else if (ch === '"' || ch === "'") quote = ch;
          else if (ch === '>') break;
        }
        if (end >= to) {
          issues.push('An HTML tag is not closed.');
          break;
        }
        const token = masked.slice(start, end + 1),
          match = token.match(/^<\s*(\/?)\s*([a-z][\w:-]*)/i);
        at = end + 1;
        if (!match) continue;
        const tag = match[2].toLowerCase();
        if (match[1]) {
          const index = stack.map((n) => n.tag).lastIndexOf(tag);
          if (index >= 0) {
            const node = stack[index];
            node.innerEnd = start;
            node.end = end + 1;
            stack.splice(index);
          }
          continue;
        }
        const attrs = [],
          re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
        re.lastIndex = match[0].length;
        let a;
        while ((a = re.exec(token))) {
          const raw = a[0],
            eq = raw.indexOf('='),
            rest = raw.slice(eq + 1),
            trim = rest.length - rest.trimStart().length;
          const quoteChar = rest.trimStart()[0],
            quoted = quoteChar === '"' || quoteChar === "'";
          const valueStart = start + a.index + eq + 1 + trim + (quoted ? 1 : 0);
          const valueLength = (a[2] ?? a[3] ?? a[4]).length;
          attrs.push({
            name: a[1].toLowerCase(),
            start: valueStart,
            end: valueStart + valueLength,
            value: source.slice(valueStart, valueStart + valueLength),
            quoted,
          });
        }
        const node = {
          id: 'n' + nodes.length,
          tag,
          start,
          startEnd: end + 1,
          innerStart: end + 1,
          innerEnd: end + 1,
          end: end + 1,
          hidden,
          attrs,
          parent: stack.at(-1)?.id || null,
        };
        nodes.push(node);
        if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) {
          if (['script', 'style', 'textarea', 'title'].includes(tag)) {
            const closeRe = new RegExp('</\\s*' + tag + '\\s*>', 'ig');
            closeRe.lastIndex = at;
            const closing = closeRe.exec(masked);
            if (closing) {
              node.innerEnd = closing.index;
              node.end = closing.index + closing[0].length;
              at = node.end;
            }
          } else stack.push(node);
        }
      }
    }
    scan(0, source.length, false);
    return { nodes, issues };
  }
  function decode(value) {
    if (typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.innerHTML = value;
      return el.value;
    }
    return value
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, '\u00a0');
  }
  function normaliseColour(value) {
    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(text)) return text;
    if (/^#[0-9a-f]{3}$/.test(text)) return '#' + [...text.slice(1)].map((c) => c + c).join('');
    const rgb = text.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    return rgb && rgb.slice(1).every((n) => Number(n) <= 255)
      ? '#' +
          rgb
            .slice(1)
            .map((n) => Number(n).toString(16).padStart(2, '0'))
            .join('')
      : '';
  }
  function linkStyle(field = {}) {
    const s = field.linkStyle || {};
    return {
      colour: normaliseColour(s.colour) || 'inherit',
      decoration: ['underline', 'none'].includes(s.decoration) ? s.decoration : 'underline',
      weight: ['normal', 'bold', 'inherit'].includes(s.weight) ? s.weight : 'inherit',
    };
  }
  function linkStyleCSS(field = {}) {
    const s = linkStyle(field);
    return (
      'color:' + s.colour + ';text-decoration:' + s.decoration + ';font-weight:' + s.weight + ';'
    );
  }
  function richLinksAllowed(source, targets = []) {
    return !targets.some((t) =>
      parse(source).nodes.some(
        (n) => n.tag === 'a' && t.start >= n.innerStart && t.end <= n.innerEnd,
      ),
    );
  }
  function cleanRich(value, field = {}) {
    if (typeof document === 'undefined') throw Error('Rich text requires a browser.');
    const doc = new DOMParser().parseFromString(String(value), 'text/html');
    const allowed = new Set([
      'B',
      'STRONG',
      'I',
      'EM',
      'U',
      'SUP',
      'SUB',
      'BR',
      'A',
      'P',
      'DIV',
      'SPAN',
      'FONT',
    ]);
    // Keep anchors outside surrounding formatting so ancestor colours, bold and
    // propagated underlines cannot override the field's link appearance.
    function wrap(tag, style, children) {
      const out = [];
      let current;
      for (const child of children) {
        if (child.nodeName === 'A') {
          out.push(child);
          current = null;
          continue;
        }
        if (!current) {
          current = doc.createElement(tag);
          if (style) current.setAttribute('style', style);
          out.push(current);
        }
        current.append(child);
      }
      return out;
    }
    function visit(node, inLink = false) {
      if (node.nodeType === 3) return [doc.createTextNode(node.nodeValue)];
      if (
        node.nodeType !== 1 ||
        ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)
      )
        return [];
      if (node.tagName === 'A') {
        const href = (node.getAttribute('href') || '').trim();
        if (inLink || field.allowLinks === false || !href || !validUrl(href, 'url'))
          return [...node.childNodes].flatMap((n) => visit(n, inLink));
        const a = doc.createElement('a');
        a.setAttribute('href', href);
        a.setAttribute('style', linkStyleCSS(field));
        a.append(...[...node.childNodes].flatMap((n) => visit(n, true)));
        return [a];
      }
      const children = [...node.childNodes].flatMap((n) => visit(n, inLink));
      if (!allowed.has(node.tagName)) return children;
      if (node.tagName === 'BR') return [doc.createElement('br')];
      if (['P', 'DIV'].includes(node.tagName)) return [...children, doc.createElement('br')];
      if (['SPAN', 'FONT'].includes(node.tagName)) {
        const colour = normaliseColour(node.style.color || node.getAttribute('color'));
        return !inLink && colour ? wrap('span', 'color:' + colour + ';', children) : children;
      }
      if (inLink && ['B', 'STRONG', 'U'].includes(node.tagName)) return children;
      const style =
        node.tagName === 'SUP'
          ? 'font-size:75%;line-height:0;vertical-align:super;'
          : node.tagName === 'SUB'
            ? 'font-size:75%;line-height:0;vertical-align:sub;'
            : '';
      return wrap(node.tagName.toLowerCase(), style, children);
    }
    const out = doc.createElement('div');
    out.append(...[...doc.body.childNodes].flatMap((n) => visit(n)));
    return out.innerHTML.replace(/<br>$/, '');
  }
  function validUrl(value, type) {
    if (!value) return true;
    if (dynamic(value)) return false;
    if (
      type === 'url' &&
      (/^mailto:[^\s]+$/i.test(value) ||
        /^tel:[+\d().\s-]+$/i.test(value) ||
        /^#[\w-]+$/.test(value))
    )
      return true;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !/[<>"'\s]/.test(value);
    } catch {
      return false;
    }
  }
  function valueShape(field, value) {
    if (field.type === 'list') {
      if (!Array.isArray(value)) return 'Enter a list of items.';
      if (!Array.isArray(field.itemFields)) return 'The list is missing its item fields.';
      for (let i = 0; i < value.length; i++) {
        const row = value[i];
        if (!row || typeof row !== 'object' || Array.isArray(row))
          return 'Item ' + (i + 1) + ' must be an object of field values.';
        for (const child of field.itemFields) {
          const error = valueShape(
            child,
            Object.hasOwn(row, child.key) ? row[child.key] : child.defaultValue,
          );
          if (error) return 'Item ' + (i + 1) + ', ' + child.label + ': ' + error;
        }
      }
    } else if (
      (value !== null && typeof value === 'object') ||
      !['string', 'number', 'boolean'].includes(typeof value)
    )
      return 'Enter a valid field value.';
    return '';
  }
  function validate(field, value) {
    const shape = valueShape(field, value);
    if (shape) return shape;
    if (field.type === 'toggle')
      return ['shown', 'hidden', true, false].includes(value) ? '' : 'Choose shown or hidden.';
    if (field.type === 'list') {
      if (!Array.isArray(value)) return 'Enter a list of items.';
      if (value.length < (field.minItems ?? 0) || value.length > (field.maxItems ?? 50))
        return (
          'Use between ' + (field.minItems ?? 0) + ' and ' + (field.maxItems ?? 50) + ' items.'
        );
      for (let i = 0; i < value.length; i++)
        for (const child of field.itemFields || []) {
          const error = validate(child, value[i]?.[child.key] ?? child.defaultValue);
          if (error) return 'Item ' + (i + 1) + ', ' + child.label + ': ' + error;
        }
      return '';
    }
    const text = String(value ?? '');
    if (field.required && !text.trim()) return 'Enter ' + field.label.toLowerCase() + '.';
    if (field.maxLength > 0 && decode(text.replace(/<[^>]*>/g, '')).length > field.maxLength)
      return 'Use ' + field.maxLength + ' characters or fewer.';
    if (['url', 'image'].includes(field.type) && !validUrl(text, field.type))
      return field.type === 'image'
        ? 'Use a complete http or https image URL.'
        : 'Use a complete web, mailto or tel link.';
    if (field.type === 'colour' && !/^#[0-9a-f]{6}$/i.test(text))
      return 'Use a six-digit hex colour.';
    if (field.type === 'number' && (!Number.isFinite(Number(text)) || text.trim() === ''))
      return 'Enter a number.';
    if (
      field.type === 'select' &&
      (!Array.isArray(field.options) || !field.options.some((o) => o.value === text))
    )
      return 'Choose one of the configured dropdown options.';
    for (const t of field.targets || []) {
      if (
        t.kind === 'css' &&
        (!['colour', 'number', 'select'].includes(field.type) || !/^[-\w#.%(),\s'"/]*$/.test(text))
      )
        return 'Choose a colour, number or dropdown containing a CSS value only.';
      if (
        ['href', 'src', 'background'].includes(t.name) &&
        !validUrl(text, t.name === 'href' ? 'url' : 'image')
      )
        return 'This location needs a complete, valid URL.';
    }
    return '';
  }
  function hiddenRanges(module, values = {}) {
    return module.fields
      .filter(
        (f) =>
          f.enabled &&
          f.type === 'toggle' &&
          ['hidden', false].includes(Object.hasOwn(values, f.id) ? values[f.id] : f.defaultValue),
      )
      .flatMap((f) => f.targets)
      .sort((a, b) => a.start - b.start)
      .filter(
        (r, i, all) =>
          !all.some(
            (other, j) =>
              j !== i &&
              other.start <= r.start &&
              other.end >= r.end &&
              (other.start < r.start || other.end > r.end || j < i),
          ),
      );
  }
  function fieldActive(module, field, values = {}) {
    if (field.type === 'toggle') return true;
    return (
      !field.targets.length ||
      !field.targets.every((t) =>
        hiddenRanges(module, values).some((h) => t.start >= h.start && t.end <= h.end),
      )
    );
  }
  function scopeValue(field, value, owners) {
    if (field.type === 'toggle') return value === true || value === 'shown';
    if (field.type === 'number') return Number(value);
    if (field.type === 'list')
      return value.map((row) => {
        const item = Object.fromEntries(
          field.itemFields.map((child) => [
            child.key,
            scopeValue(child, row[child.key] ?? child.defaultValue, owners),
          ]),
        );
        owners.set(item, Object.fromEntries(field.itemFields.map((f) => [f.key, f])));
        return item;
      });
    return value;
  }
  function render(module, values = {}, options = {}) {
    const patches = [],
      hidden = hiddenRanges(module, values),
      scope = Object.create(null),
      owners = new WeakMap(),
      definitions = Object.fromEntries(module.fields.map((f) => [f.key || f.id, f]));
    scope.block_id = options.blockId || 'bs_preview';
    for (const field of module.fields.filter((f) => f.enabled)) {
      const value = Object.hasOwn(values, field.id) ? values[field.id] : field.defaultValue;
      if (!fieldActive(module, field, values)) continue;
      const checked = () => {
        const error = validate(field, value);
        if (error) throw Error(field.label + ': ' + error);
        return value;
      };
      Object.defineProperty(scope, field.key || field.id, {
        enumerable: true,
        configurable: true,
        get: () => scopeValue(field, checked(), owners),
      });
      if (field.type === 'toggle') {
        checked();
        continue;
      }
      if (field.type === 'list') continue;
      for (const target of field.targets) {
        if (hidden.some((h) => target.start >= h.start && target.end <= h.end)) continue;
        const replacement = () => {
          checked();
          if (
            !(field.type === 'richtext' && field.linkStyle) &&
            String(value) ===
              String(target.originalValue ?? field.originalValue ?? field.defaultValue)
          )
            return module.source.slice(target.start, target.end);
          let output =
            target.kind === 'css' && target.encoding === 'raw'
              ? String(value)
              : field.type === 'richtext' && target.kind === 'content'
                ? cleanRich(value, {
                    ...field,
                    allowLinks:
                      field.allowLinks !== false && richLinksAllowed(module.source, [target]),
                  })
                : escape(value);
          if (field.type === 'text' && target.kind === 'content')
            output = output.replace(/\r?\n/g, '<br>');
          if (target.kind === 'attribute' && target.quoted === false) output = '"' + output + '"';
          return output;
        };
        if (!module.templateMode) {
          const output = replacement();
          if (output !== module.source.slice(target.start, target.end))
            patches.push({
              start: target.start,
              end: target.end,
              value: output,
            });
        } else
          Object.defineProperty(
            patches[patches.push({ start: target.start, end: target.end }) - 1],
            'value',
            { enumerable: true, get: replacement },
          );
      }
    }
    patches.sort((a, b) => a.start - b.start);
    for (let i = 1; i < patches.length; i++)
      if (patches[i].start < patches[i - 1].end)
        throw Error('Two editable fields overlap. Review their mappings.');
    if (module.templateMode)
      return L.render(module.source, scope, patches, hidden, {
        escape,
        richtext: (value, path, context) => {
          const parts = path.split('.'),
            key = parts.pop();
          let owner = context;
          for (const p of parts) owner = owner[p];
          return cleanRich(
            value,
            (parts.length ? owners.get(owner)?.[key] : definitions[key]) || {},
          );
        },
      });
    let out = module.source;
    for (const patch of [...patches, ...hidden.map((h) => ({ ...h, value: '' }))].sort(
      (a, b) => b.start - a.start,
    ))
      out = out.slice(0, patch.start) + patch.value + out.slice(patch.end);
    return out;
  }
  const api = {
    escape,
    dynamic,
    parse,
    decode,
    normaliseColour,
    linkStyle,
    linkStyleCSS,
    richLinksAllowed,
    cleanRich,
    validUrl,
    valueShape,
    validate,
    hiddenRanges,
    fieldActive,
    render,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BlockRuntimeCore = api;
  root.BlockCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
