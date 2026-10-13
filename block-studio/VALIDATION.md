# Current validation - 1.25.4

Applied the supplied ESC-hosted landscape placeholder to 19 populated image defaults across 14 modules: Newsletter Hero Story, Story Card 1/2/3 Col, Feature Card, Image Banner, Social Block, Video Embed, Webinar Card and Editorials; Congress Lead Editorial, Lead Poster and Story 1/2 Col. The JPEG was retrieved and inspected as 1920 × 1080px, 32,536 bytes. The external URL is used directly. Logos, speaker portraits and journal covers retain their existing defaults. Empty optional editorial images and the congress mobile override remain empty, preserving their existing behaviour.

All 228 automated tests pass with no failures or skips. The new regression checks mapped source URLs, field defaults, the populated editorial row, blank optional images and the lead's mobile fallback. The punctuation regressions from 1.25.3 continue to pass. Layout markup apart from image URLs, AMPscript, module identities, field types/keys, supplied icons and shared runtimes are unchanged. Mapped ranges are rebased with the existing core helper. Generated pages, export references, editable projects and bundled Studio snapshots are consistent. Hosted and standalone Studio builds match. No deployment was performed.

These are starting values: previously saved SFMC images and browser drafts are not overwritten automatically. Open the updated repository to refresh Studio's project data. This verification does not substitute for live email-client rendering.

---

# Current validation - 1.25.3

Corrected HTML entities stored as plain text in six ESC modules: Congress Deadlines List, Lead Editorial and Lead Poster; Newsletter Journal Section, Quote and Social Block. Seven field definitions, three starting repeater-row values and affected field guidance now contain actual Unicode punctuation. Source-mapped defaults that already rendered correctly are also corrected so opening, editing and saving them does not introduce double escaping. Legitimate entities in HTML source and rich-text fields are unchanged. The six generated module pages, their published/exported definitions, both projects and bundled Studio projects are updated together.

All 227 automated tests pass with no failures or skips. New regressions check every ESC plain-text default, original value, repeater row and guidance string; rendered text across all 40 modules; punctuation after edits and adding rows; and continued escaping of literal entity text, ampersands and HTML input. All module source/draft HTML, AMPscript, IDs, field types, target ranges, icons and shared runtime files remain unchanged. Hosted and standalone Studio builds match. No deployment was performed.

This is a correction to supplied field data, not automatic decoding of end-user input. Existing SFMC instances retain their saved values. Correct any previously saved entity strings in those instances once; reopening alone does not replace saved values with new defaults. Reload the updated repository in Studio to replace its previous bundled/browser project data.

---

# Current validation - 1.25.2

Revised Congress Lead Editorial following visual feedback on 1.25.1. The desktop header returns to a shared two-column row: 320px for content, 300px for the visual, with a 274px image frame and a 26px outside gutter. The visual is vertically centred beside the copy in the same AMPscript-driven primary-colour panel. The original type hierarchy is retained, with 8px image rounding consistent with the suite's cards. Image height remains automatic; a 1920 × 1080px asset displays at approximately 274 × 154px. Mobile continues to use the supplied master template's stacking, full-width table and image-switching rules. The optional mobile override from 1.25.1 is retained.

All 224 automated tests pass with no failures or skips. The layout regression now checks the shared desktop row, explicit image/frame widths, vertical alignment, unconstrained height and mobile-expandable frame. Saved values, escaping, field editing, export and recovery checks continue to pass. Compared with 1.25.1, only this module and its project/export references change; the other 39 modules, icons, AMPscript tokens and shared runtimes remain unchanged. Hosted and standalone Studio builds match. No deployment was performed.

These checks validate code structure and behaviour, not visual appearance in live email clients. SFMC, Outlook, mobile image switching and dark-mode rendering still need a live proof against the supplied master template. Clients without border-radius support retain square image corners.

---

# Current validation - 1.25.1

ESC landscape image maintenance: Congress Lead Editorial now uses separate content/image rows, a 620px-wide proportional visual and an optional mobile override with main-image/alt fallback. Newsletter Story Card 2 Col and Story Card 3 Col retain their existing layouts but no longer force image height attributes. The supplied master template, all module identities, field IDs/types, AMPscript tokens, icon pairs, shared runtimes and other 37 modules are unchanged. The three intended pages and both project snapshots have been re-exported consistently; no deployment was performed.

