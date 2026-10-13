# Jarrang Block Studio 1.25.1

Convert coded email modules into independent SFMC custom blocks. This update simplifies field setup with a guided Add field flow, suggested module locations and an interactive preview of the client’s control. Conditional templates and repeatable content remain supported. Each module remains its own draggable block. The app exports static files for GitHub Pages branch publishing; it does not publish or install them.

## Guided tour

Choose **Take a tour** in the top bar, then **Create a new block** (8 steps) or **Fix HTML or CSS** (5 steps). The tour highlights controls on your current screen and explains where to find anything available at a later stage. Use Next, Back, Choose tour, Exit tour or Escape. Finish or exit before using the highlighted controls.

The tour never starts automatically. It does not edit modules, switch views, analyse HTML, save files or reset test values. On exit it restores any scroll positions it moved and returns focus to Take a tour. It runs offline, uses the native dialog for keyboard focus and Escape, and adds no dependencies to the exported SFMC blocks.

## Clients and templates

Use **Clients & templates** to switch between separately saved drafts. Choose **New template**, select or enter a client and name the template. The sidebar always shows the active client and template. Existing projects can be imported; a matching template requires confirmation before replacement. Original single-project browser data is retained when migrated on the same browser origin.

Use **Template settings** to name an unassigned project or rename a template. Publishing folders are fixed after assignment, so renaming does not change SFMC URLs. Client assignment is then fixed; create a new template to work for another client. A template represents a set of modules, not an automatically assembled full email.

**Repository settings** holds one Pages site URL for all templates in this browser. Use the site URL including the repository path, without `/docs` or `/studio`. A blank URL produces clearly illustrative `your-team` endpoints until you configure it.

## Tower workflow

The repository package is ready for **Deploy from a branch → /docs**. It includes the central application at `docs/studio/index.html`, a landing page and `.nojekyll`. See **TOWER-WORKFLOW.md** for setup and updates.

1. Pull the latest repository changes in Tower.
2. Choose **Open repository** and select the local repository root. Grant folder write access. Existing modules load with their editable fields and supplied icons.
3. Choose a module, edit its HTML/CSS or fields, and test it. **Save** writes the current module and the complete editable project into the repository. **Save template** updates every module in the active template.
4. Review the diff in Tower, commit and push. GitHub Pages deploys to the existing module URLs.
5. For a new module, use **Copy module URL** in **Module settings** and register the endpoint in SFMC Installed Packages after Pages has deployed.

The browser remembers the selected folder when supported. **Reconnect** requests permission and loads current files; **Reload repository** refreshes after a Tower pull. Replacing a different browser draft requires confirmation. Recovery drafts are automatic and distinct from **Saved to repository**. On a single-module save, other module drafts remain in the editable project while their published files stay unchanged; select and save them separately, or use Save template.

Direct saving requires folder write support, such as desktop Chrome or Edge. Other browsers can read a repository and use **Clients & templates → Manage templates** for editable-project and ZIP downloads. Both the hosted Studio and standalone application retain this fallback. Folder permissions may need granting again after restarting the browser.

Saving validates compatibility and checks repository files against the version opened in Studio. External changes block saving until you reopen and reconcile the draft. Save builds all output before writing, skips identical files, verifies writes and attempts rollback on failure. A browser crash or revoked permissions can prevent rollback; inspect Tower changes before committing if a save fails. Studio never commits or pushes itself.

Single-module saves refresh the catalogue using the last generated definitions of other modules. Older runtime folders, other client folders and existing URLs are preserved. Template-level styling requires **Save template** to update every module's generated editor. Updating Studio alone does not update published blocks.

## Jarrang branding

The workspace and exported editors use Jarrang’s navy/aqua palette, Neue Montreal fonts, original wordmark, pill buttons and rounded panels. Fonts are bundled for offline use. See [BRANDING.md](BRANDING.md) for theme sources and asset details.

## Open and try it

Open **Open-Block-Studio.html** in a desktop browser. No installation or server is needed. Conversion and ZIP export work locally; remote images still need a connection. Alternatively, open `index.html` beside `src` and `vendor`.

1. Paste or upload a module fragment, then select **Find editable content**.
2. Review the suggested fields. Choose **Explore an example** for an additional sample with a colour, a dropdown, title/CTA switches and a repeatable bullet list.
3. Configure fields and rules using the options below.
4. Select **Try the editor** and test content, conditional branches and item counts. Trial values do not replace starting values.
5. Choose **Save** to write the module to your connected repository, or **Save template** for every module. Module settings holds its folder, version, icon and endpoint.
6. Review, commit and push the saved files through Tower. Editable-project and ZIP downloads remain available under **Manage templates**.

