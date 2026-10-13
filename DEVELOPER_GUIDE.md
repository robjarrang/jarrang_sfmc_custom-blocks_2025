# Jarrang SFMC Block Studio - Developer Guide

## Current Direction

This repository now uses **Block Studio** as the way to create Salesforce Marketing Cloud custom blocks. New client-facing blocks are created by importing approved email module HTML into Block Studio and exporting static module packages.

Block Studio is a local, browser-based converter. It analyses a module fragment, suggests editable fields, lets a developer review and refine those fields, generates a client-friendly editor, and exports static files that can be committed directly to a GitHub Pages branch.

## Repository Structure

```text
block-studio/
  Open-Block-Studio.html    Self-contained application for day-to-day use
  index.html                Folder-based application entry during development
  build.py                  Rebuilds embedded assets, Open-Block-Studio.html and docs/studio/index.html
  package.json              Block Studio's own scripts (test, format, format:check, test:browser)
  README.md                 Studio workflow and scope
  TOWER-WORKFLOW.md         Single-repository, multiple-client Git/Tower publishing workflow
  CODE-REVIEW.md            Debt remediation notes and generated-file guidance
  VALIDATION.md             Completed validation and remaining live-test work
  src/
    app.js                  Studio interface, project workflow and previews
    runtime-core.js         Lean parser, rendering and validation shipped with every exported block
    core.js                 Authoring engine: source mappings and field inference (extends runtime-core.js)
    workspace.js            Clients/templates workspace, repository settings and project persistence
    repository.js           Folder handles, external-change checks and recoverable direct file writes
    preview.js              Configure/test preview bridge shared across steps
    tour.js                 Optional, read-only guided tours; excluded from exported runtimes
    quick-edit.js            Quick HTML fix workflow for existing modules
    repeat-builder.js        Repeatable content and conditional section builder
    code-editor.js / code-editor.css   Shared HTML code view (tag matching, folding, search)
    block-icons.js           Generated block icon/dragIcon assets
    exporter.js              ZIP export, icons and publishing guide generation
    export-assets.js         Generated export dependencies (runtime.bundle.js, runtime.rich.bundle.js, runtime.bundle.css, catalogue brand.css, SDK licence)
    runtime.js                Generated client editor runtime
    runtime.css               Generated client editor styles
    studio.css                 Studio interface styles
  tests/                     Core, workspace, preview, code-editor and browser workflow tests
  scripts/
    validate.cjs             Syntax, runtime budgets and automated non-browser test suites
  vendor/                    Bundled JSZip, Bootstrap Icons and Salesforce Block SDK assets

docs/                        Pre-built GitHub Pages site, at the repository root (Deploy from a branch → /docs)
projects/                    Editable .jarrang.json template projects, at the repository root
README.md                   Repository overview and command summary
package.json                Root Block Studio scripts only
```

GitHub Pages' "Deploy from a branch" option only offers `/(root)` or `/docs` relative to the repository root, so the publishing folder cannot live inside `block-studio/`. `build.py` writes `docs/studio/index.html` and `docs/.nojekyll` to the repository root regardless of where it is invoked from.

Exported module folders are downloaded from Block Studio and committed to the selected publishing branch. They are not maintained as source in this repository.

## Commands

The root npm scripts now target Block Studio by default:

```bash
npm run build
npm test
```

- `npm run build` runs `python3 block-studio/build.py`, rebuilding `block-studio/src/export-assets.js`, `block-studio/Open-Block-Studio.html` and `docs/studio/index.html` at the repository root.
- `npm test` runs `node block-studio/scripts/validate.cjs`, covering syntax, runtime payload budgets and the automated suite including ESC integration and DOM simulations.
- For the full suite (workspace, preview, code editor, browser regressions and formatting checks) run `npm test`, `npm run format:check` and `npm run test:browser` inside `block-studio/`, where its own `package.json` defines those scripts.

## Creating New Blocks

1. Open [block-studio/Open-Block-Studio.html](block-studio/Open-Block-Studio.html) in a current desktop browser.
2. Start a module and paste or upload an approved email module fragment.
3. Add master-template CSS under Template context if the browser preview needs it. This CSS is preview-only and is not inserted into the email output.
4. Select **Find editable content**.
5. Review every suggested field. Rename labels, add help text, set required fields and character limits, and delete any field the client should not edit. To let the client show or hide a whole section (for example a button), select its complete element in the HTML view and choose Add field from selection to create a show/hide toggle.
6. Use **Test** to test realistic long copy, blank optional fields, image URLs, links with tracking parameters and mobile viewport width.
7. Review export checks, set the stable folder name and semantic version, then download the module ZIP or project ZIP.
8. Commit the exported static files to the selected GitHub Pages branch and register each exported module endpoint in SFMC Content Builder.
9. Save the `.jarrang.json` project file. The mappings refer to exact source offsets and are needed for future maintenance.

## Export Model

Each exported module is independent and static. A typical export contains:

```text
[module-slug]/index.html
[module-slug]/icon.png
[module-slug]/dragIcon.png
shared-assets/block-studio-1.0.0/
index.html                  Preview catalogue for the exported package
PUBLISHING.md               Branch publishing and SFMC setup instructions
block-studio.jarrang.json   Saved project data
.nojekyll                   GitHub Pages compatibility marker
```

