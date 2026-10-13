# Maintaining the ESC custom blocks

## Landscape placeholder (1.25.4)

The populated landscape-image defaults now use the ESC-hosted 1920 × 1080px JPEG:
https://image.info.escardio.org/lib/fe89127277620d7570/m/1/4fcce3d7-6f50-466b-a889-68d38120a9f9.jpg

This covers general content imagery, banners, video/webinar images, social imagery and the first editorial thumbnail. Logos, journal covers and circular speaker portraits retain their purpose-specific defaults. Optional blank images remain blank. The congress mobile image reuses the main placeholder until an alternative is supplied. Existing SFMC instances keep their saved images.

## Plain-text punctuation correction (1.25.3)

Plain-text fields should store the actual character, for example `28 Aug – 31 Aug 2026`, not HTML entity notation such as `&ndash;`. The renderer escapes plain text before inserting it into HTML. HTML source and rich-text fields can still contain valid entities.

The bundled defaults and exports are corrected in Congress Deadlines List, Lead Editorial and Lead Poster, plus Newsletter Journal Section, Quote and Social Block. Open the updated repository in Studio to refresh old drafts before further editing. Existing SFMC blocks keep their saved values: replace any entity text already saved in a field with the actual character and save that instance. Newly added blocks use the corrected defaults after deployment.

## Landscape imagery (1.25.2)

Congress **Lead Editorial** retains the side-by-side desktop composition: a 320px content column and a 300px visual column share the ESC primary-colour panel. The image sits vertically centred in a 274px frame, leaving a 26px outer gutter to match the content inset. Its 8px corners follow the card imagery elsewhere in the suite; clients that ignore border-radius retain square corners. A 1920 × 1080px asset displays at approximately 274 × 154px on desktop with automatic height, keeping the whole image visible. This replaces the full-width stacked desktop treatment introduced in 1.25.1. Other aspect ratios also remain proportional, including previously saved portrait images, which can make the panel taller.

Use **Visual image** and its alt text for the main image. **Mobile image (optional)** can be left empty to reuse both the main image and its alt text. If a mobile alternative is supplied, its own alt text is used, including an intentionally empty alt value. Previously saved desktop/mobile URLs, alt text, links and other field values retain their IDs and continue to work. New blocks start with a 1920 × 1080 placeholder and no mobile override. Existing instances retain their saved mobile alternative; clear it to use the main image everywhere.

The supplied ESC master template needs no change. The module retains its table layout, inline CSS, AMPscript, mobile image switching classes, MSO conditional exclusion and dark-mode classes. No object-fit, background cropping, new runtime dependency or new SFMC endpoint is required. On mobile, the existing master-template rules stack the content and image, expand the image frame to 100%, switch to the mobile image and remove image corner rounding. The organiser logo still hides on mobile according to the master template.

Newsletter **Story Card 2 Col** and **Story Card 3 Col** also have their fixed image height attributes removed in every layout variant, while retaining explicit widths and height:auto. Most other content imagery already scales proportionally. Logos and circular speaker portraits remain purpose-specific artwork; 16:9 should not be treated as a universal replacement for those assets. Compress the supplied image files before uploading, as display scaling does not reduce download size.

Open the updated repository in Studio to refresh existing browser drafts, save subsequent edits to that repository, then review and commit/push through Tower. These files have not been deployed. After deployment, reopen and save a test instance in SFMC and check a new instance too; existing email HTML is not rewritten merely by updating the hosted editor. Check desktop Outlook, mobile layout and dark mode against the master template before a production send.

The width-attribute, max-width and proportional-height approach follows the existing ESC modules and Litmus's responsive image guidance: https://www.litmus.com/blog/understanding-retina-images-in-html-email (accessed 13 October 2026).

## Open the current suite

1. Pull the latest changes in Tower before editing.
2. Open `block-studio/Open-Block-Studio.html` in Chrome or Edge on your Mac. No server or build command is needed.
3. Open **Clients & templates → Open repository folder** and choose the repository root, the folder containing `docs/`, `projects/` and `block-studio/`. This reads files locally; it does not write to your repository.
4. Confirm replacement only if you no longer need the matching browser drafts. Download an editable project first if you need to keep them.
5. Choose **ESC / Newsletter** or **ESC / Congress**, then the module.

A fresh workspace already includes the 40 bundled ESC modules. That snapshot belongs to this Studio build. Opening the repository folder after a Tower pull loads the latest committed projects and icons. It also checks that each saved definition matches its exported page. If it reports a mismatch, stop and reconcile the named JSON/page pair rather than importing old data over a newer block.

Browser drafts and temporary Test values are local to your browser. They do not update GitHub or another person's workspace. Nothing is deployed just by opening or editing Studio.

## Fix HTML or CSS

1. Choose **HTML & CSS**, make the small code correction, then **Apply changes**.
2. Switch to **Fields** for Desktop/Mobile previews, or **Test** to exercise the client controls.
3. Choose **Export**, review the dependency notes, confirm the review and download the module package.

Keep the existing module identity, folder name and version for a maintenance fix. The editor protects mapped values and template/AMPscript expressions during quick code edits. Change starting copy through **Fields → Edit**. Existing conditions can be changed in **Fields → Edit → Where it applies → Layout rules**. Creating or restructuring branches uses **More tools → Advanced template logic** and needs developer review.

