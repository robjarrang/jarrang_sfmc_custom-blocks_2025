# Agent guide: building and publishing blocks without the browser UI

Block Studio is normally driven through its browser UI (`block-studio/Open-Block-Studio.html`). That UI is just a thin
layer over pure functions in `block-studio/src/core.js`, which is also a plain CommonJS module
(`module.exports = api` at the bottom, and it self-requires `./logic.js`). This means an agent can infer fields,
validate a module and render its output entirely in Node, then hand-write the same files the UI's ZIP export would
produce, directly into `docs/` and `projects/` at the repository root. No browser, Playwright or JSZip is required for
this path (the one exception is real icon PNGs — see "Icons" below).

Read [README.md](README.md) and [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) first for the repository layout. This guide
only covers producing new/updated block content headlessly.

## Non-negotiable rules

- **Never overwrite an existing `docs/shared-assets/runtime-<hash>/` folder, an existing module's
  `docs/clients/<client>/<template>/modules/<module>/` folder, or an existing `projects/<client>/<template>.jarrang.json`
  with different content that changes its meaning.** Registered SFMC blocks depend on those exact URLs staying byte-stable.
  Only add new folders/files, or intentionally replace a template's own catalogue/module when re-exporting the same
  template (matching what "Export template" already does).
- Client and template slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length ≤ 80.
- A module's `source` must be an HTML **fragment** — never `<!doctype`, `<html`, or `<body`, and never contain
  `<script>`, `<iframe>`, `<object>`, `<embed>` or an `on*=` handler attribute.
- Field target ranges must never overlap (except an `element`-kind toggle target may fully contain other targets).
- Keep any existing AMPscript (`%%...%%`) byte-identical; it is opaque personalisation for SFMC, not something to rewrite.

## Data model

A `.jarrang.json` project file (also the shape stored under `modules` in a workspace file) is:

```json
{
  "format": "jarrang-block-studio",
  "version": 1,
  "settings": {
    "name": "Newsletter",
    "clientName": "ESC",
    "clientSlug": "esc",
    "templateSlug": "newsletter",
    "baseUrl": "https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/",
    "location": "docs"
  },
  "modules": [ /* module objects, see below */ ]
}
```

A **module**:

```js
{
  id: "uuid-or-any-unique-string",
  name: "Hero Story",
  slug: "hero-story",            // ^[a-z0-9]+(?:-[a-z0-9]+)*$, unique within the template, not "docs"/"shared-assets"/"src"/"vendor"
  release: "1.0.0",              // must match \d+\.\d+\.\d+ — bump this and use a new slug for breaking field-schema changes
  source: "<table>...</table>",  // the exact HTML fragment, byte-preserved outside edited target ranges
  draftSource: "<table>...</table>", // keep equal to source once finished editing
  templateMode: false,           // true only if you used {{ }} / {% %} template syntax (see "Advanced" below)
  contextCss: "",                // preview-only CSS, never exported into email HTML
  width: 600,
  fields: [ /* field objects */ ],
  analysed: true,
  reviewed: true,
  acknowledged: true,            // "source dependencies reviewed" — set true once you've read core.js's inspect() warnings
  iconColour: "#080043",
  iconSymbol: "grid"              // one of block-icons.js's ids: image, fonts, list-ul, grid, play-btn, ... (see that file)
}
```

A **field** (common shape; `type` drives which extra keys apply):

```js
{
  id: "field1",                  // "field" + N convention for source-mapped fields; template controls use "control_<rand>"
  key: undefined,                // only for binding:'template' fields — the identifier used in {{ }} / {% %}
  label: "Headline",
  type: "text",                  // text | richtext | url | image | colour | number | toggle | select | list
  defaultValue: "Hero headline goes here", // string for scalar types, array of row objects for type:'list'
  originalValue: "Hero headline goes here", // same as defaultValue at creation time
  enabled: true,
  required: false,
  maxLength: 80,                 // 0 = no limit
  help: "Main hero headline.",
  targets: [ /* one or more target objects, or [] for an unused/only-template-referenced control */ ],
  allowLinks: true               // richtext only: false if the field is already inside a link/button
}
```