## HTML editor

The editable **HTML & CSS** view and read-only **Generated HTML** output use the same code component. Source editing is inline, without a separate dialogue or a cramped side preview.

- Tags, attributes, values, comments, template expressions and AMPscript have distinct syntax colours.
- Place the cursor in an opening or closing tag to highlight its partner. **Matching tag** jumps between the linked tags. Conditions and loops also highlight their branches and closing statements, including conditions inside attributes.
- Line numbers show the original source locations. Enter a number beside **Go** to navigate directly.
- **Find**, or Ctrl/Cmd+F while the code has focus, searches literal text. Match case is optional. Previous and Next navigate results. In Edit HTML, Replace and Replace all use the quick-edit field protections. A failed replace-all leaves the entire draft unchanged.
- Gutter arrows fold multi-line elements, comments and template blocks. Folding is a viewing aid: expand all before editing, copying or selecting code for a new field. Hidden markup is never discarded.
- Underlined code identifies connected fields; clicking it selects the corresponding field. Selected fields have stronger highlights. Loop boundaries remain marked and the status line identifies the repeating field.

There is no automatic formatting. Saving preserves the source structure and existing line endings. Outlook conditional comments and personalisation remain source text. Tag matching is a navigation aid, not email HTML validation.

## Quick HTML fixes

After a module has been analysed, choose **HTML & CSS**. Make small CSS or surrounding markup corrections, switch to **Desktop** or **Mobile** to validate and preview them, then choose **Apply changes**. The hidden preview does no background work while you type. The editor retains field identities, labels, defaults, options, rich-text settings. Source offsets are adjusted without rediscovering fields. Cancel leaves the module unchanged and asks before discarding edits.

Connected field values are protected, including rich-text HTML stored within a field. Use Edit field for those changes. Large pasted replacements spanning connected values are rejected; make smaller edits around them. Template expressions and AMPscript must remain unchanged. Use the existing Template code flow for intentional logic/schema changes, which may rebuild mappings.

Applying a fix returns to the same workflow step. Check the result and choose **Save**. Source dependencies remain available under **Source checks**; no acknowledgement is required. The fix does not change its ID, folder or release. Exported updates do not automatically rewrite HTML already saved in SFMC email instances; verify affected content there.

## Add and edit fields

Choose **+ Add field**, then choose what your client should change: Text, Formatted text, Image, Link, Colour, Dropdown, Optional section, Repeating items or Number. The next screen suggests locations in your module. Search by visible text or a value such as a hex colour. Select a location to configure its field. Locations already mapped to a field open that existing field instead of creating a duplicate.

For an existing field, choose **Edit** in the field list. The editor has three areas:

- **Set up**: name the field, choose its control and starting content. Optional help, required settings and character limits are under **Guidance and limits**.
- **Where it applies**: review connected locations and link matching values elsewhere. Exact source selection is available in a collapsed code section.
- **Advanced**: template keys and other code settings. A client-facing name can change without changing its template key.

The **What your client sees** panel is interactive. Use it to check the control, including dropdown choices and list actions. Test edits there never change starting content. **Reset preview** restores the current starting content. Changes are committed only with **Save field**; Cancel or Escape discards the field draft, including a proposed repeat conversion.

For dropdowns, each row has a label the client sees and a value inserted into the code. Select the radio button beside the starting choice. Deleting that choice selects the first remaining choice. At least one choice must remain.

For colours, the starting colour picker and hex input stay in sync. **Where it applies** can suggest matching values elsewhere, so a single control can update an HTML background and its CSS equivalent. Matching values can have different purposes: link only the locations that should change together.

Select a field to reveal its **Remove** button; use the six-dot handle to reorder it. Removing a mapped field retains the source markup. Removing a template control requires removing or replacing its template references.

## Formatted text and fixed link styles

Formatted text has toolbar controls for bold, italic, underline, superscript, subscript, selected-text colour, bulleted and numbered lists, list marker style, adding/editing a link, removing a link and clearing formatting. Select the relevant words before applying formatting. Place the cursor inside an existing link to change its destination or remove it. The link dialogue checks the destination before inserting it and keeps the selected text.

