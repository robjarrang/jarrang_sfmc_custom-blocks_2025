# Jarrang SFMC Block Studio

This repository now uses **Block Studio** as the primary workflow for creating Salesforce Marketing Cloud custom blocks. Block Studio converts an approved email module into a client-friendly editor and exports static files ready for GitHub Pages and SFMC Content Builder.

## Start Here

Open [block-studio/Open-Block-Studio.html](block-studio/Open-Block-Studio.html) in a current desktop browser.

The studio runs locally in the browser. It does not need a server, npm install, authentication, or network access for conversion and export. Remote images in imported email modules still need a connection to render in preview.

## Typical Workflow

1. Pull the latest repository in Tower. Use **Open repository** and select the repository root. A fresh Studio workspace starts with the bundled ESC templates; existing browser drafts are kept until you confirm replacement.
2. Import a tested email module fragment, or open an existing module for edits.
3. Review the suggested editable text, image, alt-text, link, number, and colour fields.
4. Rename labels, add help text, set validation rules, and disable anything the client should not edit.
5. Try the generated editor at desktop and mobile widths.
6. Click **Save** for the current module or **Save template** for the complete template. Studio writes the generated blocks and editable project directly into the connected repository.
7. Commit and push. See [block-studio/TOWER-WORKFLOW.md](block-studio/TOWER-WORKFLOW.md) for the full branch-publishing workflow.
8. Save the `.jarrang.json` project file so future edits can reuse the exact mappings.

An AI coding agent can also do most of this without the browser UI — see [AGENTS.md](AGENTS.md).

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

See [ESC-MAINTENANCE.md](ESC-MAINTENANCE.md) for the ESC handover and [ESC-COMPATIBILITY.md](ESC-COMPATIBILITY.md) for the feature review.

## Commands

```bash
npm ci --prefix block-studio       # Pinned developer test dependencies only
npm run build          # Rebuild Block Studio embedded assets and single-file app
npm test               # Run all automated Block Studio tests
```

The automated suite includes DOM simulations and ESC integration checks. It does not run a live browser or SFMC. Formatting can be checked with `npm run format:check` inside `block-studio/`.

## More Detail

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) explains the current Block Studio setup and export model.
- [block-studio/README.md](block-studio/README.md) documents the application workflow and export model.
- [block-studio/TOWER-WORKFLOW.md](block-studio/TOWER-WORKFLOW.md) covers the single-repository, multiple-client Git/Tower publishing workflow.
- [block-studio/VALIDATION.md](block-studio/VALIDATION.md) records the automated and simulated validation already completed.
