# Agent guide: safe module maintenance

Read [README.md](README.md), [DEVELOPER_GUIDE.md](documentation/internal/DEVELOPER_GUIDE.md) and, for ESC work, [ESC handover](documentation/clients/esc/INTERNAL-HANDOVER.md) before making changes. The [user guide](documentation/internal/USER_GUIDE.md) describes the browser workflow. This file covers programmatic maintenance, not a separate publishing process.

## Non-negotiable rules

- Never overwrite an existing `docs/shared-assets/runtime-<hash>/` folder with different bytes. Add a new content-hash directory for changed runtime assets and keep old directories.
- Do not replace another template's module folders or project JSON. Intentionally regenerating the same template or its own module is permitted; preserve other modules, clients, old endpoints and catalogues as appropriate to the save scope.
- Preserve existing module IDs, slugs/releases, field IDs/types and item keys for compatible maintenance. Duplicate into a new endpoint for incompatible changes. Do not remove `published` or `exportedDefinition` to bypass compatibility validation.
- Client/template slugs must match `^[a-z0-9]+(?:-[a-z0-9]+)*$`, maximum length 80. Validate module slugs and release versions with the exporter too.
- Module `source` must be an HTML fragment, not a full document. No executable HTML, script/iframe/object/embed elements or event-handler attributes.
- Targets must not overlap except supported containing section toggles. Use `BlockCore.rebase(module, edits)` for source edits once fields have mappings. Never keep old offsets after a direct source splice.
- Keep existing AMPscript byte-identical. It is opaque SFMC personalisation, not a string to normalise or execute.
- Preserve `iconAssets`, `published` and `exportedDefinition`. Keep supplied PNG bytes exactly unless a deliberate icon replacement was requested.

## Preferred implementation route

1. Read the current project and its generated module pages. Resolve mismatches before editing. A draft can differ from its generated page; `exportedDefinition` records that page's baseline.
2. Use the existing core/field-transform functions for authoring changes. `core.js` can be loaded through CommonJS for suitable pure operations. Rich-text rendering/sanitisation needs a DOM; use the project's DOM-backed test patterns rather than bypassing sanitisation.
3. Run `BlockCore.assertProject`, field validation, render checks and `BlockExport.problems` for affected modules. Reuse exporter validation rather than recreating an incomplete subset of its rules.
4. Generate output through `BlockExport`, applying `themedModule(project, module)` for definitions/pages when using lower-level functions. Prefer `BlockExport.files(project, modules, options)` for repository output. It handles template appearance, page wrappers, icons, catalogue scope, runtime paths and project references. Use valid client/template/base URL settings and the intended `fullTemplate` scope.
5. Write only the intended output. Review the resulting diff and reopen/check project-page consistency. If using lower-level output functions, record exported definitions through `BlockMaintenance.recordExport`; do not replace a baseline before validation succeeds.
6. Rebuild Studio if its source or bundled project snapshots changed. Rebuild alone does not regenerate hosted modules. Run the applicable checks in the technical guide and report any unperformed live verification.

Do not copy a previous module's HTML wrapper by hand: template branding, escaping, runtime selection and relative paths must follow the current exporter. Do not renumber existing field IDs for neatness.

## Icons

Generated icons use Canvas. A DOM simulator without a real canvas cannot prove that PNG generation works. Reuse supplied `iconAssets` where appropriate. If real generation is unavailable for a new icon, use Studio or report the missing deliverable; do not silently ship placeholder artwork as final. Export both `icon.png` and `dragIcon.png` beside `index.html` and preserve vendor licences.

## Verification and delivery

Use `npm ci --prefix block-studio` for locked dependencies. For source changes run the build, `npm test` and formatting checks from the technical guide. Inspect the scope of changes, unchanged runtime directories, source offsets, AMPscript and icon bytes. For docs-only changes validate links and instructions; update publishing-note source as well as its generated copies when wording changes.

Automated DOM/SDK checks are not live-browser, SFMC or email-client validation. Do not claim deployment, delivery or visual certification from generated files. Do not push or register endpoints without task authorisation. Keep editable projects and generated pages together for review through Tower.
