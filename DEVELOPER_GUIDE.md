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
    core.js                 Parser, source mappings, rendering and validation
    workspace.js            Clients/templates workspace, repository settings and project persistence
    preview.js              Configure/test preview bridge shared across steps
    quick-edit.js            Quick HTML fix workflow for existing modules
    repeat-builder.js        Repeatable content and conditional section builder
    code-editor.js / code-editor.css   Shared HTML code view (tag matching, folding, search)
    block-icons.js           Generated block icon/dragIcon assets
    exporter.js              ZIP export, icons and publishing guide generation
    export-assets.js         Generated export dependency bundle
    runtime.js                Generated client editor runtime
    runtime.css               Generated client editor styles
    studio.css                 Studio interface styles
  tests/                     Core, workspace, preview, code-editor and browser workflow tests
  scripts/
    validate.cjs             Node test-runner entry point (npm test), runs every tests/*.cjs suite
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
- `npm test` runs `node block-studio/tests/core.test.cjs`, a subset covering source preservation and validation.
- For the full suite (workspace, preview, code editor, browser regressions and formatting checks) run `npm test`, `npm run format:check` and `npm run test:browser` inside `block-studio/`, where its own `package.json` defines those scripts.

## Creating New Blocks

1. Open [block-studio/Open-Block-Studio.html](block-studio/Open-Block-Studio.html) in a current desktop browser.
2. Start a module and paste or upload an approved email module fragment.
3. Add master-template CSS under Template context if the browser preview needs it. This CSS is preview-only and is not inserted into the email output.
4. Select **Find editable content**.
5. Review every suggested field. Rename labels, add help text, set required fields and character limits, and delete any field the client should not edit. To let the client show or hide a whole section (for example a button), select its complete element in the HTML view and choose Add field from selection to create a show/hide toggle.
6. Use **Try the editor** to test realistic long copy, blank optional fields, image URLs, links with tracking parameters and mobile viewport width.
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
- Repeaters, conditional section controls, automatic interactive-module conversion and mapping migrations are not included in this first version.
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