All 224 automated tests pass with no failures or skips. Three new regressions cover row structure and image constraints, optional/mobile saved-value handling and escaped URLs/alt text through the exported definition, and proportional sizing in every newsletter card variant. All 237 existing/new conditional expressions have a supported guided editor model. The full suite also covers field editor round-trips, source validation, template exports, recovery, supplied icons and repository saves. Runtime payload budgets are unchanged. Hosted and standalone Studio builds match.

These are DOM and code-level checks, not email-client screenshots. The 620 × 349px size is calculated from the 16:9 source ratio. Live SFMC reopen/save, Outlook rendering, mobile image switching and dark mode still need verification in the supplied master template. Existing saved portrait images remain proportional and therefore make a taller header; clear a saved mobile override to reuse the main image. See ../ESC-MAINTENANCE.md for the update workflow and image guidance.

---

# Current validation - 1.25.0

Added a user-initiated guided tour in the top bar. It offers Create a new block (8 steps) and Fix HTML or CSS (5 steps), with contextual highlights, step counts, Next, Back/Choose tour, Finish and Exit tour. Escape uses the native dialog close behaviour. It never starts automatically and writes no tour preferences or application data. No new dependencies were added; tour.js is authoring-only.

The walkthrough does not navigate, edit, analyse or save the underlying workspace. If a control is hidden at the current stage, it highlights a visible entry point or displays the location in a centred card. Positioning follows resize/scroll events and constrains the card to the viewport. Closing disconnects observers/listeners, cancels pending frames, restores moved scroll positions and returns focus to the tour button. Long cards can scroll at small window sizes; there is no tour animation.

All 221 automated tests pass, with no failures or skips. Seven new regressions cover opt-in startup and replay, both complete routes, Back/route changes, exit cleanup and focus return, hidden targets, narrow-screen positioning, pending callback cancellation, modal/busy-state guards, preservation of pending HTML and selection, unchanged preview documents and browser drafts, first-time setup, and temporary test values without remounting controls. Syntax, changed-file formatting and runtime budgets pass. Hosted and standalone Studio builds match. All 154 published/project files and export-assets.js remain byte-identical to v1.24.1. No modules were re-exported or deployed.

The tests use DOM/events and supplied geometry. Live browser positioning, native Tab/Escape handling, screen-reader announcements and zoom remain to be checked; these results are not a browser accessibility audit. Native dialog behaviour follows W3C guidance: https://www.w3.org/WAI/WCAG22/Techniques/html/H102 (accessed 13 October 2026).

---

# Current validation - 1.24.1

Completed a risk-prioritised code and regression sweep. Seven reproduced defects are fixed: save-time Undo races, rollback overwriting external empty edits/deletions, draft publishing-identity edits bypassing or blocking repository verification, missing published pages accepted silently, masked browser-draft save failures, misdirected compatibility-error actions and obsolete review flags producing false unsaved status. Root causes and individual regressions are recorded in ../BUG-FIX-CHECKLIST.md.

All 214 automated tests pass, with no failures or skips. The independent ESC audit passes all 6,728 cases across 40 modules, including 6,119 conditional combinations, 492 edited cases, 275 field-editor saves and 2,326 unique structure checks. Syntax, changed-file formatting and runtime-size checks pass. Standalone and hosted builds match at v1.24.1. All 154 published/project files and export-assets.js remain byte-identical to v1.24.0; runtime code and dependencies are unchanged. Audit-generated modules were temporary test output only, not published replacements.

Tests use DOM/event and filesystem simulations. Native browser layout, folder permissions/concurrent operating-system writes, SFMC and email-client rendering still require live checks. No deployment was performed. A passing sweep is evidence for the covered cases, not a guarantee of zero remaining defects.

---

# Current validation - 1.24.0