Text colour uses a picker or hex input and produces a `<span style="color:#rrggbb;">`. Superscript and subscript use semantic `<sup>`/`<sub>` elements with inline size, line-height and vertical-alignment styles. These defaults still need checking in the actual email design.

In the developer's field editor, expand **Link appearance · locked for clients**. Set:

- **Link colour**: match the surrounding text or use a specific hex colour.
- **Link underline**: underlined or no underline.
- **Link weight**: match surrounding text, normal or bold.

These are field settings, not client content values. They are included in the exported module definition and are not shown as settings in the SFMC editor. The renderer reapplies them to every link in that field, including starting content and links inside repeated item fields. Conflicting colour, bold and underline formatting inside links is removed, and surrounding inline wrappers are split around links so they cannot override the configured styles. Formatting commands that would change a link's colour, weight or underline are blocked with an explanation. The client can still change the link text and destination or remove the link.

For example, black, underlined and bold settings produce:

```html
<a href="https://example.com/" style="color:#000000;text-decoration:underline;font-weight:bold;">Visit our website</a>
```

The link destination belongs in `href`; appearance belongs in `style`. Arbitrary pasted HTML/CSS is not exposed to clients. Pasting inserts plain text; the toolbar creates supported formatting. The sanitiser accepts supported inline formatting, hex/RGB span colours and validated link destinations, while removing scripts, event handlers and unsupported styles.

### Lists in formatted text

The **Bulleted list** and **Numbered list** buttons turn the line at the cursor (or the selected lines) into a list, and back again. Enter adds a row; Enter on an empty row leaves the list. **List style** changes the marker of the list at the cursor: solid circles, hollow circles or squares, and numbers, capital or lowercase letters or roman numerals. Bold, italic, underline, superscript/subscript and text colour work inside rows, and lists can be nested up to three levels deep. Each of the three buttons can be hidden per field under **Client toolbar controls**.

Lists are stored as plain `<ul>`/`<ol>`/`<li>` with an optional `type`. When the email is rendered, each list is fitted to the paragraph its field sits in, following the semantic-list approach for email:

- The paragraph is split around the list (`<p>…</p><ul>…</ul><p>…</p>`) because a list cannot sit inside a `<p>`; a list at the start or end leaves no empty paragraph behind.
- The list and every row get the paragraph's own class and its inherited text styles (font family, size, weight, style, line height, colour, letter spacing, alignment, case), found the way CSS inheritance would find them. Rows therefore match the surrounding text until the client picks a different text colour, bold or marker style. AMPscript colours are copied unchanged.
- The list has `margin: 0 0 <paragraph bottom margin> 25px; padding: 0` and an explicit `type`, so markers sit inside the container and spacing matches the paragraph.
- Empty rows are dropped, so a stray Enter never leaves an empty bullet in the email.

Not handled by a block: Gmail webmail's extra left indent and Outlook for Windows' large list margins need rules in the master template's `<head>` (for example `u + .body .glist { margin-left: 0 !important; }` and an `mso` conditional style), because a custom block cannot add head CSS. Outlook for Windows also ignores colour and weight on numbers. Lists inside a field mapped to a heading or a link are not split, so turn the list buttons off for those fields.

A formatted-text field mapped inside an existing button/link cannot insert another link. Its toolbar explains this restriction; edit the surrounding destination using the separate link field. Paragraphs/headings containing inline links can be discovered as a single formatted-text field, preventing overlapping text and destination mappings. Existing saved projects retain their mappings until re-analysed.

## Optional sections

Choose **+ Add field > Optional section**, then choose a title, button or section from the module. Give it a clear name such as “Show button” and choose whether it starts visible or hidden. Existing fields inside the section remain editable. Hiding removes the selected markup from the output rather than applying `display:none`.

The picker describes source elements; a visible button and its separate Outlook fallback may require linked sections. Review those relationships before export.

## Repeating content

Choose **+ Add field > Repeating items**, then select one existing list item, card or row containing editable fields. The app converts it into a repeatable item and generates the loop when saved. Review the fields inside each item, configure minimum/maximum counts and edit the starting items. Clients can add, remove and reorder items in the generated editor.

Only the selected element becomes repeatable. Other existing sibling items remain fixed. To convert a whole existing list, start with one representative item and configure the other starting items in the list control.

