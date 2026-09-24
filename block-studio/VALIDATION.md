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