A **target** (where a field's value is written back into `source`):

```js
// content: replaces text between start/end
{ start: 2142, end: 2175, nodeId: "n13", kind: "content" }
// attribute: replaces an attribute's value only (never the quotes/name)
{ name: "href", start: 873, end: 898, value: "https://...", quoted: true, nodeId: "n7", kind: "attribute" }
// element: a whole tag, used by toggle (show/hide) fields
{ start, end, nodeId: "n7", kind: "element" }
```

`select` fields also have `options: [{ label, value }]`. `list` fields have `itemFields: [...]` (same field shape as
above, each with a required `key`), `minItems`, `maxItems`, and `defaultValue` as an array of `{ [itemField.key]: value }`
rows.

## Recipe: add a module headlessly

1. **Pick/confirm slugs.** Client slug + template slug decide the published path
   `clients/<clientSlug>/<templateSlug>/modules/<moduleSlug>/`. Reuse an existing template's slugs to add a module to
   it, or invent new ones for a new client/template — check they don't already exist under `docs/clients/` or
   `projects/`.

2. **Load or create the project JSON.** If `projects/<clientSlug>/<templateSlug>.jarrang.json` exists, read and extend
   it. Otherwise create a new one matching the shape above.

3. **Infer fields from the source HTML fragment**, in Node:

   ```js
   const C = require('./block-studio/src/core.js');
   const fs = require('fs');
   const source = fs.readFileSync('module.html', 'utf8');
   const { fields, issues } = C.infer(source);
   console.log(JSON.stringify(fields, null, 2), issues);
   ```

   `infer()` finds image `src`/`alt`, link `href` (and its hidden Outlook fallback counterpart with the same href),
   and simple/formatted text in common tags. It does **not** find colours, numbers, dropdowns or show/hide sections —
   add those with `C.manualField(source, start, end, existingFields)`, giving it the exact character offsets of the
   value (attribute value without quotes, or a whole element's start/end for a toggle).

4. **Adjust fields**: rename labels, set `help`, `required`, `maxLength`, disable (`enabled: false`) anything the
   client shouldn't edit. Renumber `id`s as `field1`, `field2`, ... in insertion order (not required, but matches the
   UI's convention and keeps things predictable).

5. **Advanced (optional): repeating items and named template controls.** These are also plain `core.js` functions, safe
   to call from Node — but they rewrite `module.source` and must go through `C.rebase()` so every other field's target
   offsets shift correctly. Prefer the simplest approach that works:
   - `C.repeatSelection(module, start, end)` converts one existing repeated element (e.g. one `<li>`) into a
     `{% for item in ... %}` loop and returns the new `list` field. It throws a clear error message if the selection
     isn't safe to convert (spans a toggle, references AMPscript blocks, etc.) — read the thrown message, don't retry
     blindly.
   - `C.templateField(module, type, label)` creates a standalone named control (toggle/colour/number/select/list) not
     yet wired to any source. You must then insert its `{{ key }}` / `{% if key == ... %}` reference into `source`
     yourself via `C.rebase(module, [{ start, end, value }])` — never splice `module.source` directly once any field
     has `targets`, or their offsets will silently go stale.
   - If a case looks structurally tricky (nested loops, multiple conditions sharing one toggle, mixed AMPscript and
     template logic), it's safer to do it once by hand in the browser UI and treat the resulting `.jarrang.json` as
     the reference to extend, rather than guessing at the template syntax. See
     [block-studio/TEMPLATE-SYNTAX.md](block-studio/TEMPLATE-SYNTAX.md).

6. **Validate before writing anything**, still in Node:

   ```js
   const C = require('./block-studio/src/core.js');
   C.assertProject(project);                 // throws on structural/shape errors
   for (const m of project.modules)
     for (const f of m.fields) {
       const errors = C.fieldProblems(f);
       if (errors.length) throw new Error(f.label + ': ' + errors.join(' '));
     }
   for (const m of project.modules) C.render(m); // throws if any target/template reference is broken
   ```

   Also self-check the rules `exporter.js`'s `problems()` enforces (that function needs a browser DOM/canvas, so
   replicate its checks manually): slug regex and not `docs`/`shared-assets`/`src`/`vendor`; release matches
   `\d+\.\d+\.\d+`; no executable HTML; `source` is a fragment, not a full document; and
   `C.parse(m.source).issues` is empty. Read `C.inspect(m)` for non-blocking warnings (AMPscript present, Outlook
   markup, interactive content, missing `contextCss` for class-based styling) and mention any relevant ones to the user.

7. **Write the exported files.** Study a real existing module as the exact template, e.g.
   [docs/clients/esc/newsletter/modules/hero-story/index.html](docs/clients/esc/newsletter/modules/hero-story/index.html):
   - Copy that file's `<head>`/wordmark/`<body>` wrapper verbatim, only changing `<title>`, the `<script id="block-definition">`
     JSON payload (produce it as `JSON.stringify(definition)` HTML-escaping `<` the same way `exporter.js`'s `safeJSON`
     does: escape `<`, U+2028 and U+2029), and the relative asset path depth (`../../../../../shared-assets/...` — count
     `/` segments back to the repo's `docs/` folder from the module's own folder).
   - `definition` written into that script tag is `{ id, name, slug, release, source, templateMode, contextCss, fields,
     editorTheme }` (omit `editorTheme` unless the project set one).
   - Reuse the **existing** `docs/shared-assets/runtime-<hash>/` folder unchanged if you haven't modified
     `block-studio/src/{core,logic,rich-editor,controls,runtime}.js` — check its current name under `docs/shared-assets/`.
     Only run `npm run build` and add a *new* hash folder (never delete the old one) if that source actually changed.
   - Write the template catalogue `docs/clients/<clientSlug>/<templateSlug>/index.html` (list of modules with links and
     endpoint URLs) — copy the format from
     [docs/clients/esc/newsletter/index.html](docs/clients/esc/newsletter/index.html), listing every module currently
     in the template (not just the one you added).
   - Write `projects/<clientSlug>/<templateSlug>.jarrang.json` (the full project, `settings.location: "docs"`) and
     `projects/<clientSlug>/<templateSlug>-PUBLISHING.md` (copy the structure/wording from an existing
     `*-PUBLISHING.md`, with this template's real module endpoints:
     `<baseUrl>/clients/<clientSlug>/<templateSlug>/modules/<moduleSlug>/`).

8. **Icons.** `icon.png` (60×60) and `dragIcon.png` (120×120) are generated with the 2D Canvas API
   (`block-studio/src/exporter.js`'s `icon()` and `block-studio/src/block-icons.js`), which plain Node doesn't have. If
   you can't render real ones (no canvas library available), copy an existing module's `icon.png`/`dragIcon.png` as a
   placeholder and tell the user which module needs a real icon generated later by opening it once in Block Studio's
   UI and re-exporting.

9. **Verify and report back.** Run `cd block-studio && npm test` if you touched any `src/` file; otherwise no build
   step is needed for new block content. Tell the user which files were added (never touched), the module endpoint
   URL(s) to register in SFMC, and that new blocks still need the usual SFMC install/edit/close/reopen check from
   [block-studio/VALIDATION.md](block-studio/VALIDATION.md) — headless generation cannot verify real browser/SFMC behaviour.

## Definition of done checklist

- [ ] Slugs are valid, unique, and don't collide with existing folders.
- [ ] `C.assertProject(project)` and `C.render(module)` succeed for every module.
- [ ] Every field passes `C.fieldProblems(field)` with no errors.
- [ ] No existing `docs/` or `projects/` file was overwritten with different content unless intentionally
      re-exporting that exact template.
- [ ] `icon.png`/`dragIcon.png` exist (real or a flagged placeholder) at the right sizes.
- [ ] The template catalogue `index.html` lists every module in the template, not just the new one.
- [ ] `projects/<client>/<template>.jarrang.json` matches exactly what was published to `docs/`.