Item field settings are collapsed until needed. Adding a new item field creates its control, but you must also add its reference to the item markup in Template code. Renaming a client-facing item label does not change its template key. The editor supports one level of item fields; the renderer also supports nested loop scopes for suitable project data.

Repeated slides provide content for existing carousel markup. This does not generate the carousel behaviour, CSS, controls, IDs or Outlook fallback. Those remain part of the authored module.

## Advanced authoring

Open **Advanced tools** for Template code and precise code selection. Open the menu before selecting source text, then use **Add field from code selection** or **Repeat code selection**. For a CSS field, select only its value, such as `#ffffff`, not the declaration name or semicolon. For a section, select its complete element.

For a named template control, use **+ Add field**, choose its type, then expand **Advanced options > Create a template control** on the location screen. A connection notice explains when it has not yet been used. Its **Where it applies** tab provides the reference to insert in Template code. This route is intended for module authors who need custom rules; ordinary source-based fields use the guided location picker.

Use **Advanced tools > Template code** for if/else alternatives or more complex conditions. See [TEMPLATE-SYNTAX.md](TEMPLATE-SYNTAX.md). Changing a template key does not rewrite existing expressions, so update its references as well.

## Template behaviour

This is a deliberately defined Liquid-style subset, not a full Liquid implementation. Conditions and loops execute while the block is edited. SFMC receives the rendered HTML. AMPscript stays in the source for SFMC to process at send time.

Template mode is enabled when saving a named template control, saving a repeat conversion or applying Template code. Merely importing HTML does not interpret existing `{{...}}` syntax. Use template mode only for modules intended for this language; other moustache-based languages can conflict with it.

Without template logic, unchanged mapped values retain their original source bytes, except formatted-text fields with configured link appearance: those are normalised so the link policy also applies to starting content. Changed values use context-aware escaping. Template expressions escape inserted text by default; `| richtext` enables sanitised inline formatting. Conditional sections and loops intentionally change the output structure.

Applying changed Template code rebuilds source mappings. Named controls survive; explicitly referenced mapped controls are promoted to named controls. Review new suggestions, defaults and linked locations afterwards. Save a project copy before structural edits.

## Publishing

Exports contain instructions under `projects/<client>/<template>-PUBLISHING.md`. Publish the `/docs` folder of your chosen branch. Every module has its own `index.html`, `icon.png`, `dragIcon.png` and endpoint at `/clients/<client>/<template>/modules/<module>/`.

Shared dependencies live under `docs/shared-assets/runtime-<content-hash>/`. Keep existing runtime folders and module endpoints. No master SFMC block, backend, GitHub credentials or custom Actions workflow is introduced.

## Current limits

This is a working beta. Automated logic, export and DOM/SDK simulation checks pass. The new workspace UI has not been verified visually in a live browser, installed in a live SFMC account or certified in email clients.

- Import module fragments, not full email documents or executable HTML.
- Preview-only master-template CSS is not inserted into email output. Supply required CSS in the actual email template.
- Images use existing URLs. Image upload and hosting are outside this app.
- Source discovery and linked fallback discovery require review. Browser preview does not emulate email clients.
- Personalisation cannot be entered through ordinary URL controls. Keep dynamic AMPscript in authored source and verify it in SFMC.
- No automatic migration of existing SFMC block metadata. Keep old endpoints and use a new module folder/release for changed schemas.
- Test close/reopen, duplication, rapid closure, tracking, subscriber preview and sends in SFMC before client use. Interactive markup also needs client-specific fallback testing.

## Undo and recovery

Use **Undo** and **Redo** beside Module actions to reverse applied changes to the current module. Hover over either button to see the next action. Field settings, removal, ordering, repeating-section conversions, source import, applied HTML/CSS fixes and icon changes are included. Source and field mappings are restored together. Each module has its own history, including when you switch templates.

**Cmd/Ctrl+Z** and **Cmd/Ctrl+Shift+Z** work outside text inputs and dialogs. While typing, the editor keeps its normal text undo. Apply or discard a pending HTML/CSS edit before using module history. Undo/Redo clears temporary Test values so they cannot conflict with recovered fields; starting values are restored with the module.

For longer-term recovery, choose **Module actions → Restore last exported content…**. Review the changed areas and optionally compare the exact current/exported content, then choose **Restore content**. This restores the exported name, folder, version, HTML, fields, template logic mode and preview CSS. Current icons, preview width and template colours are kept. Restoration itself can be undone. A new module has no recovery reference until it is exported; opening a repository also loads its exported reference.

