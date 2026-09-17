# Jarrang Block Studio 1.7.0

Convert coded email modules into independent SFMC custom blocks. This update simplifies field setup with a guided Add field flow, suggested module locations and an interactive preview of the client’s control. Conditional templates and repeatable content remain supported. Each module remains its own draggable block. The app exports static files for GitHub Pages branch publishing; it does not publish or install them.

## Jarrang branding

The workspace and exported editors use Jarrang’s navy/aqua palette, Neue Montreal fonts, original wordmark, pill buttons and rounded panels. Fonts are bundled for offline use. See [BRANDING.md](BRANDING.md) for theme sources and asset details.

## Open and try it

Open **Open-Block-Studio.html** in a desktop browser. No installation or server is needed. Conversion and ZIP export work locally; remote images still need a connection. Alternatively, open `index.html` beside `src` and `vendor`.

1. Paste or upload a module fragment, then select **Find editable content**.
2. Review the suggested fields. Choose **Explore an example** for an additional sample with a colour, a dropdown, title/CTA switches and a repeatable bullet list.
3. Configure fields and rules using the options below.
4. Select **Try the editor** and test content, conditional branches and item counts. Trial values do not replace starting values.
5. Review the export and choose repository root or `/docs`. Download one module or export all reviewed modules together.
6. Use **Save project** to keep an editable `.jarrang.json` file. Browser storage is only a convenience.

## Add and edit fields

Choose **+ Add field**, then choose what your client should change: Text, Formatted text, Image, Link, Colour, Dropdown, Optional section, Repeating items or Number. The next screen suggests locations in your module. Search by visible text or a value such as a hex colour. Select a location to configure its field. Locations already mapped to a field open that existing field instead of creating a duplicate.

For an existing field, choose **Edit** in the field list. The editor has three areas:

- **Set up**: name the field, choose its control and starting content. Optional help, required settings and character limits are under **Guidance and limits**.
- **Where it applies**: review connected locations and link matching values elsewhere. Exact source selection is available in a collapsed code section.
- **Advanced**: template keys and other code settings. A client-facing name can change without changing its template key.

The **What your client sees** panel is interactive. Use it to check the control, including dropdown choices and list actions. Test edits there never change starting content. **Reset preview** restores the current starting content. Changes are committed only with **Save field**; Cancel or Escape discards the field draft, including a proposed repeat conversion.

For dropdowns, each row has a label the client sees and a value inserted into the code. Select the radio button beside the starting choice. Deleting that choice selects the first remaining choice. At least one choice must remain.

For colours, the starting colour picker and hex input stay in sync. **Where it applies** can suggest matching values elsewhere, so a single control can update an HTML background and its CSS equivalent. Matching values can have different purposes: link only the locations that should change together.

Select a field to find **Order and remove** below its summary. Removing a mapped field retains the source markup. Removing a template control requires removing or replacing its template references.

## Formatted text and fixed link styles

Formatted text has toolbar controls for bold, italic, underline, superscript, subscript, selected-text colour, adding/editing a link, removing a link and clearing formatting. Select the relevant words before applying formatting. Place the cursor inside an existing link to change its destination or remove it. The link dialogue checks the destination before inserting it and keeps the selected text.

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

The module export includes `PUBLISHING.md`. Extract its contents into a repository. In GitHub Pages, choose **Deploy from a branch**, the branch and **/(root)** or **/docs**. Exported modules need no build command or custom Actions workflow. Keep the publishing folder's `.nojekyll` file.

Every module has its own `index.html`, `icon.png`, `dragIcon.png` and SFMC endpoint. Shared static dependencies do not create a master SFMC block. All runtime dependencies are included locally. Shared assets use a versioned folder; retain older folders and module endpoints when adding new releases.

## Current limits

This is a working beta. Automated browser and SDK simulations pass, but it has not been installed in a live SFMC account or certified in email clients.

- Import module fragments, not full email documents or executable HTML.
- Preview-only master-template CSS is not inserted into email output. Supply required CSS in the actual email template.
- Images use existing URLs. Image upload and hosting are outside this app.
- Source discovery and linked fallback discovery require review. Browser preview does not emulate email clients.
- Personalisation cannot be entered through ordinary URL controls. Keep dynamic AMPscript in authored source and verify it in SFMC.
- No automatic migration of existing SFMC block metadata. Keep old endpoints and use a new module folder/release for changed schemas.
- Test close/reopen, duplication, rapid closure, tracking, subscriber preview and sends in SFMC before client use. Interactive markup also needs client-specific fallback testing.

## Development

Plain HTML, CSS and JavaScript, with no backend. Run `python3 build.py` after changing source. This regenerates embedded export assets and the standalone app.

- `src/core.js`: mapping, field definitions, validation and rendering.
- `src/logic.js`: bounded expression/template interpreter without eval.
- `src/controls.js` and `controls.css`: shared client form and repeatable item controls.
- `src/rich-editor.js`: selected-text formatting, colour and link editing with fixed link appearance.
- `src/field-catalog.js`: type choices and suggested source locations.
- `src/field-editor.js`: guided field creation, progressive settings, linked locations and client preview.
- `src/app.js`: studio workflow and source/template editing.
- `src/exporter.js`: static ZIPs and publishing instructions.
- `src/runtime.js`: Salesforce Block SDK integration and persisted field values.

Run `node --test tests/core.test.cjs tests/logic.test.cjs`. Browser suites are `tests/browser.test.cjs`, `tests/logic-browser.test.cjs` `tests/field-ux.test.cjs` and `tests/richtext-browser.test.cjs`; they use Playwright and JSZip, optionally resolved through `PLAYWRIGHT_MODULE` and `JSZIP_MODULE`. Set `CHROMIUM_EXECUTABLE` if needed. See [VALIDATION.md](VALIDATION.md).

Salesforce Block SDK and JSZip licences are included in `vendor`. The SDK is unmodified.

## Client toolbar controls

In a formatted-text field’s Set up tab, expand **Client toolbar controls**. Untick any controls to hide them in the client preview and exported SFMC editor. Each field, including rich-text fields within repeating items, has its own settings. Existing projects default to all controls enabled. The Starting content editor retains all authoring controls so the developer can set preformatted defaults. Existing content is preserved. Disabled formatting shortcuts and corresponding browser input commands are blocked; pasted text remains plain text. These settings control editing tools, not immutable content: clients can still edit or delete text. Save field commits the choices; Cancel discards them. Re-export modules to update published editors.

## Reorder fields

Drag the six-dot handle on the left of a field to place it before or after another field. A line marks the insertion point. Keyboard users can focus the handle and press Up/Down, or Home/End. The order is saved with the project and used by the client editor and exports. Use the Edit button beside each field name to change its settings.

### Editor colours
In Try the editor, open Editor colours to set per-module accent, form background, text/borders and field background colours. The live form previews the exported styling. Settings are saved in projects and copied with modules. Reset restores Jarrang styling. Text contrast below 4.5:1 blocks export. These settings style only the custom block form, not the SFMC application or email output.