Removed the Before you save checklist and manual acknowledgement gate. Valid modules and applied HTML/CSS fixes save directly from the header. Automatic source, field, template, theme, identity and compatibility checks still block invalid output before repository writes. Blocking issues appear only after an attempted save, with shortcuts to relevant editors/settings. Source dependencies remain in the collapsed Source checks disclosure. The former Save tab is now Module settings, containing folder, version, endpoint and icon controls. Legacy review flags remain readable but are not save requirements or proof of review.

All 208 automated tests pass, including a repository-save integration regression for invalid-version blocking, correction, direct saving without review flags, an applied CSS fix and write-failure reference preservation. Standalone and hosted Studio builds match. All 154 published/project files and export-assets.js remain byte-identical to v1.23.3. No modules were re-exported or deployed. Checks use DOM/event simulations; live-browser layout and SFMC verification remain outstanding.

---

# Current validation - 1.23.3

Removed the redundant "Selected … Choose Edit to change its settings" notice from both visual-preview and HTML-code field selection. Existing field highlights, list selection/reveal and focus behaviour remain in place. Error and protected-content notices remain unchanged. Selecting a field no longer creates a notice that reduces preview height.

All 207 automated tests pass. Formatting and the rebuilt standalone pass; standalone and hosted builds match. Published ESC files, projects and export runtime assets remain unchanged. No deployment or module re-export was performed.

---

# Current validation - 1.23.2

The module title, task navigation and actions now share a wrapping toolbar. The title uses 22px text with ellipsis and its complete name in the accessible text and native title tooltip. Task buttons retain their labels and active state. Undo/Redo, review status and Module actions remain available. New-module conversion steps retain their own full-width row. DOM order follows the displayed title, tasks and actions.

207 automated tests pass. The existing compact-UI regression now checks the shared toolbar structure, control order, wrapping and title size. Standalone and hosted builds match. All 154 published/project files and export-assets.js remain unchanged. DOM/CSS simulations do not verify actual browser geometry or painting; live-browser visual verification remains outstanding. No module re-export or deployment was performed.

---

# Current validation - 1.23.1

207 automated tests pass. The supplied v1.23.0 screenshot showed too little preview space: full-size iframe content exceeded the panel width while expanded dependencies and stacked controls consumed much of the height. Desktop headers/navigation/caption spacing is reduced, the redundant workspace footer is hidden, and source dependencies now use a collapsed native disclosure. The warning content remains available in the disclosure and export review.

A Fit module / 100% control scales the iframe visually inside a matching clipped wrapper, retaining its original desktop/mobile layout width. Desktop fit uses both available dimensions; unbounded narrow/short layouts fit width only. No module or exported HTML is scaled or rewritten. Resizing updates the preview scale without replacing its document. Source view hides the zoom control.

The sandbox bridge now measures and observes the content shell instead of the document viewport. This avoids retaining the previous tall iframe height when a module or test values become shorter. The old artificial 360px minimum and 3000px truncation are removed from this preview. The four new tests cover fit calculations, growing/shrinking content, scale/view switching without iframe reload and compact/collapsed UI styles.

Tests are DOM/CSS and event simulations. Live-browser painting, actual pointer hit-testing through the scaled iframe, zoom/resizing and SFMC remain unverified. All 154 published/project files and export-assets.js remain byte-identical to v1.23.0. Nothing has been deployed or re-exported. Standalone and hosted Studio builds match and display v1.23.1.

---

# Current validation - 1.23.0

203 automated tests pass, with no failures or skips. At desktop viewports wider than 900 CSS pixels and at least 700 CSS pixels tall, the application uses the available window height. Module lists, editable fields, test controls, email preview and source editor scroll within their own panels. Headings, navigation and primary actions remain outside the scrolling content. Import and Save screens scroll inside the workspace. Narrow or short windows retain document scrolling; narrow screens stack navigation above the workspace.

List rebuilding preserves scroll position; module navigation preserves keyboard focus. Selecting a field through the preview reveals it inside the field list without scrolling the page or replacing the preview. Keyboard reordering retains focus, and native drag handles add bounded edge scrolling that stops on leaving, dropping or cancellation. Scroll regions have accessible names and keyboard focus. Expanded advanced actions and long source warnings are separately bounded.

