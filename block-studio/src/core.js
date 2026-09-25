/* Jarrang Block Studio - source-preserving conversion engine. */
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
  const slug = (value) =>
    String(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'module';
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
  function infer(source) {
    const parsed = parse(source),
      fields = [],
      taken = [];
    const add = (label, type, value, targets, extra = {}) =>
      fields.push({
        id: 'field' + (fields.length + 1),
        label,
        type,
        defaultValue: value,
        originalValue: value,
        enabled: true,
        required: false,
        maxLength: 0,
        help: '',
        targets,
        ...extra,
      });
    for (const node of parsed.nodes) {
      if (node.hidden || taken.some((t) => node.start >= t.start && node.end <= t.end)) continue;
      const targetAttr = (name) => node.attrs.find((a) => a.name === name);
      if (node.tag === 'img') {
        const src = targetAttr('src'),
          alt = targetAttr('alt');
        if (src && !dynamic(src.value))
          add('Image', 'image', decode(src.value), [
            { ...src, nodeId: node.id, kind: 'attribute' },
          ]);
        if (alt && !dynamic(alt.value))
          add('Image description', 'text', decode(alt.value), [
            { ...alt, nodeId: node.id, kind: 'attribute' },
          ]);
      }
      if (node.tag === 'a') {
        const href = targetAttr('href');
        if (href && !dynamic(href.value)) {
          const targets = [{ ...href, nodeId: node.id, kind: 'attribute' }];
          // Match only hidden Outlook counterparts. Distinct visible links stay independent.
          for (const hidden of parsed.nodes.filter((n) => n.hidden))
            for (const attr of hidden.attrs) {
              if (
                attr.name === 'href' &&
                attr.value === href.value &&
                !fields.some((f) => f.targets.some((t) => t.start === attr.start))
              )
                targets.push({ ...attr, nodeId: hidden.id, kind: 'attribute' });
            }
          add('Link destination', 'url', decode(href.value), targets);
        }
      }
      if (
        !['h1', 'h2', 'h3', 'h4', 'p', 'a', 'td', 'span', 'div', 'label', 'li'].includes(
          node.tag,
        ) ||
        node.innerEnd <= node.innerStart
      )
        continue;
      if (taken.some((t) => node.start >= t.start && node.end <= t.end)) continue;
      const inner = source.slice(node.innerStart, node.innerEnd);
      if (
        dynamic(inner) ||
        /<!--|<(?!\/?(?:b|strong|em|i|u|sup|sub|br|span|a)\b)[a-z!/]/i.test(inner)
      )
        continue;
      const plain = decode(inner.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')).trim();
      if (!plain || /^[\s\u00a0]+$/.test(plain)) continue;
      if (/<a\b/i.test(inner) && !['p', 'h1', 'h2', 'h3', 'h4'].includes(node.tag)) continue;
      const formatted = /<(?:b|strong|em|i|u|sup|sub|span|a)\b/i.test(inner);
      add(
        /^h/.test(node.tag) ? 'Heading' : node.tag === 'a' ? 'Button text' : 'Text',
        formatted ? 'richtext' : 'text',
        formatted ? inner : plain,
        [
          {
            start: node.innerStart,
            end: node.innerEnd,
            nodeId: node.id,
            kind: 'content',
          },
        ],
        { allowLinks: node.tag !== 'a' },
      );
      taken.push(node);
    }
    const counts = {};
    fields.forEach((f) => {
      counts[f.label] = (counts[f.label] || 0) + 1;
      if (counts[f.label] > 1) f.label += ' ' + counts[f.label];
    });
    return { fields, ...parsed };
  }
  function manualField(source, start, end, fields = []) {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > source.length
    )
      throw Error('Select the exact source text or attribute value to make editable.');
    const selected = source.slice(start, end);
    if (!selected.trim())
      throw Error('Select visible text or an attribute value, not empty whitespace.');
    const parsed = parse(source);
    const section = parsed.nodes.find((n) => !n.hidden && n.start === start && n.end === end);
    const ranges = fields.filter((f) => f.enabled).flatMap((f) => f.targets || []);
    if (
      ranges.some(
        (t) =>
          start < t.end &&
          end > t.start &&
          !(t.kind === 'element' && start >= t.start && end <= t.end) &&
          !(section && start <= t.start && end >= t.end),
      )
    )
      throw Error('That selection overlaps an existing editable field.');
    if (section) {
      if (
        ['html', 'head', 'body', 'script', 'style', 'meta', 'link', 'title'].includes(section.tag)
      )
        throw Error('Choose a content element, not a document or script tag.');
      return {
        label: 'Section',
        type: 'toggle',
        defaultValue: 'shown',
        enabled: true,
        required: false,
        maxLength: 0,
        help: '',
        style: 'checkbox',
        targets: [{ start, end, nodeId: section.id, kind: 'element' }],
      };
    }
    const target = mappingTarget(source, start, end),
      name = target.name;
    const type =
      name === 'href'
        ? 'url'
        : name === 'src'
          ? 'image'
          : /^#[0-9a-f]{6}$/i.test(selected)
            ? 'colour'
            : /^-?\d+(?:\.\d+)?$/.test(selected)
              ? 'number'
              : target.kind === 'css'
                ? 'select'
                : /<(?:b|strong|em|i|u|sup|sub|a|br|span)\b/i.test(selected)
                  ? 'richtext'
                  : 'text';
    const value = sourceValue(source, target, type);
    target.originalValue = value;
    return {
      label:
        target.kind === 'css'
          ? 'Style value'
          : type === 'colour'
            ? 'Colour'
            : name === 'href'
              ? 'Link destination'
              : name === 'src'
                ? 'Image'
                : 'Text',
      type,
      defaultValue: value,
      originalValue: value,
      enabled: true,
      required: false,
      maxLength: 0,
      help: '',
      targets: [target],
      ...(type === 'select' ? { options: [{ label: value, value }] } : {}),
    };
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
  function sourceValue(source, target, type) {
    const raw = source.slice(target.start, target.end);
    return type === 'richtext'
      ? raw
      : decode(
          target.kind === 'content'
            ? raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
            : raw,
        );
  }
  function preserveOriginal(field) {
    if (field.originalValue === undefined) field.originalValue = field.defaultValue;
  }
  function sourceOffset(source, normalisedOffset) {
    let raw = 0,
      normal = 0;
    while (normal < normalisedOffset && raw < source.length) {
      raw += source[raw] === '\r' && source[raw + 1] === '\n' ? 2 : 1;
      normal++;
    }
    return raw;
  }
  function mappingTarget(source, start, end) {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > source.length
    )
      throw Error('Highlight the value to replace in the code.');
    for (const match of source.matchAll(/%%[\s\S]*?%%|\{\{[\s\S]*?\}\}/g))
      if (start < match.index + match[0].length && end > match.index)
        throw Error(
          'Personalisation expressions stay protected. Select a static value outside the expression.',
        );
    const { nodes } = parse(source),
      raw = source.slice(start, end);
    for (const node of nodes) {
      const attr = node.attrs.find((a) => start >= a.start && end <= a.end);
      if (attr) {
        if (/^on/.test(attr.name) || ['srcdoc'].includes(attr.name) || dynamic(attr.value))
          throw Error('This attribute cannot be mapped as an editable field.');
        if (!attr.quoted && (start !== attr.start || end !== attr.end))
          throw Error('Select the whole unquoted attribute value.');
        if (
          ['src', 'href', 'background'].includes(attr.name) &&
          (start !== attr.start || end !== attr.end)
        )
          throw Error(
            'Select the whole attribute value for a URL, without its surrounding quotes.',
          );
        if (attr.name === 'style') {
          const before = source.slice(attr.start, start),
            after = source.slice(end, attr.end);
          if (
            !/(?:^|;)\s*[-\w]+\s*:\s*[^;{}]*$/.test(before) ||
            /[;{}<>]/.test(raw) ||
            !/^[^;{}]*(?:;|$)/.test(after)
          )
            throw Error(
              'Select a CSS value only, such as #ffffff or center. Leave the property name and semicolon outside the selection.',
            );
          return {
            start,
            end,
            nodeId: node.id,
            kind: 'css',
            encoding: 'attribute',
            name: 'style',
            quoted: attr.quoted,
          };
        }
        return {
          start,
          end,
          nodeId: node.id,
          kind: 'attribute',
          name: attr.name,
          quoted: attr.quoted,
        };
      }
    }
    const style = nodes.find(
      (n) => n.tag === 'style' && start >= n.innerStart && end <= n.innerEnd,
    );
    if (style) {
      if (
        !/(?:^|[;{])\s*[-\w]+\s*:\s*[^;{}]*$/.test(source.slice(style.innerStart, start)) ||
        /[;{}<>]/.test(raw)
      )
        throw Error('Select a CSS declaration value, without its property name or semicolon.');
      return { start, end, nodeId: style.id, kind: 'css', encoding: 'raw' };
    }
    const content = nodes
      .filter(
        (n) =>
          !['script', 'style'].includes(n.tag) &&
          start >= n.innerStart &&
          end <= n.innerEnd &&
          n.innerEnd > n.innerStart,
      )
      .sort((a, b) => a.innerEnd - a.innerStart - (b.innerEnd - b.innerStart))[0];
    if (
      !content ||
      nodes.some(
        (n) =>
          start < n.startEnd &&
          end > n.start &&
          !(start === content.innerStart && end === content.innerEnd),
      ) ||
      /<!--|-->|<%|%%|\{\{/.test(raw)
    )
      throw Error(
        'Select text content or an attribute value. HTML tags and structural code stay fixed.',
      );
    if (
      /<[^>]*>/.test(raw) &&
      !(
        start === content.innerStart &&
        end === content.innerEnd &&
        !/<(?!\/?(?:b|strong|i|em|u|sup|sub|br|a|span)\b)/i.test(raw)
      )
    )
      throw Error('Select plain text or the complete formatted text inside one element.');
    return { start, end, nodeId: content.id, kind: 'content' };
  }
  function fieldProblems(field) {
    const errors = [];
    if (field.type === 'richtext' && field.linkStyle) {
      const s = field.linkStyle;
      if (s.colour !== 'inherit' && !normaliseColour(s.colour))
        errors.push('Choose a valid hex colour for links.');
      if (!['underline', 'none'].includes(s.decoration))
        errors.push('Choose the link underline setting.');
      if (!['inherit', 'normal', 'bold'].includes(s.weight)) errors.push('Choose the link weight.');
    }
    if (!field.label?.trim()) errors.push('Give the field a label.');
    if (!field.targets?.length && field.binding !== 'template')
      errors.push('Map at least one source location.');
    if (field.binding === 'template' && !/^[a-zA-Z_]\w*$/.test(field.key || ''))
      errors.push('Use a template key made of letters, numbers and underscores.');
    if (field.type === 'list') {
      if (!field.itemFields?.length) errors.push('Add at least one item field.');
      const keys = new Set();
      for (const child of field.itemFields || []) {
        if (keys.has(child.key)) errors.push('Item field keys must be unique.');
        keys.add(child.key);
        errors.push(...fieldProblems({ ...child, binding: 'template', targets: [] }));
      }
      if (
        !Number.isInteger(field.minItems) ||
        !Number.isInteger(field.maxItems) ||
        field.minItems < 0 ||
        field.maxItems < field.minItems ||
        field.maxItems > 200
      )
        errors.push('Choose item limits between 0 and 200.');
    }
    if (field.type === 'select') {
      if (!Array.isArray(field.options) || !field.options.length)
        errors.push('Add at least one dropdown option.');
      else {
        const values = new Set();
        for (const o of field.options) {
          if (typeof o.label !== 'string' || !o.label.trim() || typeof o.value !== 'string')
            errors.push('Every dropdown option needs a label and a value.');
          if (values.has(o.value)) errors.push('Dropdown values must be unique.');
          values.add(o.value);
          const e = validate({ ...field, required: false, maxLength: 0 }, o.value);
          if (e) errors.push(e);
        }
      }
    }
    if (field.type === 'richtext' && field.targets?.some((t) => t.kind !== 'content'))
      errors.push('Formatted text can only replace text content.');
    const error = validate(field, field.defaultValue);
    if (error) errors.push(error);
    return [...new Set(errors)];
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
  function uniqueKey(module, label) {
    let base = slug(label).replace(/-/g, '_');
    if (!/^[a-zA-Z_]/.test(base)) base = 'field_' + base;
    let key = base,
      n = 2;
    while (
      ['block_id', 'forloop', 'item', 'constructor', 'prototype', '__proto__'].includes(key) ||
      module.fields.some((f) => (f.key || f.id) === key)
    )
      key = base + '_' + n++;
    return key;
  }
  function templateField(module, type = 'toggle', label = 'Show section') {
    return {
      id: 'control_' + Math.random().toString(36).slice(2),
      key: uniqueKey(module, label),
      label,
      type,
      binding: 'template',
      enabled: true,
      required: false,
      help: '',
      maxLength: 0,
      targets: [],
      defaultValue:
        type === 'toggle'
          ? 'shown'
          : type === 'colour'
            ? '#ffffff'
            : type === 'number'
              ? '0'
              : type === 'list'
                ? []
                : '',
      ...(type === 'select' ? { options: [{ label: 'Option one', value: '' }] } : {}),
      ...(type === 'list'
        ? {
            itemFields: [
              {
                id: 'text',
                key: 'text',
                label: 'Text',
                type: 'text',
                defaultValue: 'New item',
                required: false,
                maxLength: 0,
                targets: [],
                binding: 'template',
              },
            ],
            minItems: 0,
            maxItems: 20,
          }
        : {}),
    };
  }
  function rebase(module, edits, removed = []) {
    edits.sort((a, b) => a.start - b.start);
    function position(pos, endBoundary = false) {
      let shift = 0;
      for (const e of edits) {
        if (e.end < pos || (e.end === pos && (e.start !== e.end || !endBoundary)))
          shift += e.value.length - (e.end - e.start);
        else if (e.start < pos && e.end > pos)
          throw Error('A source edit crosses a field boundary.');
      }
      return pos + shift;
    }
    for (const field of module.fields.filter((f) => !removed.includes(f.id)))
      for (const t of field.targets) {
        t.start = position(t.start);
        t.end = position(t.end, true);
      }
    let out = module.source;
    for (const e of [...edits].reverse()) out = out.slice(0, e.start) + e.value + out.slice(e.end);
    module.fields = module.fields.filter((f) => !removed.includes(f.id));
    module.source = out;
    module.draftSource = out;
    module.templateMode = true;
    const nodes = parse(out).nodes;
    for (const f of module.fields)
      for (const t of f.targets) {
        const n = nodes
          .filter((n) => n.start <= t.start && n.end >= t.end)
          .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
        if (n) t.nodeId = n.id;
      }
    module.reviewed = false;
    module.acknowledged = false;
  }
  function repeatSelection(module, start, end) {
    const draft = JSON.parse(JSON.stringify(module));
    const list = repeatSelectionDraft(draft, start, end);
    Object.assign(module, draft);
    return list;
  }
  function repeatSelectionDraft(module, start, end) {
    const section = parse(module.source).nodes.find((n) => n.start === start && n.end === end);
    if (!section)
      throw Error('Select one complete element to repeat, such as a list item or a table row.');
    const selection = module.source.slice(start, end);
    if (/{%/.test(selection))
      throw Error(
        'This automatic conversion needs a static section. Use the template editor for existing logic or personalisation.',
      );
    if (/%%\[/.test(selection))
      throw Error(
        'This selection contains AMPscript logic blocks. Use the template editor for existing logic or personalisation.',
      );
    const references = [...module.source.matchAll(/{{([\s\S]*?)}}|{%([\s\S]*?)%}/g)].map(
      (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        expression: match[1],
        statement: match[2],
      }),
    );
    const selectedRefs = references.filter((ref) => ref.start >= start && ref.end <= end);
    const connected = new Map();
    for (const ref of selectedRefs) {
      const match = ref.expression?.trim().match(/^([A-Za-z_]\w*)(\s*\|\s*(?:escape|richtext))?$/);
      const field =
        match &&
        module.fields.find((f) => (f.key || f.id) === match[1] && f.binding === 'template');
      if (!field)
        throw Error(
          'This section contains an unconnected field reference or custom expression. Connect its fields before making it repeatable.',
        );
      if (!connected.has(field.id)) connected.set(field.id, []);
      connected.get(field.id).push({ ...ref, filter: match[2] || '' });
    }
    const inside = module.fields.filter(
      (f) =>
        connected.has(f.id) ||
        (f.targets.length && f.targets.some((t) => t.start >= start && t.end <= end)),
    );
    for (const f of inside) {
      if (!f.enabled)
        throw Error(
          'This section contains a disabled field. Enable it or remove its connection before making it repeatable.',
        );
      if (
        ['toggle', 'list'].includes(f.type) ||
        f.targets.some((t) => t.start < start || t.end > end)
      )
        throw Error(
          'This section has a toggle, group or mapping outside the selection. Choose a boundary containing all of its connections.',
        );
      const key = f.key || f.id;
      if (
        references.some(
          (ref) =>
            (ref.start < start || ref.end > end) &&
            (
              ref.text.replace(/"[^"\n]*"|'[^'\n]*'/g, '').match(/\b[A-Za-z_]\w*(?:\.\w+)*/g) || []
            ).some((word) => word.split('.')[0] === key),
        )
      )
        throw Error(
          'The field “' +
            f.label +
            '” is also used outside this section. Choose a boundary containing all its connections.',
        );
    }
    if (!inside.length)
      throw Error('Map the editable content inside this section before making it repeatable.');
    const list = templateField(module, 'list', 'Items'),
      used = new Set(),
      row = {},
      edits = [];
    list.itemFields = [];
    for (const f of inside) {
      let key = slug(f.label).replace(/-/g, '_');
      if (!/^[a-zA-Z_]/.test(key)) key = 'item_' + key;
      let n = 2,
        base = key;
      while (used.has(key)) key = base + '_' + n++;
      used.add(key);
      const child = {
        ...JSON.parse(JSON.stringify(f)),
        id: key,
        key,
        targets: [],
        binding: 'template',
      };
      list.itemFields.push(child);
      row[key] = f.defaultValue;
      for (const ref of connected.get(f.id) || [])
        edits.push({
          start: ref.start,
          end: ref.end,
          value: '{{ item.' + key + ref.filter + ' }}',
        });
      for (const t of f.targets)
        edits.push({
          start: t.start,
          end: t.end,
          value: '{{ item.' + key + (f.type === 'richtext' ? ' | richtext' : '') + ' }}',
        });
    }
    list.defaultValue = [row];
    edits.push({
      start,
      end: start,
      value: '{% for item in ' + list.key + ' %}',
    });
    edits.push({ start: end, end, value: '{% endfor %}' });
    rebase(
      module,
      edits,
      inside.map((f) => f.id),
    );
    module.fields.push(list);
    return list;
  }
  function inspect(module) {
    const warnings = [...parse(module.source).issues];
    if (/%%/.test(module.source) || (!module.templateMode && dynamic(module.source)))
      warnings.push(
        'Personalisation is preserved and locked. Verify it with subscriber preview in SFMC.',
      );
    if (/<!--\s*\[if|<v:/i.test(module.source))
      warnings.push(
        'Outlook markup is preserved. Check linked image, colour and destination values in the source.',
      );
    if (/<(?:input|video|form)|:checked/i.test(module.source))
      warnings.push('Interactive content needs specialist fallback and email-client testing.');
    if (/<(?:script|iframe|object|embed)\b|\son\w+\s*=/i.test(module.source))
      warnings.push('Executable HTML is present. Remove it before exporting an email module.');
    if (/(?:src|href)\s*=\s*["'](?!(?:https?:|mailto:|tel:|#|%%))/i.test(module.source))
      warnings.push('Relative or unsupported asset links need reviewing before publication.');
    if (
      /\bclass\s*=/i.test(module.source) &&
      !module.contextCss &&
      !/<style\b/i.test(module.source)
    )
      warnings.push(
        'This module uses CSS classes. Add its master-template CSS for an accurate preview.',
      );
    if (/<!doctype|<html\b|<body\b/i.test(module.source))
      warnings.push('A complete email was imported. Extract a module fragment before exporting.');
    return [...new Set(warnings)];
  }
  function assertProject(project) {
    if (
      !project ||
      project.format !== 'jarrang-block-studio' ||
      project.version !== 1 ||
      !Array.isArray(project.modules)
    )
      throw Error('Choose a Block Studio project file.');
    if (project.modules.length > 100) throw Error('A project can contain up to 100 modules.');
    const moduleIds = new Set();
    for (const m of project.modules) {
      if (moduleIds.has(m.id)) throw Error('The project contains duplicate module identities.');
      moduleIds.add(m.id);
      if (
        typeof m.source !== 'string' ||
        m.source.length > 2000000 ||
        !Array.isArray(m.fields) ||
        typeof m.name !== 'string' ||
        typeof m.id !== 'string' ||
        typeof m.slug !== 'string'
      )
        throw Error('The project contains an invalid module.');
      const ids = new Set();
      for (const f of m.fields) {
        if (
          typeof f.id !== 'string' ||
          ids.has(f.id) ||
          ![
            'text',
            'richtext',
            'url',
            'image',
            'colour',
            'number',
            'toggle',
            'select',
            'list',
          ].includes(f.type) ||
          typeof f.label !== 'string' ||
          !Array.isArray(f.targets) ||
          (f.type === 'list' ? !Array.isArray(f.defaultValue) : typeof f.defaultValue !== 'string')
        )
          throw Error('The project contains an invalid field.');
        ids.add(f.id);
        const shape = valueShape(f, f.defaultValue);
        if (shape) throw Error(f.label + ': ' + shape);
        for (const t of f.targets)
          if (
            !Number.isInteger(t.start) ||
            !Number.isInteger(t.end) ||
            t.start < 0 ||
            t.end < t.start ||
            t.end > m.source.length ||
            !['content', 'attribute', 'element', 'css'].includes(t.kind)
          )
            throw Error('The project contains an invalid source mapping.');
      }
      const ranges = m.fields
        .filter((f) => f.enabled)
        .flatMap((f) => f.targets)
        .sort((a, b) => a.start - b.start);
      for (let i = 0; i < ranges.length; i++)
        for (let j = i + 1; j < ranges.length; j++) {
          const a = ranges[i],
            b = ranges[j];
          if (b.start < a.end && !(a.kind === 'element' && a.end >= b.end))
            throw Error('The project contains overlapping fields.');
        }
    }
    return project;
  }
  const api = {
    escape,
    slug,
    dynamic,
    parse,
    infer,
    manualField,
    render,
    inspect,
    validate,
    valueShape,
    validUrl,
    decode,
    cleanRich,
    normaliseColour,
    linkStyle,
    linkStyleCSS,
    richLinksAllowed,
    assertProject,
    sourceValue,
    preserveOriginal,
    sourceOffset,
    mappingTarget,
    fieldProblems,
    hiddenRanges,
    fieldActive,
    uniqueKey,
    templateField,
    repeatSelection,
    rebase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BlockCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