Undo history lasts for the current Studio session and is cleared on reload or replacement of a template. Up to 40 changes are retained across the workspace, bounded by a 16 MiB snapshot budget (one oversized snapshot is retained). It does not cover deleting a whole module/template or changing template/repository settings. Download an editable project before those operations if you need a backup.

The last-exported reference survives in saved browser drafts and editable projects. Exporting again replaces that reference. Undo and recovery do not rewind it, alter existing files, or deploy to SFMC. Review and export recovered content, then use Tower as usual. To roll back an already deployed release, restore the matching files through Tower instead.

## Development

Plain HTML, CSS and JavaScript, with no backend. Run `python3 build.py` after changing source. This regenerates embedded export assets and the standalone app.

- `src/runtime-core.js`: lean parser, validation and rendering shared by Studio and every exported block (exposed as `BlockRuntimeCore`; exported pages see it as `BlockCore`).
- `src/core.js`: authoring-only mapping, field inference and project validation; re-exports the runtime core so `BlockCore` remains the full API in Studio.
- `build.py` bundles the Block SDK, `logic.js`, `runtime-core.js`, `rich-editor.js`, `controls.js` and `runtime.js` into `runtime.bundle.js` (plus `runtime.rich.bundle.js`, the same bundle with `rich-editor.js`, which exported pages use only when a module has a richtext field, including inside a list), and `runtime.css`, `controls.css` and `runtime-brand.css` into a whitespace-stripped `runtime.bundle.css`. Each exported block page loads just those two files; `brand.css` is exported only for the template catalogue page. The JavaScript is concatenated, not minified.
- `src/runtime-brand.css`: generated by `build.py` from `brand-theme.css`; only the rules the exported editor uses, with system fonts instead of embedded Neue Montreal.
- `src/logic.js`: bounded expression/template interpreter without eval.
- `src/controls.js` and `controls.css`: shared client form and repeatable item controls.
- `src/rich-editor.js`: selected-text formatting, colour and link editing with fixed link appearance.
- `src/field-catalog.js`: type choices and suggested source locations.
- `src/field-editor.js`: guided field creation, progressive settings, linked locations and client preview.
- `src/app.js`: Studio workflow and application state.
- `src/history.js`: bounded authoring-only module snapshots and last-exported content recovery; excluded from the SFMC runtime.
- `src/preview.js`: preview rendering, sanitisation and sandbox message handling.
- `src/code-editor.js`: shared source editor, syntax highlighting and navigation.
- `src/quick-edit.js`: transactional HTML changes that preserve mappings.
- `src/workspace.js`: isolated template drafts, client naming, import conflicts and repository settings.
- `src/exporter.js`: static ZIPs and publishing instructions.
- `src/runtime.js`: Salesforce Block SDK integration and persisted field values.

Run `node scripts/validate.cjs` for JavaScript syntax checks and all non-browser test suites. This discovers new non-browser suites automatically and exits unsuccessfully if any check fails. Browser suites are `tests/browser.test.cjs`, `tests/logic-browser.test.cjs` `tests/field-ux.test.cjs` and `tests/richtext-browser.test.cjs`; they use Playwright and JSZip, optionally resolved through `PLAYWRIGHT_MODULE` and `JSZIP_MODULE`. Set `CHROMIUM_EXECUTABLE` if needed. See [VALIDATION.md](VALIDATION.md).

Salesforce Block SDK and JSZip licences are included in `vendor`. The SDK is unmodified.

## Client toolbar controls

In a formatted-text field’s Set up tab, expand **Client toolbar controls**. Untick any controls to hide them in the client preview and exported SFMC editor. Each field, including rich-text fields within repeating items, has its own settings. Existing projects default to all controls enabled. The Starting content editor retains all authoring controls so the developer can set preformatted defaults. Existing content is preserved. Disabled formatting shortcuts and corresponding browser input commands are blocked; pasted text remains plain text. These settings control editing tools, not immutable content: clients can still edit or delete text. Save field commits the choices; Cancel discards them. Re-export modules to update published editors.

## Reorder fields

Drag the six-dot handle on the left of a field to place it before or after another field. A line marks the insertion point. Keyboard users can focus the handle and press Up/Down, or Home/End. The order is saved with the project and used by the client editor and exports. Use the Edit button beside each field name to change its settings.