Four added regressions cover the desktop CSS cascade, narrow/short viewport fallback, list position/focus preservation and drag edge scrolling/cleanup. Existing preview, code-editor, ESC output and repository-save regressions pass. Checks use DOM/CSS simulations, not live browser layout or native pointer events. Live browser verification of window resizing, zoom, trackpad/keyboard scrolling and drag reordering remains outstanding. No SFMC modules were re-exported or deployed.

All 154 published and project files, plus export-assets.js, remain byte-identical to v1.22.2. The runtime payloads are unchanged. The standalone and hosted Studio builds match and display v1.23.0.

---

# Current validation - 1.21.2

188 automated tests pass, with no failures or skips. The reported long-sidebar gap was caused by vertical auto margins on the main grid item. Main now uses `margin: 0 auto` and `align-self: start`, so a tall module list cannot vertically centre it. CSS cascade checks cover narrow, medium and wide viewport settings with a 40-module sidebar.

The supplied screenshot shows v1.20.0. Its radio controls inherited width:100% and text-input padding from a more specific generic selector. The existing compact-radio fix is retained. New checks load the actual standalone artifact, verify its radio dimensions/grid alignment and workspace margins, and ensure it matches the hosted Studio byte-for-byte.

These are CSS/DOM simulation checks, not browser layout/painting measurements. Live-browser verification remains outstanding. Generated runtime assets and all 149 existing published files outside `docs/studio` are unchanged. No module re-export or deployment was performed. The download is versioned to distinguish it from older local copies; the visible badge must read v1.21.2.

---

# Current validation - 1.21.1

186 automated tests pass, with no failures or skips. Added regression coverage confirms that typing in HTML does not generate a hidden preview, opening Desktop validates pending code, invalid code stays unapplied, recovery availability avoids icon/export metadata, and unchanged workspace saves avoid writes without bypassing stale-tab detection.

Syntax, formatting (including the HTML entry point), runtime payload budgets and the rebuilt standalone pass. The reformatted build produces byte-identical export assets, brand styles and bundled repository definitions. The standard/rich runtimes remain 60,808/80,415 raw bytes and shared runtime CSS remains 9,760 bytes. The 149 original published files outside `docs/studio` remain unchanged.

The independent ESC audit passes 6,728 output cases against the supplied runtime, repeated after 275 field-editor saves. All 40 modules and their supplied PNGs pass. See CODE-REVIEW.md for measured processing improvements, current guidance and deliberate trade-offs.

A fresh offline npm install was attempted separately but could not complete because `ws-8.22.0.tgz` was absent from the local package cache. Existing installed dependencies passed the suite. Live browser performance/layout, SFMC and email-client validation remain outstanding. No deployment was performed.

---

# Current validation - 1.21.0

182 automated tests pass, with no failures or skips. The 15 added regressions cover atomic source/field recovery, repeat conversion, removal/reordering, module isolation, typing boundaries, history limits, export-reference preservation, recovery confirmation/cancellation, pending-code guards, native editing shortcuts, failed local saves and initial setup navigation.

All 40 ESC modules preserve exact default output, field definitions, export references and supplied PNGs through Undo/Redo and last-exported content restoration. The independent original-runtime audit again passes 6,728 output comparisons, including 6,119 conditional combinations, repeated after 275 field-editor saves. All 149 original published files outside `docs/studio` remain byte-identical.

Source syntax, formatting and the standalone build pass. The new history module is authoring-only and is excluded from exported SFMC runtimes. DOM/SDK simulations do not verify real-browser focus, keyboard behaviour or layout. Live browser and SFMC checks remain outstanding; nothing has been deployed.

Before release, check in a desktop browser: remove/undo/redo a field; undo a repeating conversion; apply and undo an HTML fix; switch modules; type and use native undo; review/cancel/restore last-exported content; reload and restore the saved export reference. Confirm the two-column recovery comparison stacks at narrow widths and remains usable at 200% zoom.

---

# Current validation - 1.20.1

An independent ESC round-trip audit also passes: 40 original definitions, 80 original PNGs and 6,728 exact rendered-output comparisons, repeated after 275 field-editor saves. Both template exports reopen successfully. Full results, coverage and the repeatable command are in ../ESC-COMPATIBILITY.md.

