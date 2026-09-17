# Jarrang SFMC Block Studio

This repository now uses **Block Studio** as the primary workflow for creating Salesforce Marketing Cloud custom blocks. Block Studio converts an approved email module into a client-friendly editor and exports static files ready for GitHub Pages and SFMC Content Builder.

## Start Here

Open [block-studio/Open-Block-Studio.html](block-studio/Open-Block-Studio.html) in a current desktop browser.

The studio runs locally in the browser. It does not need a server, npm install, authentication, or network access for conversion and export. Remote images in imported email modules still need a connection to render in preview.

## Typical Workflow

1. Import a tested email module fragment into Block Studio.
2. Review the suggested editable text, image, alt-text, link, number, and colour fields.
3. Rename labels, add help text, set validation rules, and disable anything the client should not edit.
4. Try the generated editor at desktop and mobile widths.
5. Export the module ZIP or project ZIP.
6. Commit the exported files to the selected GitHub Pages branch and register each module endpoint in SFMC.
7. Save the `.jarrang.json` project file so future edits can reuse the exact mappings.

## Repository Layout

```text
block-studio/               Primary application for converting and exporting blocks
block-studio/src/           Studio parser, UI, exporter, and generated runtime source
block-studio/vendor/        Bundled third-party dependencies used by the studio/exporter
block-studio/tests/         Core and browser workflow tests for Block Studio
```

Exported modules are created by Block Studio and committed from the downloaded ZIP. They are not generated from files in this repository.

## Commands

```bash
npm run build          # Rebuild Block Studio embedded assets and single-file app
npm test               # Run Block Studio core tests
```

## More Detail

- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) explains the current Block Studio setup and export model.
- [block-studio/README.md](block-studio/README.md) documents the application workflow and export model.
- [block-studio/VALIDATION.md](block-studio/VALIDATION.md) records the automated and simulated validation already completed.
