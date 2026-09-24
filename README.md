# Jarrang SFMC Block Studio

This repository now uses **Block Studio** as the primary workflow for creating Salesforce Marketing Cloud custom blocks. Block Studio converts an approved email module into a client-friendly editor and exports static files ready for GitHub Pages and SFMC Content Builder.

## Start Here

Open [block-studio/Open-Block-Studio.html](block-studio/Open-Block-Studio.html) in a current desktop browser.

The studio runs locally in the browser. It does not need a server, npm install, authentication, or network access for conversion and export. Remote images in imported email modules still need a connection to render in preview.

## Typical Workflow

1. Use **Clients & templates** in Block Studio to choose or create the template you're editing.
2. Import a tested email module fragment, or open an existing module for edits.
3. Review the suggested editable text, image, alt-text, link, number, and colour fields.
4. Rename labels, add help text, set validation rules, and disable anything the client should not edit.
5. Try the generated editor at desktop and mobile widths.
6. Export the template package (or a single module ZIP) and merge the `docs/` and `projects/` output into this repository, preserving other files.
7. Commit and push. See [block-studio/TOWER-WORKFLOW.md](block-studio/TOWER-WORKFLOW.md) for the full branch-publishing workflow.
8. Save the `.jarrang.json` project file so future edits can reuse the exact mappings.

## Repository Layout

```text
block-studio/               Primary application for converting and exporting blocks
block-studio/src/           Studio parser, UI, exporter, and generated runtime source
block-studio/vendor/        Bundled third-party dependencies used by the studio/exporter
block-studio/tests/         Core and browser workflow tests for Block Studio
block-studio/scripts/       Node test-runner entry point (validate.cjs)
docs/                       Pre-built GitHub Pages site, at the repository root (Deploy from a branch → /docs)
projects/                   Editable .jarrang.json template projects, at the repository root
```

GitHub Pages' "Deploy from a branch" option only offers `/(root)` or `/docs` relative to the repository root, so `docs/` and `projects/` live here rather than inside `block-studio/`. `block-studio/build.py` writes its generated `docs/studio/index.html` and `docs/.nojekyll` to this repository root regardless of where it is run from.

Exported modules are created by Block Studio and committed from the downloaded ZIP. They are not generated from files in this repository.

## Commands

```bash
npm run build          # Rebuild Block Studio embedded assets and single-file app
npm test               # Run Block Studio core tests
```

For the full test suite (formatting checks, workspace, preview and browser-regression tests) run `npm test` and `npm run format:check` inside `block-studio/`, where its own `package.json` defines those scripts.

## More Detail

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) explains the current Block Studio setup and export model.
- [block-studio/README.md](block-studio/README.md) documents the application workflow and export model.
- [block-studio/TOWER-WORKFLOW.md](block-studio/TOWER-WORKFLOW.md) covers the single-repository, multiple-client Git/Tower publishing workflow.
- [block-studio/VALIDATION.md](block-studio/VALIDATION.md) records the automated and simulated validation already completed.
