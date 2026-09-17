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