## Change controls or starting content

Use **Fields → Edit** for labels, help, starting content, dropdown options, list fields and limits, rich-text tools and locked link styles. Use **Test** for trial values; these are excluded from exports.

The current ESC suite uses switches, optional sections, colour/theme choices, repeating lists, conditional layouts and formatted-text lists. These continue through the same workflow. Use **Where it applies → Layout rules** to change an existing condition: dropdown choices, whether content is present, combined conditions, or an item-position comparison. Each condition shows its source line. Changes are staged until Save field; Cancel leaves the source unchanged. Test every affected choice after changing a rule, especially where several conditions cooperate on one layout.

For a repeating group, expand an item field to set its **Guidance and limits**. **Content behaviour → Single item** now also works with the supplied item-position rules. The retained item becomes the first and last item, with a count of one. Changing an existing published list into scalar fields still changes its saved-data schema, so use a duplicated module/new endpoint for that release.

Compatible updates can retain the existing endpoint. Export blocks changes that remove/change an existing field, remove a dropdown value or tighten validation enough to reject saved content. For an incompatible update, use **Module actions → Duplicate**, give the copy a clear name and new folder, and register it as a separate SFMC block. Retain the original module and endpoint for existing emails. Changing a template key also requires updating its code references.

Starting content changes affect defaults. Existing SFMC instances retain their saved field values; updating the hosted editor does not update every email automatically. Reopen and test an existing instance as well as a newly dragged block.

## Keep the ESC icons

**Export → Custom block icon → Keep supplied PNGs** preserves both PNG files exactly, including transparency and dimensions. The supplied suite contains 58×58 artwork as well as the earlier generated sizes. Do not regenerate icons just to make their dimensions uniform.

Choosing a generated icon asks before replacing the supplied pair. Both `icon.png` and `dragIcon.png` remain beside the module's `index.html`. Editable projects now retain the PNG bytes, so importing the saved JSON also preserves them.

## Recover an editing mistake

Use **Undo/Redo** beside Module actions for changes made in the current Studio session. Applied code fixes and their field mappings move together. For an earlier baseline, choose **Module actions → Restore last exported content…**, review the changes, then restore. The restoration can itself be undone.

This recovers module content and field settings, while keeping current icons, preview width and template colours. It resets temporary Test values. The export reference stays intact; it is evidence of an export, not proof of deployment. Session history clears on reload, but the exported reference stays with saved drafts and editable projects. Whole-module/template deletion and shared template settings are outside module history.

Review and test recovered content before exporting. These actions do not update hosted files or existing SFMC instances. Use Tower to roll back a published release.

## Publish through Tower

1. Extract the downloaded ZIP outside the repository.
2. Copy its changed files into the matching repository locations. Merge `docs/` and `projects/`; do not replace either top-level folder in Finder.
3. Review the diff in Tower. A module update should affect its page, the editable template JSON, publishing notes and, if necessary, new shared runtime files. Supplied icons should be unchanged unless you chose to replace them. Other clients and existing runtime folders must remain.
4. Commit and push to the existing GitHub Pages publishing branch. The site uses **Deploy from a branch → /docs**. No GitHub Actions workflow is needed.
5. Keep the same installed-package endpoint for an existing block. Register a new endpoint only for a new/duplicated block.
6. Open the hosted block and test in SFMC. If the old editor is still cached, verify the published files and reload before testing again.

For rollback, revert the relevant commit in Tower and push. Restore the matching page, editable project and any changed icon files together. Do not delete older shared runtimes.

## Before client use

Test a new block and an existing saved instance: edit, close/reopen, duplicate, switches, every relevant dropdown choice, list add/remove/reorder, formatted-text lists and links. Check the final output with realistic content in the required email clients.

The modules depend on the ESC email master template. Studio does not execute AMPscript, resolve subscriber data or reproduce Outlook. All 40 supplied modules currently have empty preview-only `contextCss`; master-template CSS can be added there if needed for the browser preview. Keep the live email's master-template CSS and AMPscript initialisation in place, and use SFMC subscriber preview/test sends to check branding and personalisation.

The automated checks are documented in `ESC-COMPATIBILITY.md`. They do not replace this final SFMC check.

## Export references and drafts (1.20.0)

Studio records an `exportedDefinition` snapshot and its `published` schema reference when it produces an export. These describe downloaded files, not confirmation that they were deployed. Continue committing the matching files through Tower.

A single-module export can retain newer, unexported changes in other modules. Opening the repository compares each hosted page with that module's exported snapshot and restores the editable draft separately. Keep the project JSON and exported files from the same download together. Older browser projects with a schema reference but no exported snapshot need to be reopened from the current repository, or exported as a full template, before partial export.

Renaming a draft template key updates scoped references and repeating-row values together on Save. Existing published item keys are protected because saved SFMC values depend on them; change the visible label or duplicate the module for a new schema. Changing formatted text to plain text removes formatting and links, with a warning before saving.

The save-failure lock and repeater focus fixes ship in the newly generated runtime. Existing hosted modules remain on their original runtime until deliberately re-exported. Preserve all old runtime folders when merging an export.