### Editor colours
Open **Template settings → Editor colours for all modules**, or **Edit template colours** from Test. The shared palette controls accent, form background, text/borders and field backgrounds for the whole template. Settings are staged until **Save template settings**. Reset restores Jarrang styling for every module. Text contrast below 4.5:1 blocks export. These settings style only the custom block form, not the SFMC application or email output.

See [CODE-REVIEW.md](CODE-REVIEW.md) for module boundaries, generated-file rules and remaining technical debt.

## Maintainable source

Use `npm ci` for the pinned development dependencies, then `npm run format:check` or `npm run format`. Generated assets and vendor code are excluded. Run `npm run build`, `npm test` and `npm run format:check` before distributing. `npm test` also checks runtime payload budgets; `npm run check:size` reports them separately. No npm dependencies are needed to use the exported app.

The current browser interaction suite is `npm run test:browser` (requires Playwright). It has been prepared but not executed here. The four older browser suites are historical, not current release evidence. See CODE-REVIEW.md for the specific remediation and outstanding validation.

## Earlier release notes

The notes below record earlier releases, including interfaces since replaced. Use the instructions above and ESC-MAINTENANCE.md for the current workflow.

### Build and test workspace (1.11.0)

The workflow is Import HTML → Build & test → Export. Build & test provides Configure fields and Test client controls modes beside one shared preview. Switching modes retains the loaded iframe and temporary test values. HTML shows mapped source when configuring and rendered output when testing. Desktop/Mobile/HTML selection is retained across modes.

Configure shows module starting content with selectable field highlights. Test shows temporary client values without authoring highlights. Restore starting values clears temporary values; exports always use authored starting content. Saving a field clears only its own test value, and reordering preserves test values. Changing modules starts fresh test values. Saving validates the module automatically. Only blocking issues open a compact error panel; there is no review checklist or acknowledgement step. **Module settings** changes no review flags.

The browser regression suite now includes mode switching and value preservation. It remains unexecuted in this environment; current automated verification uses DOM simulations.

### Draft, test and download status (1.11.0)

The persistent draft bar describes browser storage only and stays visible on narrow screens. Download editable project creates a portable JSON file; Save template settings changes the project name/client settings locally. Test values are temporary and excluded from both JSON and ZIP downloads.

Download module package and Download template package produce publishing ZIPs. A persistent, dismissible receipt identifies the requested filename and the next Tower steps. It says Download started because the app cannot verify that the user completed the browser download. It never marks a package published or installed. Existing save-failure warnings remain visible when a file download is requested.

### Integrated repeating groups (1.11.0)

Select a mapped field in the visual preview or field list, then choose **Make repeating**. Confirm the complete item boundary in the highlighted preview. The selected item becomes one starting row; same-type siblings stay outside the group and require explicit acknowledgement. Saving the group commits the conversion; cancelling either dialog leaves the module unchanged.

Item fields appear beneath their group in the main field list. Select a child to open its settings directly. Starting items support add, duplicate, reorder and remove. The Rules disclosure contains minimum and maximum item counts; a zero-item list removes repeated markup but retains its surrounding layout. Use Test client controls in the same workspace to try the result.

Automatic conversion requires mapped content in a static item. Existing template logic and mappings shared outside the boundary require the advanced code tools. Additional item fields still require a matching template reference. Existing siblings are not automatically merged.

### HTML repeat selection and dialog safeguards (1.11.1)

In the HTML workspace, click inside the item and use **Make repeating** in the code toolbar. Choose a complete enclosing element, review the outlined preview and exact HTML, then continue to the group editor. Partial selections are expanded to a containing element rather than requiring precise tag-to-tag dragging. Siblings are preserved with explicit acknowledgement.

Field tabs handle navigation locally. Publishing ZIP downloads are blocked while any dialog is open. The reported Advanced-tab download could not be reproduced in the available DOM simulation, so this is a defensive safeguard rather than a confirmed root-cause fix.

### Make a group non-repeatable (1.12.0)

Open the group’s **Edit field** dialog. Under **Set up → Content behaviour**, choose **Single item**. Review the client-control preview, choose a starting item if there are several, acknowledge removal of the other items, then choose **Save as single item**. Switching back to Repeating items before saving keeps the group intact. Its child fields become ordinary editable template fields in the same list position. Their settings and the chosen item's values are retained. Other starting rows are removed; temporary test values are reset. An empty group uses the child-field defaults to create one item. Cancel leaves the module unchanged.