167 automated tests pass, with 0 failures and 0 skips. Source syntax, formatting and the standalone build pass. All 149 original published files outside docs/studio remain byte-identical to the supplied ZIP.

Three new CSS cascade regressions cover compact radio controls through the complete stylesheet order at 320/552/1024px viewport settings, the template-colour sample height and the New module action at narrow widths. See ../BUG-FIX-CHECKLIST.md for the completed UI refinement sweep.

Tests use happy-dom, which does not perform browser layout or painting. Real-browser checks of wrapping, zoom, focus appearance and rich-text controls remain outstanding. No live SFMC verification or deployment was performed. Shared control styling fixes reach hosted blocks after an explicit re-export; old runtime folders remain intact.

---

# Current validation - 1.20.0

164 automated tests pass, with 0 failures and 0 skips. Source syntax, formatting and the standalone build pass. All 149 existing published files outside docs/studio remain byte-identical to the supplied ZIP.

The regression suite now covers malformed rendered HTML, Outlook conditional tag structure, export references during asynchronous downloads, partial exports with newer drafts, bidirectional text/rich-text conversion, scoped item-key renames, failed-save locking and repeater focus. See ../BUG-FIX-CHECKLIST.md for the impact-ordered results.

HTML validation checks representative rendered states, including individual toggle/dropdown choices and repeat boundaries. It is not a complete HTML conformance checker, an exhaustive combination search or an email-client emulator. Existing published module pages, PNGs and shared runtimes are retained. Runtime fixes require an explicit module re-export.

Live browser and SFMC verification remain outstanding. Tests simulate DOM and SDK behaviour; they do not establish real contenteditable selection, browser layout or saved-instance behaviour in SFMC.

---

# Current validation - 1.19.0

150 automated tests passed for 1.19.0 (137 in the uploaded baseline plus 13 ESC integration checks). The ESC checks cover all 40 definitions against exported pages, PNG byte preservation, defaults, every dropdown option, both toggle states, repeat limits, small HTML fixes, all-branch reference checks, repository import/drift rejection, and standalone UI startup using happy-dom. Both full-template ZIP exports are opened and verified.

The new tests use a DOM implementation in Node, not a live browser. Visual layout, contenteditable selection/caret behaviour, SFMC install/edit/reopen and email-client rendering remain live verification tasks. The supplied master-template AMPscript is preserved, not executed in Studio. No block endpoint has been deployed or re-registered.

---

# Current validation - 1.17.0

122 automated tests pass. Added coverage for bundled paths, foreground contrast, invalid selection fallback, preservation of legacy icons, dimensions passed to the PNG canvas, package filenames and icon settings round-trip. UI simulation verifies selection and colour updates. Canvas tests use a recording stub, not a browser rasteriser; live browser PNG rendering and SFMC appearance remain outstanding.

---

# Current validation - 1.16.0

118 automated tests pass. Updated task-routing coverage checks the consolidated navigation, active task state, code-only view, removed duplicate controls and apply-then-export flow. Existing coverage confirms preserved test values, retained code drafts, export guards and single-load previews. Browser regression selectors updated. Live browser usability, responsive layout and SFMC verification remain outstanding.

---

# Current validation - 1.15.1

118 automated tests pass. The existing view-switch regression verifies that HTML hides the preview, Desktop restores it and navigation does not reload the iframe. Live browser verification remains outstanding.

---

# Current validation - 1.15.0

118 automated tests pass. Adapted popup tests to inline editing; retained transactional edit, discard, protected-field, replace-all and unload-warning coverage. Added a module-switch regression confirming retained drafts, shared editor identity, blocked downloads and applying only the intended module. The HTML structure and source syntax were checked and the standalone build regenerated. These are DOM simulations and structural checks, not live browser validation. Live browser and SFMC checks remain outstanding.

---

# Current validation - 1.14.0

117 automated tests pass. Added a task-routing regression covering existing-module navigation, distinct connection/output views, source editing, apply-and-review export and access to original import. Existing transactional edit, protected-field, cancellation and export tests pass. Live browser usability and SFMC checks remain outstanding.

