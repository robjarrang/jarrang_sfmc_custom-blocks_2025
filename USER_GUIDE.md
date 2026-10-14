# Jarrang Block Studio: internal user guide

For Jarrang colleagues creating and maintaining SFMC custom blocks. Reviewed against Studio 1.26.0 on 14 October 2026.

Studio turns one coded email module into one draggable SFMC block. You choose the content clients can edit, test their controls and save the files into your local repository. Tower commits and pushes those files; GitHub Pages hosts them.

You do not need to understand the code to adjust an existing field's label, starting content or controls. Importing unfamiliar HTML, changing layout rules and repairing markup may need a developer.

## Find your task

- [Open the current files](#open-the-current-files)
- [Create a custom block](#create-a-custom-block)
- [Fix an existing block's HTML or CSS](#fix-an-existing-blocks-html-or-css)
- [Add or change editable fields](#add-or-change-editable-fields)
- [Make content optional or repeatable](#make-content-optional-or-repeatable)
- [Style the client editor and block icon](#style-the-client-editor-and-block-icon)
- [Test, save and publish](#test-save-and-publish)
- [Recover a mistake](#recover-a-mistake)
- [Resolve a problem](#resolve-a-problem)

For implementation, build commands and release maintenance, see the [technical guide](DEVELOPER_GUIDE.md). ESC maintainers should also read the [ESC handover](ESC-MAINTENANCE.md).

## Open the current files

You need a local checkout in Tower and a desktop browser with folder write access, such as Chrome or Edge. The repository contains `block-studio/`, `projects/` and `docs/`. For initial hosting setup, use the [Tower setup guide](block-studio/TOWER-WORKFLOW.md).

1. Pull the latest changes in Tower before editing.
2. Open the team's hosted Studio at the Pages site URL followed by `/studio/`, or open `block-studio/Open-Block-Studio.html` locally.
3. Choose **Open repository** in the top bar and select the repository root. Allow folder access. If the folder is remembered, choose **Reconnect**.
4. Use **Clients & templates** to choose the client and template, then select a module in the sidebar.

**Result:** Studio loads the editable projects and checks their saved module pages. The bundled templates are a starting snapshot, so always open the repository when continuing someone else's work. After a later Tower pull, use **Reload repository** before editing again. If asked to replace a different browser draft, keep a backup first if you still need it.

For an optional introduction, choose **Take a tour**, then **Create a new block** or **Fix HTML or CSS**. The tour only starts when requested. Exit it before using the highlighted controls.

### Know what is saved

| What you see or do | What it means |
| --- | --- |
| Browser draft | Recovery copy in this browser. It is not a repository save or a shared team copy. |
| An unapplied HTML & CSS edit | Pending code change. Apply or discard it before saving. It is not recovered after a page reload. |
| Test values | Temporary examples of client input. They do not change starting content or saved files. |
| Save field / Apply changes / Save template settings | Accepts that edit into the Studio draft. You still need to save to the repository. |
| Save | Writes this module's generated files and the complete editable template project locally. Other module drafts may be in that project, but their generated pages are not updated. |
| Save template | Writes every module in the active template. Use this for shared editor styling changes. |
| Commit and push in Tower | Sends the saved repository changes to GitHub. Pages then deploys the hosting files. |

## Create a custom block

1. Choose the intended template. For a new suite, use **Clients & templates → + New template** and enter the client and template names.
2. Choose **+ New module**. Paste or upload one email module's HTML fragment, then choose **Find editable content**. Use the module only, not an entire email with `<html>`, `<head>` and `<body>`.
3. In **Fields**, review the suggested controls. Give them names the client will recognise, such as “Heading” or “Button link”. Check starting content and remove controls the client does not need.
4. Use **+ Add field** for additional controls. Follow the tasks below for colours, dropdowns, optional sections and repeated items.
5. In **Test**, try the controls with realistic content and check Desktop and Mobile. **Generated HTML** shows the resulting email code.
6. Open **Module settings** to check the name, publishing folder, version and icon. Set the folder carefully before its first publication: it forms part of the SFMC endpoint.
7. Choose **Save**, then follow [Test, save and publish](#test-save-and-publish).

**Result:** one standalone block editor, its icons and the editable project are saved into the existing repository. There is no separate folder to move when direct saving is available.

A Studio template is a collection of modules. It does not assemble or replace the client's email master template. Template names can be changed without changing their assigned publishing folders.

## Fix an existing block's HTML or CSS

Use this route for a spacing error, surrounding markup repair or a small CSS correction.

1. Open the current repository and select the existing module.
2. Choose **HTML & CSS**. Edit the source in that view; there is no separate code popup.
3. Use **Desktop** or **Mobile** to inspect the result. Code views use the full panel; switching views keeps your pending edit.
4. Choose **Apply changes**. Use **Discard changes** if you do not want the fix.
5. Try the affected controls in **Test**, then **Save** and review the diff in Tower.

This route preserves fields and their connections. Connected values, template expressions and AMPscript are protected. To change starting copy, use the field's **Edit** button instead. For an intentional logic change, use **Fields → More tools → Advanced template logic** with developer review; applying template code can rebuild field mappings.

Keep the existing module identity and folder for a compatible maintenance fix. Updating its hosted editor does not rewrite HTML already saved inside every SFMC email. Test an existing block instance after reopening it, as well as a newly dragged block.

### Navigate the code

Click an opening or closing tag to highlight its partner; use **Matching tag** to jump to it. **Find**, or Cmd/Ctrl+F when the editor has focus, searches the source. The line-number **Go** control jumps to a location. Underlined source identifies connected fields; loop boundaries identify repeating sections. Expand folded code before editing or selecting it for a field.

## Add or change editable fields

Choose **+ Add field**, choose what the client should change and select a suggested location. Search by visible text or a value such as a hex colour. Selecting an already connected location opens its existing field.

For an existing control, select highlighted content in the visual preview or connected source in HTML view to find it, then choose **Edit** beside its name. You can always use the field list directly.

| Field editor tab | Use it for |
| --- | --- |
| Set up | Label, control type and starting content. Expand **Guidance and limits** for help text and restrictions. |
| Where it applies | Check which locations change together. Existing conditional behaviour appears under **Layout rules**. |
| Advanced | Template keys and other developer settings. Usually leave these unchanged on an existing block. |

The **What your client sees** panel lets you try the proposed control. Its trial values do not become starting content. Choose **Save field** to accept your changes, or Cancel to leave the field unchanged.

To reorder fields, drag the six-dot handle on the left. With the handle focused, use Up/Down or Home/End. Select a field to reveal **Remove**, then confirm. Removing a mapped control retains its source markup; a referenced template control needs its references removed or replaced too.

### Colour and dropdown examples

For a background colour, choose **Colour**, select the colour value and set its starting hex value. In **Where it applies**, connect any other locations that must change with it, such as the corresponding HTML background attribute. Identical colours may serve different purposes: do not link them indiscriminately.

For a dropdown, choose **Dropdown** and select the value to replace. Give each option a client-facing label and the actual value to insert. For example, “Left aligned” can insert `left`. Choose the starting option with its radio button. To switch whole layouts, use an existing **Layout rules** condition or ask a developer to connect the control in template code.

### Formatted text

Select words before using bold, italic, underline, superscript, subscript or text colour. Select text to add a link; place the cursor in an existing link to edit it. Bulleted/numbered list and marker controls are also available. Pasted text is treated as plain text.

In the field settings:

- **Client toolbar controls** enables or hides individual tools, including adding/removing links and bold formatting.
- **Link appearance · locked for clients** sets link colour, underline and weight. These settings apply to links in that field and are not offered to the SFMC user.

Hiding a toolbar tool does not automatically strip existing formatting. A field already inside a button or link cannot add a nested link; edit the separate destination field. Keep list tools off for fields inside headings or links. Use **Test** to check the final permitted toolbar.

### Conversion tracking

For a Link field, expand **Conversion tracking** in **Set up** and enable **Allow clients to mark conversion links**. Leave **Enabled for new links by default** unchecked unless tracking should start on. The setting also works for repeating item links and links created in Formatted text. Save the field, test the checkbox in **Test**, then save the module.

The SFMC user sees **Conversion Tracking Link** beside the destination, or inside the formatted-text link dialogue. It applies to web links and inserts `conversion="true"` into the rendered anchor. Mail, telephone and in-email anchor links do not use it. Both ESC suites expose the option and start unchecked.

For a published module update, deploy through Tower as usual and check an existing saved instance as well as a new block. The checkbox marks the email link; ESC's website conversion tracking must also remain in place. A real test send and conversion are needed to verify the complete journey.

Plain-text starting values use actual characters, such as `–`, rather than entity notation such as `&ndash;`.

## Make content optional or repeatable

### Show or hide a section

Choose **+ Add field → Optional section**, select the complete title, button or section, and name the control, for example “Show button”. Choose whether it starts visible and save the field. Hiding removes that markup from the output. Check both states, including any separate Outlook fallback markup.

### Repeat an item

1. Choose **+ Add field → Repeating items**, or select a field and use **More tools → Make selected field repeating**. In HTML view, you can also choose the item through the repeat action without dragging an exact tag-to-tag selection.
2. Choose the complete item boundary. Review the highlighted item and its HTML before continuing.
3. Check its item fields, starting items and minimum/maximum counts, then save the group.
4. In **Test**, add, remove and reorder items. Check the smallest and largest supported lists.

Only the selected item becomes repeatable. Existing siblings stay outside the group. Build the other starting items in the list control rather than expecting all siblings to be merged automatically.

To return to one item, edit the group and choose **Set up → Content behaviour → Single item**. Choose the starting item to retain, review removal of the others and choose **Save as single item**. Its child fields remain editable. A previously single item can be made repeatable again when its connections are supported.

Some structures cannot be converted automatically, such as connections shared outside the selected item or unsupported nested logic. Read the specific explanation and ask a developer to review [template syntax](block-studio/TEMPLATE-SYNTAX.md). A repeating list supplies repeated content; it does not create carousel behaviour or email-client fallbacks.

Changing an already published list to ordinary fields changes its saved-data structure. Use a duplicated module and a new endpoint for that change.

## Style the client editor and block icon

For the whole suite, open **Template settings → Editor appearance for all modules**. Set custom colours and turn **Show Jarrang Block Studio header** on or off. Choose **Save template settings**, then **Save template** to update every generated editor. Both ESC templates currently have the header disabled.

These colours style the SFMC block's editing form, not the email content. Resolve any contrast warning before saving the generated editors.

For a module's icon, open **Module settings → Custom block icon**. Choose a background and a bundled symbol, or **Keep supplied PNGs** for existing artwork. Saving includes both `icon.png` and `dragIcon.png`; there is no manual image conversion step. Keep ESC's supplied icons unless changing them intentionally.

## Test, save and publish

1. In **Test**, exercise the controls you changed. Check realistic long/short copy, links and images, relevant choices, hidden sections and repeating item counts. Check Desktop and Mobile. Use starting-content fields, not Test, for permanent default changes.
2. Resolve pending code edits, then choose **Save** or **Save template**. If saving is blocked, follow the named field/source issue. A saved browser draft alone is not enough.
3. In Tower, review the changed project and generated files. For a module fix, expect its page and project to change, with supporting catalogue/notes/assets where needed. Investigate unexpected deletions or changes to another client.
4. Commit and push to the existing Pages publishing branch. Wait for deployment and open the module URL from **Module settings → Copy module URL**.
5. For a new module, have the SFMC administrator register that endpoint as a custom content block in Installed Packages. Existing compatible modules keep their endpoint.
6. In SFMC, test a newly inserted block and an existing saved instance: edit, close/reopen and check the resulting email. Use subscriber preview/test sends and the team's required email-client checks.

Studio previews do not execute AMPscript or reproduce Outlook. Testing a module in the actual master template is essential for CSS, personalisation and dark-mode behaviour. See the [ESC handover](ESC-MAINTENANCE.md) for its specific dependencies.

### If direct saving is unavailable

Use **Clients & templates → Manage templates** to download an editable project or publishing ZIP. A project JSON alone is not a deployable block. Extract a publishing ZIP outside the repository and merge its files into matching `docs/` and `projects/` paths. Do not replace whole top-level folders in Finder: other clients and older runtimes must remain. Then review, commit and push in Tower as above.

## Recover a mistake

Use **Undo/Redo** for module edits in the current session. For the previous generated content, choose **Module actions → Restore last exported content…**, review the changes and restore. “Exported” here means the last generated save/package reference, not confirmation of a deployment. The restoration can be undone in the same session.

Module recovery restores content and field settings, keeps current icons and shared template styling, and clears temporary Test values. It does not recover whole deleted modules/templates or template settings. Session undo history clears on reload. Keep an editable-project backup before a large structural change.

For a deployed mistake, use Tower to revert the relevant change, including its matching project and generated files, then push. Reopen the repository in Studio afterwards. Reverting hosting files does not restore content already saved in individual SFMC emails.

## Resolve a problem

| Problem | Next step |
| --- | --- |
| Studio has old content after a pull | Use **Reload repository**. Keep a backup of any browser draft before replacing it. |
| “Files changed outside Studio” | Preserve your draft with **Download editable project**, compare changes in Tower, reopen the repository and reconcile against the latest files. Do not force an overwrite. |
| Folder access is unavailable | Try **Reconnect** and grant access. If unsupported, use the ZIP route above. |
| A repository save fails | Inspect the error and Tower diff. Studio attempts rollback, but interruption can leave partial files. Resolve/restore those files, then reopen the repository before saving again. |
| An HTML edit is rejected | Edit starting values through the field; make smaller surrounding-code changes. Use a developer for intentional template logic changes. |
| A field change is incompatible | Keep the original for existing SFMC content. Use **Module actions → Duplicate**, a new folder and release for the changed structure. |
| A new default is absent in an existing email | Saved SFMC values are retained. Compare a new instance and edit the existing instance's content deliberately. |
| Layout differs from the real email | Check the master template and test in SFMC. Preview-only context CSS is not included in email output. |
| The published editor looks unchanged | Check the Tower push, Pages deployment and correct endpoint, then reload the editor. Updating Studio alone does not update saved module pages. |

When asking for help, include the client/template, module name, action, exact error and whether the problem is in Studio, the hosted editor or SFMC. Include a screenshot and a minimal example without subscriber data or credentials.
