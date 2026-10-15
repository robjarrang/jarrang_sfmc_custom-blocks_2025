# Jarrang Block Studio: technical documentation

For developers maintaining Studio, its generated SFMC editors and client module projects. Reviewed against Studio 1.28.0 on 14 October 2026. For day-to-day tasks, use the [internal user guide](USER_GUIDE.md).

## Contents

- [System boundaries](#system-boundaries)
- [Source and generated files](#source-and-generated-files)
- [Code ownership](#code-ownership)
- [Project and runtime data](#project-and-runtime-data)
- [Rendering and field rules](#rendering-and-field-rules)
- [Repository saving and recovery](#repository-saving-and-recovery)
- [Change and release procedures](#change-and-release-procedures)
- [Build and verification](#build-and-verification)
- [Troubleshooting and documentation maintenance](#troubleshooting-and-documentation-maintenance)

## System boundaries

Studio is a static browser application. It imports HTML fragments, maps editable values and writes static block editors plus editable project JSON. Each module remains a separate draggable SFMC block. There is no application backend, GitHub credential store or automatic commit/push.

The local repository holds the shared working files. Tower handles Git. GitHub Pages serves `docs/` from the configured branch, including the central Studio at `/studio/` and modules under `/clients/<client>/<template>/modules/<module>/`. A custom GitHub Actions workflow is not required; GitHub may still show its own Pages deployment workflow for branch publishing.

In SFMC, a module page uses the bundled Block SDK to read saved values and submit rendered HTML and editor metadata. Template conditions and loops run in that editor. AMPscript remains opaque source for SFMC to process. Studio neither executes subscriber personalisation nor supplies the master email's head CSS.

Updating Studio changes the authoring application. Existing module pages keep their referenced runtime until intentionally saved/exported again. Updating an endpoint does not automatically rewrite HTML already stored in an SFMC email instance.

## Source and generated files

| Path | Ownership and purpose |
| --- | --- |
| `projects/<client>/<template>.jarrang.json` | Editable source for a suite, including module drafts and last generated references. Open through Studio for routine changes. |
| `projects/<client>/<template>-PUBLISHING.md` | Generated deployment notes and endpoints. Wording comes from `exporter.js`; do not fix wording only in this output. |
| `block-studio/index.html`, `block-studio/src/` | Authoring/runtime source, except the generated files listed below. |
| `block-studio/build.py` | Standard-library Python build. Embeds assets and current project snapshots. |
| `block-studio/src/brand.css`, `runtime-brand.css` | Generated from `brand-theme.css` and bundled font assets. |
| `block-studio/src/export-assets.js` | Generated runtime bundles, licences and their content-hash identifier. |
| `block-studio/src/repository-projects.js` | Generated offline starting snapshot of `projects/`. Not a live Git synchronisation mechanism. |
| `block-studio/Open-Block-Studio.html`, `docs/studio/index.html` | Generated standalone and hosted applications. Build both; do not patch them by hand. |
| `docs/clients/<client>/<template>/modules/<module>/` | Generated `index.html`, `icon.png` and `dragIcon.png` for an endpoint. |
| `docs/clients/<client>/<template>/index.html` | Generated template catalogue. |
| `docs/shared-assets/runtime-<hash>/` | Immutable exported runtime assets. Preserve old directories for existing endpoints. |
| `block-studio/vendor/` | Bundled dependencies and licence material. Change deliberately and retain notices. |

`runtime.js`, `runtime.css`, `controls.js`, `controls.css` and `rich-editor.js` are maintained source, not generated files. `build.py` embeds their output in export assets; it does not regenerate existing module pages or populate a new hosted runtime folder by itself. Saving/exporting modules writes the required hashed runtime assets.

Keep editable JSON and generated pages together in the same reviewed commit. A project may include newer drafts for modules that have not been individually saved; compare each page against its `exportedDefinition`, not blindly against the latest authoring draft.

## Code ownership

All paths below are within `block-studio/src/`.

| Area | Main files |
| --- | --- |
| Application workflow and navigation | `app.js`, `workspace.js`, `tour.js` |
| Direct file access and save conflict handling | `repository.js` |
| Import, compatibility and generated baselines | `maintenance.js` |
| In-memory module undo/redo | `history.js` |
| Authoring parser, inference and source mappings | `core.js`, `html-validation.js` |
| Shared rendering and template language | `runtime-core.js`, `logic.js` |
| Field forms, conversion and rules | `field-editor.js`, `field-catalog.js`, `field-transforms.js`, `repeat-builder.js`, `template-rules.js` |
| Source editing and preview | `quick-edit.js`, `code-editor.js`, `code-editor.css`, `preview.js` |
| Client controls shared with Studio Test | `controls.js`, `controls.css`, `rich-editor.js` |
| SFMC SDK lifecycle | `runtime.js`, `runtime.css` |
| Definitions, packages, icons and publishing notes | `exporter.js`, `block-icons.js` |
| Studio styling and shared brand source | `studio.css`, `brand-theme.css` |

The standard runtime bundle contains the SDK, logic, runtime-core, controls and runtime. The rich variant adds rich-editor. Authoring inference, repository access, history, tours and code editing do not belong in SFMC runtime bundles. Keep changes in the narrowest existing component that owns the behaviour.

## Project and runtime data

The project format is `jarrang-block-studio`, version `1`. Its `settings` identify the client/template, base Pages URL and editor appearance; `modules` holds the editable module definitions. Use `core.js` project validation rather than accepting unvalidated JSON.

| Property | Contract |
| --- | --- |
| `settings.clientSlug`, `templateSlug` | Stable publishing folders. Lowercase hyphenated slugs; validate through the exporter. |
| `settings.editorTheme`, `showEditorHeader` | Template-wide form appearance. Header defaults on when absent; both bundled ESC templates set it off. |
| Module `id`, `slug`, `release` | Stable for compatible maintenance. Existing published identities are protected; duplicate for an incompatible new release. |
| `source`, `draftSource`, `templateMode` | Authored fragment/import draft and explicit template-language mode. Do not splice source with mapped fields without rebasing. |
| `fields` | Stable field IDs/types, defaults, validation, mapped targets or named keys, plus list item schemas. |
| `contextCss`, `width` | Preview context. Context CSS does not become email output. |
| `iconAssets` | Supplied base64 PNG pair. Preserve bytes when keeping supplied artwork. |
| `published` | Compatibility baseline from the last generated save/export. Not a live deployment flag. |
| `exportedDefinition` | Last generated definition, separate from newer authoring drafts. Used for import consistency and recovery. |

Top-level runtime values are stored by field ID; repeating item values use item keys. Labels can change without renaming those identities. Field types are `text`, `richtext`, `url`, `image`, `colour`, `number`, `toggle`, `select` and `list`. A dropdown has visible labels and inserted values; existing saved values depend on the latter.

The runtime preserves other SDK metadata and stores its own data under `studio`, including `schemaVersion`, `blockId`, `moduleId`, `moduleVersion` and `values`. It renders before saving, submits content and metadata through SDK callbacks and locks editing if a save cannot be confirmed. Test reopen and failure paths, not just initial defaults.

## Rendering and field rules

### Mapped source

Fields can replace element content, attribute values or complete elements. Targets refer to source offsets. Overlapping targets are invalid except supported containing section toggles. Preserve Outlook conditional comments, line endings and AMPscript bytes outside intentional edits.

For a scripted source correction, use `BlockCore.rebase(module, edits)` with `{ start, end, value }` edits and validate the result. Direct string replacement followed by retaining old target offsets can silently connect fields to the wrong code. The UI's quick-edit path adds protection for mapped values, template expressions and AMPscript.

Unchanged mapped values generally retain their source bytes. Changed plain text is escaped; store actual punctuation, not pre-escaped entity strings. Formatted content is sanitised and configured link styling may normalise its original markup too.

### Template logic

Use [TEMPLATE-SYNTAX.md](TEMPLATE-SYNTAX.md) as the language reference. The implementation is a defined Liquid-style subset, not Liquid or JavaScript. It supports conditions, repeated items and scoped loop properties, with `escape` and `richtext` output filters. No raw HTML filter is provided.

Template mode is explicit. Applying advanced template code can rebuild mapped fields; named controls survive and referenced mappings can be promoted to named controls. Review resulting connections and defaults. Automatic single/repeating conversion has narrower supported structures than the renderer. A blocked conversion is not evidence that the underlying template language lacks the feature.

### Rich text and URLs

The shared rich editor supports inline emphasis, superscript/subscript, colour spans, links and semantic lists. The sanitiser restricts markup/styles and validates destinations; toolbar visibility is a UI policy, not a substitute for sanitisation. Disabling a tool does not retroactively remove all matching markup. Link appearance is enforced from the field definition, including repeated fields, rather than saved as a client-editable style option.

Lists inside paragraph fields are rendered as valid sibling lists with inherited text styling. Lists inside headings or links need restrictions. Client-specific list spacing and master-template CSS remain separate from the block editor.

### Link options

`allowLinkTitle` and `allowTrackingAlias` expose optional text inputs. `defaultLinkTitle` and `defaultTrackingAlias` provide starting values. URL values remain strings; `values.__studioLinkOptions` stores `{title, alias}` strings by field ID, with an equivalent map keyed by item key in each repeated row. Empty strings explicitly remove attributes. Missing legacy metadata uses configured defaults, or preserves authored attributes when no default exists. Mounted controls snapshot their resolved defaults. Validate the map with `linkOptionsData`; its key is reserved for metadata.

The existing anchor-range renderer also patches `title` and `alias`. It escapes changed values, preserves unchanged source bytes and refuses competing attribute mappings/template expressions through `conversionProblems`. Complete href mappings and loop aliases follow the same rules as conversion tracking. `cleanRich` retains safe Title/Alias strings while removing unsupported attributes and enforcing developer link styles. Rich-text defaults apply only to newly inserted links; existing link attributes are reopened as saved. Permissions hide the inputs without stripping authored attributes.

Use an optional static alias to distinguish links in SFMC reporting. See [Salesforce link aliases](https://developer.salesforce.com/docs/marketing/marketing-cloud-ampscript/guide/mc-ampscript-guide-language-basics-dynamic-link-aliases.html). Title is advisory hover text, not a replacement for clear visible link text or image alt text. Check actual aliases in a real SFMC send/report before signing off tracking.

### Conversion tracking

`allowConversionTracking` exposes the client checkbox on a URL or rich-text field. `defaultConversionTracking` sets the initial choice; the ESC suite sets it false. URL values remain strings. Per-link booleans are stored in the reserved `values.__studioConversions` map, keyed by field ID; repeating rows carry their own map keyed by item key. Missing legacy choices use the field's default, and mounted controls record the resolved choice for subsequent saves. Invalid tracking metadata is rejected.

The renderer patches only anchor attributes using existing source offsets. Mapped hrefs and complete `{{ key }}` or `{{ item.key }}` href references are supported, including the escape filter. Loop patches evaluate within the current item scope. No additional template syntax, new field IDs, DOM email serialisation or AMPscript rewrite is introduced. `conversionProblems` blocks partial href connections and a competing dynamic conversion expression. Rich-text link dialogues store the attribute in their sanitised HTML; the sanitiser accepts only the literal `conversion="true"` on permitted web links.

The runtime saves these choices through the existing SDK value snapshot and preserves unrelated SDK metadata. A checkbox alone does not implement website-side conversion capture. Salesforce's [conversion tracking guidance](https://help.salesforce.com/s/articleView?id=005093107&language=en_US&type=1) specifies the email attribute, link parameters and website reporting dependency. Verify these in a real SFMC send, click and conversion before declaring the complete tracking journey passed.

### Icons and themes

Use the exporter to build both icon files. Generated icons are 60×60 and 120×120 respectively; these are Studio defaults, not dimensions mandated by the cited Salesforce widget guidance. Existing supplied PNGs, including differently sized ESC artwork, remain byte-identical when retained.

Apply template appearance through `BlockExport.themedModule(project, module)` before generating a definition/page. Respect `showEditorHeader`; copying a previous page wrapper can reintroduce unwanted branding. Theme contrast validation blocks unsuitable combinations. Editor colours do not style the email.

## Repository saving and recovery

`repository.js` uses the browser File System Access API. Direct saving needs supported folder access. A remembered handle may need permission again; ZIP export remains the fallback.

Save prepares and validates the output before writing. It compares relevant files with the opened repository snapshot, checks allowed paths, refuses replacement of a differing existing runtime asset, skips identical bytes and verifies writes. Failure triggers best-effort rollback and a save lock until reopening. This is not an atomic multi-file transaction: a crash, permission loss or conflicting external write can prevent complete restoration. Inspect the Tower diff before retrying.

A module Save writes its generated page/icons, the whole editable project and supporting files. In direct repository mode the catalogue includes this saved module and the other modules' last generated definitions. A full-template Save regenerates every module. A single-module fallback ZIP does not refresh the complete catalogue; use a full-template ZIP for that purpose.

Browser drafts, pending code, temporary Test values, local saved files and deployed files are distinct states. Pending code must be resolved before saving and does not survive reload. Test values are excluded from authoring output. Undo/redo is in memory; last-export restoration uses the stored generated baseline and is not a deployment rollback. Neither mechanism replaces Git history.

## Change and release procedures

### Maintain a compatible module

1. Pull and open the repository in Studio. Resolve any project/page mismatch before editing.
2. Make the smallest change through fields or HTML & CSS. Preserve module identity, field IDs/types, item keys, folder and release.
3. Test the affected branches and existing saved-value cases, then save the module.
4. Review the project/page/icons together in Tower. Keep unrelated modules and historical runtimes intact.
5. Commit/push, verify the hosted endpoint, then test a new and existing SFMC instance. Check email output in its real master template.

Compatibility checks in `maintenance.js` reject missing/retyped controls, removed dropdown values and restrictions that invalidate prior values. Do not clear `published` or `exportedDefinition` to bypass them. Duplicate the module, assign a new folder/release and register a separate block for incompatible changes. Retain the old endpoint for existing content.

### Change Studio or its runtime

1. Edit source files. Add a focused regression for behavioural fixes, especially source offsets, SDK state and repository writes.
2. Build and run the checks below. Review generated changes rather than hand-editing them.
3. If runtime behaviour changed, deliberately save/export the affected modules so they reference the new content-hash folder. Keep every earlier runtime folder unchanged. A Studio-only change need not regenerate client pages.
4. If project JSON changed, rebuild Studio to refresh its bundled starting snapshot. The snapshot must not overwrite existing browser drafts automatically.
5. Commit source, relevant generated files and documentation together. Use Tower and branch-based Pages publishing.

For programmatic generation, read [AGENTS.md](../../AGENTS.md) and reuse exporter/maintenance functions in a DOM-capable harness. Do not copy wrappers by hand or approximate exporter safety checks. Rich-text sanitisation needs a DOM; generated PNGs need a real canvas implementation or preserved supplied PNGs.

### Roll back

Revert the relevant commit in Tower, restoring matching project, pages and icons together, then push. Retain runtime directories that any surviving endpoint references. Reopen Studio's repository after the revert to avoid saving a newer browser draft back over it. Existing email-instance content requires separate SFMC review.

## Build and verification

From the repository root, with Python 3 and Node/npm installed:

```sh
npm ci --prefix block-studio
npm run build
npm test
npm run format:check --prefix block-studio
```

Use a supported Node version meeting dependency requirements; the existing validation environment uses Node 24. `npm ci` uses the checked-in lockfile. No npm install or build is required for normal use of the supplied prebuilt Studio or hosted blocks.

`npm test` checks JavaScript syntax, runtime size budgets and non-browser test suites, including Happy DOM/SDK simulations. `npm run check:size --prefix block-studio` reports payload budgets separately. These are project guardrails, not proof of browser speed or email compatibility.

`npm run test:browser --prefix block-studio` is a separate Playwright suite. It requires an available Playwright installation and browser; these are not provided by the project's declared development dependencies. The runner accepts `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` overrides. Do not report that suite as passing unless actually run. Older excluded browser suites are retained as historical test code, not current release evidence.

| Change | Verification needed |
| --- | --- |
| Documentation only | Check links, actual UI labels, commands and generated-document consistency. No app regression run is needed solely for prose. |
| UI or shared control behaviour | Build, automated checks, focused interaction regression and real-browser verification of the affected behaviour when available. |
| Renderer/field logic or module source | Automated output/round-trip checks, saved-value cases, and SFMC plus relevant email-client checks. |
| Repository save/export | Conflict, partial-write and rollback tests; inspect affected files and reopen the generated repository. |

Before production use, the human release owner must check SFMC new/edit/close/reopen/duplicate behaviour, tracking/personalisation and test sends. DOM simulations cannot certify accessibility, browser layout, Outlook, Apple Mail or dark mode. Record the tested environment, results and known gaps in the release commit or pull request. Keep outstanding checks with the release, rather than accumulating duplicate review documents.

## Troubleshooting and documentation maintenance

For user-facing symptoms, see the [user guide's troubleshooting table](USER_GUIDE.md#resolve-a-problem). For a JSON/page mismatch, compare the exported snapshot, embedded `block-definition` and template appearance. For stale code, check the module's referenced hash and deployed files; rebuilding Studio alone will not change that reference.

Keep two main entry points: USER_GUIDE for tasks and this file for implementation. Template syntax remains a focused reference; ESC-specific documentation lives under `documentation/clients/esc/`; installable AMPscript and template examples live under `integrations/esc/`. Hosting, branding and verification guidance are maintained here. Keep completed review narratives in release history rather than adding more repository documents. Update a control's documentation in the same change as its label or behaviour, and update the publishing-note generator when changing deployment instructions. Prefer stable responsibilities over hard-coded test totals and byte counts.

This separation follows [Diátaxis](https://diataxis.fr/start-here/): task instructions should be easy to follow without requiring implementation reference. It is a documentation design approach, not a claim of completed usability testing.

Primary platform references, reviewed 13 October 2026:

- [GitHub: configure the Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Salesforce: develop a custom block widget](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/develop-block-widget.html)

Keep credentials and subscriber data out of module defaults and examples. The Pages output contains default content and definitions; `projects/` is outside the published Pages folder but remains visible to anyone with repository access, including the public when the repository is public.

## Settings-only blocks (1.28.0)

A module can opt into `settingsOnly: true` under **Module settings → Output options**. Ordinary modules keep their existing source-preserving rendering. Settings-only modules accept one AMPscript block containing assignments of this exact form:

```ampscript
%%[
SET @BrandKey = "{{ BrandKey }}"
SET @FooterLogoMode = "{{ FooterLogoMode }}"
]%%
```

Each variable/placeholder must match one enabled named dropdown's `key`. The fields use the existing `select` type and template binding; field IDs remain the SDK value identifiers. Every option value is restricted to 1-80 ASCII letters, numbers, underscores or hyphens. Every submitted value must match a configured option. Other statements, free text, duplicate keys, disabled/missing fields and visible HTML are rejected. This restricted format deliberately does not interpolate arbitrary text into AMPscript or relax the normal template parser's protection of AMPscript.

`runtime-core.js` validates and renders the assignments. `settingsSummary` builds an escaped label/value card from the rendered assignments. The runtime sends the assignments through `setContent`, retains choices through `setData`, and sends the card separately through `setSuperContent`; Studio and standalone previews use the same card. The summary never becomes email output. SFMC acceptance, editor-only display and absence of wrapper spacing need a live check.

The mode is included in exported definitions, repository consistency checks, undo state and publishing baselines. Changing the mode on an already published module requires a duplicate endpoint. Edit existing dropdown labels, choices and defaults through the normal field editor. Developer source edits must retain the restricted assignment form; this mode does not support arbitrary Liquid branches or repeaters.

The shared ESC settings suite is documented in [ESC email settings integration](../../integrations/esc/email-settings/README.md). Its runtime adds approximately 2.8 KB of source without another dependency or request. The existing 40 module endpoints retain their previous runtime.

## Repository setup with Tower

## One-time setup

1. Put the supplied package in the team's local Git repository. If updating an existing checkout, merge files into their matching paths; retain other client folders and old runtime assets.
2. Review, commit and push in Tower to the intended publishing branch.
3. On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, the intended branch and **/docs**, then save. The package is prebuilt; no custom Actions workflow is needed.
4. After deployment, open the Pages site followed by `/studio/`.
5. In Studio, open **Clients & templates → Manage templates → Repository settings** and enter the Pages site URL including its repository path, for example `https://your-team.github.io/custom-blocks/`. Do not append `/docs` or `/studio`.
6. Choose **Open repository** and select the local repository root containing `docs/`, `projects/` and `block-studio/`. Grant access and load the intended template.

**Result:** Studio reads and saves files in the same checkout Tower uses. Each module's **Module settings → Copy module URL** provides its endpoint.

GitHub may show an automatically managed Pages deployment in Actions even with branch publishing. That does not require changing this setup to a custom Actions workflow. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Normal publishing

Pull in Tower, open/reload the repository in Studio, edit and test, then **Save** or **Save template**. Review, commit and push in Tower. Check deployment, the hosted endpoint and SFMC before client use. Register an endpoint only for a new block; compatible updates keep the existing endpoint.

A save is local, not a commit or deployment. Browser drafts do not synchronise between colleagues. Coordinate work on the same template and reload after pulls. Studio checks for external changes rather than overwriting them.

## ZIP fallback

If folder writing is unavailable, use **Clients & templates → Manage templates → Download template ZIP** or **Download current module ZIP**. Extract outside the checkout and merge changed files into matching paths. Do not replace whole `docs/` or `projects/` folders in Finder. Use a template ZIP to refresh the complete catalogue.

## Updating or rolling back Studio

Follow the [technical release procedure](DEVELOPER_GUIDE.md#change-and-release-procedures). Keep editable projects, all required module paths and older runtime folders. Rebuild after changing source or bundled project snapshots. Re-saving modules intentionally adopts the current runtime; updating the central Studio by itself does not.

For a rollback, revert the relevant commit in Tower, push, then reopen the repository in Studio. Restore matching editable and generated files together. An endpoint move is not automatic migration: retain the previous URL while it is used in SFMC.

## Brand assets and styling

## Studio identity

The Jarrang styling follows the website reviewed on 16 September 2026:

- Navy `#080043`, aqua `#59DBCA` and pale blue-grey `#EFF2FA`.
- Neue Montreal regular (400) and medium (500) in Studio.
- Rounded panels, pill-shaped primary actions and the Jarrang wordmark.

`block-studio/src/brand-theme.css` is the maintained shared theme source. `block-studio/build.py` generates `block-studio/src/brand.css` with bundled WOFF2 fonts for Studio/catalogues. It separately generates `block-studio/src/runtime-brand.css` with the rules used by exported forms and system fonts, avoiding those embedded fonts in each SFMC runtime bundle. Do not edit either generated file directly.

## Client editor appearance

Template-level `editorTheme` controls the block form palette. `showEditorHeader` controls the Jarrang header and defaults on when absent. Both ESC templates disable it. Apply these settings through the exporter's theme/definition functions; do not hard-code branding by copying page wrappers. These settings do not alter the email's design or the wider SFMC application.

## Assets and licensing

The wordmark and Neue Montreal files were obtained from Jarrang's site for this internal tool. Font source filenames were `PPNeueMontreal-Regular.5e0546b4.woff2` and `PPNeueMontreal-Medium.8cc8aa34.woff2` under `https://www.jarrang.com/css/`. They are Jarrang brand assets, not covered by the SDK or Bootstrap Icons licences. Retain the supplied licence notices and confirm rights before repurposing brand assets elsewhere.

Generated module icons use the bundled Bootstrap Icons symbols and a chosen background, with a contrasting foreground. Existing supplied PNG pairs can be retained unchanged. Rebuild after changing source assets; deliberately save/export affected modules to adopt changed runtime styling. Assets use `docs/shared-assets/runtime-<hash>/`; never replace an old hash directory with different content.

## Maintenance principles and verification record

Keep authoring code out of the exported runtime, include the rich-text bundle only where needed, and measure performance before introducing new dependencies or abstractions. Keep generated files reproducible from their maintained source. Runtime payload budgets are enforced by the test runner; changes to those budgets need a reason. Browser draft writes remain synchronous and multi-file repository saves are not atomic. These are deliberate limitations, not guarantees of unlimited workspace scale or crash recovery.

Prioritise defects by data loss or incorrect saved output, then blocked tasks, then visual polish. Reproduce the fault, make a focused correction, and retain a regression for the observable behaviour. Include failure paths, saved-value compatibility, source offsets and partial-write recovery where relevant.

On 15 October 2026, the automated suite passed 263 tests before this documentation-only cleanup. That run covers the current 31 brand choices, SDK save/reopen simulation, module definitions/icons, rendering and repository safeguards. This cleanup changes no application, project, generated editor or runtime bytes. It does not add live-browser, SFMC or email-client verification.

For an independent comparison against a supplied ESC repository, retain the original ZIP outside the working repository and run:

```sh
node block-studio/scripts/verify-esc.cjs /path/to/original-repository.zip /path/to/results
```

The comparison uses the original runtime, checks rendered output and field-editor round trips, and records the baseline fingerprint. Historical 1.20.1/1.24.1 audits covered 40 modules and 6,728 cases; those results do not certify later changes. Run the comparison again for the release being assessed. Keep generated reports and comparison ZIPs outside the source tree.

Before release, check the affected workflows in a real browser, including keyboard/zoom, rich-text selection, folder permissions and conflicting edits. In SFMC check new and saved instances, close/reopen, duplication, tracking, subscriber preview and test sends. Check affected mobile, Outlook and dark-mode layouts in the approved master template. The internal ESC handover records the specific outstanding checks.