There is no npm install or build command for exported modules. Keep the exported shared runtime folder beside the module folders. Do not replace or remove older shared runtime versions while existing SFMC blocks may still depend on them.

### Caching and hosting

GitHub Pages serves HTTP/2 with gzip through a CDN, but its headers cannot be changed from this repository: every file gets `Cache-Control: max-age=600` plus an `ETag`, so a file is revalidated (a `304`) after ten minutes. The only levers available here are the ones already in place: the content-hashed `shared-assets/runtime-<hash>/` folder (every module in a template shares the same URLs, so the browser reuses them between blocks) and a minimal request count (one stylesheet and one script per module page, around 17-21 KB gzipped). Do not add per-module copies of the runtime. Changing cache headers needs a different host.

## What Block Studio Preserves

- Original source bytes when fields are unchanged.
- AMPscript and other detected personalisation, locked from ordinary editing.
- Outlook conditional markup and linked visible/VML destinations where detected.
- Existing default text, formatted inline content, image sources, alt text and destinations.
- Unrelated SFMC metadata on reopen.

Only changed fields are rendered back into the source. Text field line breaks become `<br>`. Edited formatted text is intentionally limited to approved inline formatting; unedited formatted defaults keep their original markup.

## Review Requirements

Block Studio speeds up conversion, but it does not replace developer review. Before client use:

- Confirm that all visible and fallback locations that should change together have been mapped correctly.
- Verify image URLs, link URLs, tracking parameters, AMPscript and inherited master-template CSS.
- Install in a controlled SFMC test account and test edit, close, reopen, duplicate, rapid close, tracking and subscriber preview behaviour.
- Test the final email in required clients, especially Outlook desktop, Apple Mail, Gmail web/mobile and mobile mail apps.
- Keep authorised sample content in defaults. GitHub Pages output may be publicly accessible.

## Known Limits

- Automatic discovery covers simple module fragments; complex modules still need careful review.
- Repeating lists, conditional sections, dropdowns and formatted-text lists are supported. Arbitrary JavaScript and automatic migration of existing SFMC field data are not supported.
- Full email documents and executable HTML are blocked from export.
- Image upload and hosting are not included; use externally hosted image URLs.
- Browser preview is not an Outlook/Gmail emulator.
- Existing SFMC instances reject a different module identity/version rather than silently migrating. For a new schema or design, export to a new folder and retain the old endpoint.

## Support References

- [README.md](README.md) - root project overview and command summary
- [block-studio/README.md](block-studio/README.md) - Studio user workflow and publishing model
- [block-studio/TOWER-WORKFLOW.md](block-studio/TOWER-WORKFLOW.md) - Git/Tower branch-publishing workflow for multiple clients and templates
- [block-studio/VALIDATION.md](block-studio/VALIDATION.md) - completed tests and remaining live validation
- Salesforce Block SDK documentation: https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/develop-block-widget.html
- GitHub Pages documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## ESC maintenance (1.18.0)

`src/maintenance.js` imports local repository folders, retains original PNG bytes and checks changes against each module's `published` field reference. `src/repository-projects.js` is generated by build.py from projects/ and is authoring-only. Fresh workspaces load the bundled templates; existing browser drafts require explicit replacement. Rebuild Studio after committed project changes if its bundled starting snapshot needs updating. Day-to-day maintainers can always load the current repository folder without rebuilding.

`iconAssets` stores base64 PNG bytes in editable project data. Neither it nor `published` is sent to the SFMC runtime definition. Existing pages and content-hashed runtime folders have been retained unchanged in this delivery. Export is explicit.

`core.templateProblems()` checks references in all conditional branches and repeating-item schemas, including branches not rendered by default. Published-field compatibility prevents same-endpoint exports that remove/change existing controls or tighten saved-value validation. For an incompatible change, duplicate the module and register its new endpoint. This check cannot predict semantic changes to arbitrary email markup; review the diff and test existing saved SFMC instances.

## ESC authoring support (1.19.0)

`src/template-rules.js` is authoring-only. It discovers existing if/elsif expressions with their list scope, provides a guided model and applies source patches through `core.rebase`. Field editor rule changes are transactional. Unsupported guided expressions remain editable through Advanced template logic. The rich-text field editor only records a link-style policy when it is explicitly changed, avoiding source rewrites on unchanged saves.

All 235 ESC conditions are covered by the guided model. Tests also open/save all 275 top-level fields and compare rendered output, exercise child-field guidance/limits, and convert all 11 list controls to a single item. This release does not alter the exported runtime or existing published module pages.

## Transactional maintenance (1.20.0)

`src/html-validation.js` is authoring-only. `core.htmlProblems(module)` checks tag balance in representative rendered states and common Outlook conditional projections. `core.parse` remains a lexical/source-mapping parser and is not a structural HTML validator. Run both syntax/reference and rendered-structure checks before export. Optional HTML end tags and opaque AMPscript are supported; arbitrary state combinations and email-client conformance still need review.

`src/field-transforms.js` stages key/type changes against a cloned module. It patches scoped template expressions through `core.rebase`, converts repeated-row values, and blocks rich-text conversion in attribute bindings. Save commits source and schema together; cancellation discards both.

`maintenance.recordExport` stores the actual exported definition and schema baseline independently of newer drafts. Repository import verifies pages against `exportedDefinition` when present. Preserve this metadata in editable project data; never pass it to the SFMC runtime. Duplicated modules clear both references. A downloaded export is not deployment confirmation.