---

# Current validation - 1.13.0

116 automated tests pass, including staged template-colour settings, inheritance by new modules, legacy fallback, reset behaviour, and shared colours in each generated module form and editable project JSON. Syntax and generated build pass. Live browser and SFMC verification remain outstanding.

---

# Current validation - 1.12.2

113 automated tests pass. Six added regressions cover repeated single/repeating conversions, shared references, mixed mappings, disabled fields, template filters and preview loop scope. Source syntax and generated builds pass. Live browser and SFMC checks remain outstanding.

---

# Current validation - 1.12.1

107 automated tests pass. The standalone conversion dialog has been removed. A field-editor regression verifies staged content behaviour and confirmation before discarding rows. Existing conversion tests cover retained values/settings and blocked custom logic. Browser and SFMC verification remain outstanding.

---

# Current validation - 1.12.0

107 automated tests pass. Seven new checks cover single-item conversion, chosen-row defaults, empty groups, blocked custom logic, cancellation, retained rich-text settings, rebased mappings and removal of loop-empty branches. Browser and SFMC verification remain outstanding.

---

# Current validation - 1.11.1

100 automated tests pass. Added checks cover Advanced-panel state, modal ZIP-export blocking, complete enclosing boundaries for cursor/partial selections and CRLF cursor offsets from the HTML toolbar. Syntax checks and standalone build pass. The reported Advanced-tab download has not been reproduced in a live browser; the export guard is defensive. Browser and SFMC verification remain outstanding.

---

# Current validation - 1.11.0

96 automated tests pass, including four new guided-repeat checks for boundary candidates, quoted HTML attributes, cancellation, sibling acknowledgement and source preservation. JavaScript syntax and the standalone build pass. Tests use DOM simulations; live browser usability and SFMC checks remain outstanding because local browser access was denied by security policy.

---

# Remediation validation - 1.9.5

The hand-written sources have consistent formatting. Run `npm run format:check`, `npm test`, and `npm run build` for the repeatable checks. The current browser suite is tests/browser-regressions.cjs, run separately with `npm run test:browser` and Playwright installed or supplied through PLAYWRIGHT_MODULE. It has not been executed in this environment because local browser access was denied by security policy. Historical browser results below are not validation of the present version.

---

# Current validation - 1.9.4

Run `python3 build.py`, then `node scripts/validate.cjs` from the repository root. The latter checks all source JavaScript syntax and runs 87 automated tests across engine, export, runtime and DOM simulation suites. It deliberately excludes the four historical Playwright suites.

The historical browser results below do not validate the current UI. Those suites need updating before being treated as a release gate. Live browser checks for code-editor hit testing, preview resizing/visibility, focus and scroll retention, plus real SFMC integration checks, remain outstanding.

---

# Validation of Block Studio 1.5

Date: 16 September 2026

## Version 1.5 branding checks

The 22 engine tests were rerun and pass. Static package checks verify root and `/docs` exports include the shared branding stylesheet, both embedded fonts, wordmark, module editor and catalogue links, and `.nojekyll`. Downloaded font files have WOFF2 signatures. The standalone build contains no external stylesheet or script dependencies.

The live Jarrang website was visually reviewed. Browser security blocked the local app preview, so visual and interactive browser checks were not repeated for this branding release. The browser results below are from version 1.4, before these styling changes.

## Previous functional validation (1.4)

22 automated engine tests pass, covering original source preservation, URL and attribute handling, linked Outlook values, source-range validation, manual scalar fields, whole-section toggles, nested editable fields, CSS colour mapping, dropdown membership, repeat-selection conversion, conditional branches, repeated items, empty lists, nested scopes, escaping, AMPscript preservation and template error handling.

The original Chromium workflow passes against the standalone application: import, automatic discovery, preview selection, field editing, trial values, mobile preview width, `/docs` ZIP contents, defaults retained, project save/reopen and module duplication. Its simulated Content Builder host uses the unmodified Salesforce SDK and checks handshake, metadata, rapid edits, close-hook flushing, reopening and version rejection.