Automatic conversion supports one directly connected loop. Shared references, nested loops and loop counters require template-code changes and are blocked with an explanation. This operation retains template connections rather than recreating source-offset mappings.

### Conversion regression fixes (1.12.2)

Single items containing connected field references can be made repeating again from either HTML or visual field selection. Values, field settings and supported template filters survive repeated conversions. Mixed source mappings and template references are supported. Custom statements, unknown expressions, disabled fields and connections shared outside the selected section are blocked with a specific explanation. Failed conversions leave the module unchanged. Preview selection now resolves reused loop aliases within the correct scope.

### Template editor colours (1.13.0)

Open **Template settings → Editor colours for all modules**, or use **Edit template colours** from Test client controls. The saved palette applies to all existing and new modules and to both single-module and full-template exports. It changes SFMC form styling, not email HTML. Settings are staged until Save template settings.

Existing module palettes remain active until template settings are saved. Choose an existing module’s palette as the starting point, then save to apply it across the suite and remove module overrides. Resetting to Jarrang colours applies to the whole template. Download a full template package to update every already-published module through Tower and GitHub Pages.

### Setup and maintenance tasks (1.14.0)

New modules start with the guided Import HTML flow. After analysis, module task actions provide Edit HTML & CSS, Configure fields, Test controls and Export. Edit HTML & CSS opens the transactional source editor, preserving field definitions. Apply changes returns to the workspace; Apply and review export opens package review without publishing.

The read-only code views are named Field connections (configuration source) and Generated HTML (temporary test output). Both offer a direct route to the same source editor; Field connections transfers the current cursor/selection. Original import and template context remain available under Advanced tools.

Design rationale: explicit task names and contextual guidance reduce reliance on remembering similar-looking controls, following Nielsen Norman Group’s recognition-over-recall and consistency guidance: https://www.nngroup.com/articles/recognition-and-recall/ and https://www.nngroup.com/articles/ten-usability-heuristics/. These principles informed the design; this release is not a completed usability study.

### Consolidated HTML workspace (1.15.0)

**HTML & CSS** is now the editable source view within Build & test. The top Edit HTML & CSS shortcut opens that same view. Source editing and field selection share one editor instance, alongside the existing preview, with a stacked layout on narrower screens. The separate quick-edit dialog and its preview iframe have been removed. Generated HTML remains read-only test output.

Changes update the preview after a short pause and are applied explicitly using Apply changes or Apply and review export. Discard changes restores the saved source. Connected values and template expressions remain protected by the existing edit validator. Apply or discard code changes before changing field definitions.

Unapplied code drafts survive module switches within the current session, are labelled in the module list, and block project/package downloads until resolved. They are not saved across page reloads; closing the page warns about them. Applied changes use the existing browser-save flow. Test controls use the saved module until code changes are applied.

### Code-only HTML view (1.15.1)

HTML & CSS and Generated HTML use the full preview-panel width for code. Switch to Desktop or Mobile to see the existing preview. Switching views preserves the editor draft and does not recreate the preview iframe.

### Simplified workspace (1.16.0)

One module navigation provides Fields, HTML & CSS, Test and Export. Fields and Test return to the last visual viewport; source editing remains code-only. Add field and a More tools disclosure sit with the field list. Module actions contains Duplicate and Delete. Clients & templates is the single template-switching entry, and New module is the single creation entry. Import guidance is optional under How it works. Code changes use Apply changes or Discard changes, followed by Export when ready. Existing safeguards for protected field values, pending drafts and export remain in place.

### Custom block icons (1.17.0)

Export includes a background colour picker, six bundled Bootstrap Icons (Image, Text, List, Grid, Video, Button/CTA) and a live PNG preview. Foreground switches between black and white for contrast. Existing modules retain the original labelled icon until another is selected; new modules default to Grid. Settings persist in editable projects and apply to both individual and full-template exports. Icons work offline; no icon CDN is used. Bootstrap Icons 1.13.1 is MIT licensed, with its notice included in the Studio and publishing packages.

Salesforce requires `icon.png` and `dragIcon.png` alongside the widget's `index.html`: https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/develop-block-widget.html . This page does not prescribe dimensions. Studio retains its existing 60×60 block PNG and 120×120 drag PNG; these sizes are Studio defaults, not a claimed Salesforce mandate. Confirm the appearance in your SFMC account before release.
