/* Jarrang Block Studio - source-preserving conversion engine. */
(function (root) {
  'use strict';
  const R =
    root.BlockRuntimeCore || (typeof require === 'function' ? require('./runtime-core.js') : null);
  const {
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
  } = R;
  const slug = (value) =>
    String(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'module';
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
        style: 'switch',
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
      ...(type === 'toggle' ? { style: 'switch' } : {}),
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