The additional Chromium workflow verifies manual CSS selection, linking a second location, changed defaults, dropdown labels and values, conditional title/CTA output, repeatable item creation and ordering, project persistence, root ZIP export and bundled logic/control dependencies. It also checks converting an existing mapped list item through Repeat selection and applying edited template code. The exported editor passes repeatable-item persistence, toggle persistence, dropdown-branch rendering and save/reopen checks against a simulated SDK parent.

The field UX suite checks the guided colour picker, linking matching locations without source selection, isolated client-preview values, dropdown labels/values and starting choice, optional CTA selection with nested editable fields, repeat conversion and starting items, cancellation without source changes, required-name errors, keyboard tab navigation, narrow viewport layout and project reopening.

The formatted-text browser suite checks superscript, word colour, adding/editing/removing selected-text links, invalid URL rejection, developer link-style configuration and client-side restrictions. It verifies sanitiser idempotence, removal of conflicting ancestor/child styles, rejection of executable markup, separate field policies in templates and repeatable items, bundled runtime dependencies, and link/content persistence after an exported editor's SDK save/reopen. Developer and client screenshots were visually inspected.

Desktop and narrow-screen screenshots of the revised field picker and editor were inspected. No page JavaScript errors occurred in the passing browser workflows. These are functional checks, not a usability study with inexperienced users.

## Still required before client use

No live SFMC installation, actual GitHub Pages deployment or email-client certification has been performed. The SDK simulation does not reproduce all Content Builder processing or lifecycle behaviour.

Verify installation, edit/close/reopen, duplication, rapid closure, tracking, subscriber preview and test sends in a controlled SFMC account. Review original module dependencies, Outlook fallbacks, empty/maximum item cases and both branches of every condition. Carousel behaviour and duplicated interactive IDs require specific email-client tests. Existing production-block schema migration remains outside this release.

## Preview selector fix, 17 September 2026

Desktop, Mobile and HTML now select mutually exclusive views with matching active styling and aria-pressed states in both preview panels. Selecting HTML again keeps the HTML view open. Source-selection shortcuts use the same state update. Focused state checks for repeated HTML selection and switching back to both preview sizes pass; JavaScript syntax and standalone build checks pass. This check exercised the state function with DOM stubs, not a browser visual review.

## Critical fixes, version 1.5.1

32 automated core, template and simulated-runtime tests pass. See BUGFIX-REVIEW.md for confirmed failures, fixes, test limits and instructions for applying runtime changes to existing exports.

## Rich-text toolbar, version 1.5.2

Text action buttons are replaced with nine inline SVG icons in four labelled groups. Accessible button names, tooltip titles and link restrictions are verified with a DOM-stub mount check. Existing selection handling and commands are unchanged. JavaScript syntax and standalone build pass. No browser visual review was performed for this update.

## Per-field toolbar controls, version 1.6.0

Six DOM-stub tests pass for default toolbar compatibility, each individual hidden control, combined exclusions, an empty toolbar, keyboard/beforeinput restrictions and surrounding-link restrictions. Syntax and build checks pass. Settings are stored on field definitions and included by the existing project/export serialization. No browser visual review was performed for this update.

## Preview selection fix, version 1.6.4

Nested clicks resolve to the closest annotated editable ancestor. Template previews are annotated on an isolated project clone and rendered with conditions/repeaters. Focused marker checks pass for nested content, conditionally omitted headings, repeated items and unchanged original source. Syntax/build checks pass. Browser interaction remains unverified. Preview mapping of arbitrary custom template expressions may require using the field list; hidden sections have no clickable output.

## 1.19.0 authoring support

The ESC suite now has 13 checks, including all 235 conditions represented by the guided rule model, all 275 controls opened/saved without output changes, all 11 lists converted to one item, transactional rule edits, typed boolean/numeric comparisons and child-field guidance/limits. These are DOM simulations, not live browser or SFMC checks.

## 1.21.3 hover contrast correction

The topbar secondary hover rule now explicitly retains navy text on its white background, preventing the general secondary hover rule from supplying white text. Header secondary/quiet and workspace primary/secondary/quiet/danger states are covered by a stylesheet cascade regression test using an equally specific hover attribute substitution. All 189 automated tests pass. These are happy-dom CSS checks, not live-browser hover or painting verification. Published module files remain unchanged.

## 1.21.4 unassigned draft removal

Unassigned browser drafts can be removed from Clients & templates with confirmation. Assigned templates are kept; the final template cannot be removed. Pending HTML changes block removal and storage is saved before changing the in-memory workspace. Cancellation and preservation of the assigned template are covered by DOM simulation. All 190 automated tests pass. The bundled projects remain ESC Newsletter (27 modules) and Congress (13 modules). Live-browser verification remains outstanding.

## 1.21.5 interface decluttering

Clients & templates now groups secondary actions under a native, initially collapsed Manage templates disclosure and explanatory text under Help. Template cards show module counts without repeated review/open status; aria-current and accessible names retain current-template context. Selected field rows retain their type and Remove action; detailed mapping remains in Where it applies. Repeated field-editor introductory text was removed. Existing Module actions, Undo/Redo, view switches and advanced field disclosures are retained. All 190 automated tests pass. Live-browser visual verification remains outstanding.

## 1.21.6 source editor decluttering

Source editing no longer repeats the instruction banner. Apply/Discard and a short live status share the preview header; controls wrap on smaller screens. Find and Make repeating remain visible, with line navigation, matching-tag navigation and Expand all in native Code tools disclosure. Read-only Test output retains its explanatory banner and source-edit action. Updated workspace regression expectations reflect the removed editing banner. All 190 tests pass; live-browser layout verification remains outstanding.

## 1.22.0 direct repository saving

Save writes the current module; Save template writes all active-template modules. Open repository loads editable projects and supplied PNG pairs through a user-granted directory handle. Reconnect remembers that handle where IndexedDB supports it, and Reload repository reads the current disk contents after Tower pulls. Recovery drafts remain separate from repository status. ZIP/project downloads are retained under Manage templates.

Repository saves prepare byte entries without ZIP compression, validate the existing field compatibility constraints, compare current disk contents against the opened snapshot, preserve unrelated files and old runtime assets, skip unchanged bytes and verify writes before updating the in-memory generated reference. Write failures attempt rollback; failed saves with attempted writes require reopening the repository. This is not an atomic multi-file filesystem transaction and cannot recover automatically from a browser crash.

198 automated tests pass. Eight new tests cover successful repeat saving, external edits/additions/deletions, denied permission, rollback of existing and new files, runtime collisions/path restrictions, concurrent saves, single-module catalogue generation, and connected UI Save success/failure including the new-module review path. Published module renaming now preserves its slug.

These tests use DOM and filesystem simulations. Live browser folder-picker permissions, IndexedDB handle persistence, actual disk writes, restart/crash behaviour, Tower and SFMC remain unverified. Use desktop Chrome/Edge for the direct-writing route; unsupported browsers retain read/import and ZIP fallback. Before rollout, exercise open → edit HTML → review → save → reload, denied permission, and a conflicting Tower pull against a disposable checkout.

## 1.22.1 help-text decluttering

Removed repeated import instructions, workspace eyebrow, markup reassurance, field-type descriptions after selection, connected-field summaries beside the preview and redundant save guidance. Labels now clarify Choose HTML file and Master-template CSS (preview only). Field preview retains validation errors without adding a success explanation on every change. Add-field cards retain their short type descriptions; disconnected-field warnings and conversion/compatibility warnings remain visible. Test-value scope is stated once in the workspace caption. First-time publishing instructions use a native collapsed disclosure.

All 198 automated tests pass. Published ESC files, editable projects and runtime/export assets remain unchanged. This is source/DOM verification; live-browser visual verification remains outstanding.

## 1.22.2 repository status alignment

The repository connection group now has its own wrapping flex layout with baseline alignment. Its text button overrides the shared text-button bottom padding with equal vertical padding, matching the status row's font size and line height. Long repository status text can wrap without overflowing. A CSS-cascade test checks baseline alignment, wrapping and symmetric button padding at narrow and wide viewport settings. All 199 automated tests pass. This is DOM/CSS verification, not live-browser painting.
