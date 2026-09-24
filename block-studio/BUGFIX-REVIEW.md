# Workflow regression sweep - 1.12.2

Confirmed and fixed:
- Repeating → single → repeating failed because the converter rejected connected template references. It now converts supported references and literal mappings together while retaining values, settings and filters.
- Visual repeat candidates ignored template-connected fields with no source offsets. Candidate discovery now includes their references.
- Failed conversion could partially rebase an input module. Conversion now commits an isolated draft only after success.
- Disabled fields could become item controls. Automatic conversion now rejects these with an explanation.
- Boundary picker errors were repeated in oversized dropdown options and replaced with misleading generic guidance. Reasons now appear below the compact choices.
- Reused loop aliases could associate preview content with the wrong group. Alias lookup now follows loop scope.
- Switching content behaviour after removing starting rows could retain an out-of-range item choice or stale errors. The choice is clamped and obsolete errors cleared.

113 automated checks pass, including repeated round trips, policy retention, mixed mappings, shared-reference rejection and loop scope. The existing export, persistence, source editing and preview suites also pass. Live browser and SFMC verification remain outstanding; these checks do not establish a bug-free product.

---

# Draft, test and export clarity - 1.10.1

Separated browser draft status from file-download feedback. Renamed the JSON and ZIP actions, made test exclusions explicit, added persistent filename-specific download receipts with Tower next steps, and prevented the template-settings success message from obscuring a failed local save. Download requests do not imply disk-save completion or publication. Browser draft status is visible at all screen widths.

Validation: automated checks cover project receipts, retained local-save status, dismissal and filename correctness when switching modules during package preparation. Live browser verification remains outstanding.

# Unified field workspace - 1.10.0

Implemented Configure fields / Test client controls within Build & test, replacing the separate Try stage. One shared iframe receives both annotated source and rendered test output through the existing preview bridge. Mode switching changes the controls panel and relevant HTML editor, preserves preview width/view choice, and retains temporary test values. Review export explicitly marks fields reviewed. Test data stays outside saved project definitions.

Validation covers shared document loading, mode visibility, retained test values, source/output switching, restoring defaults and export review state. The current browser suite has been extended but not run here due to the previously documented local-browser security restriction.

# Trial preview updates - 1.9.6

Try the editor previously reloaded srcdoc on every control change. It now loads the sandbox document once and sends sanitised HTML through a parent-only message bridge. The bridge reconciles text, attributes and child nodes in place, retaining identical nodes and unchanged image URLs. Identical updates are ignored, and edits made during initial loading are coalesced to the latest document. Added/removed optional or repeated content still changes the corresponding subtree; a deliberate image URL change necessarily loads a new image.

The trial iframe permits only the generated nonce-authorised bridge script, without same-origin access. Author scripts are removed by the existing sanitiser. The rendered email string and exported SFMC runtime are unchanged.

The SFMC runtime already debounces saves for 200 ms and sends complete HTML with sdk.setContent. It does not reload its editor form for each change. Salesforce controls its own canvas rendering; this review does not claim to control that behaviour.

Validation: 90 automated checks pass, including retained image/container identity, text and attribute updates, structural changes, and latest-value delivery during iframe loading. Live browser and SFMC verification remain outstanding.

# Interaction polish - 1.9.3

Confirmed and fixed:
- Desktop/Mobile switches and returning from HTML previously regenerated iframe srcdoc. They now change visibility and width only, preserving the loaded email.
- Field reordering previously rebuilt the email preview. It now updates field order and selection only; actual field changes still rebuild the preview.
- Clicking the active module previously reset the workflow step, selected field and test values. It is now a no-op.
- Clicking the active workflow step or selected field previously rebuilt the interface. These are now no-ops.
- Sidebar field selection replaced its focused button. Focus is now restored to the corresponding button without forcing page scrolling; preview and code selection do not steal focus.

Validation: 87 automated checks pass, including regression checks that fail on preview replacement during resizing, reordering or repeated navigation, and checks for retained field focus. DOM simulation cannot verify browser painting, scroll behaviour or iframe visibility after hiding; live Safari/Chrome verification remains outstanding. No dependencies added.

# Preview selection - 1.9.2

Selecting a field from the visual preview, sidebar or HTML view now updates the selection through a parent-to-preview message instead of regenerating and reloading srcdoc. The preview changes only selection attributes, preserving its document and loaded assets. A load listener reapplies the current selection if selection changes while a new preview is loading. Content edits continue to use the existing full renderer.

Validation: 86 automated checks pass. New DOM simulation checks reject iframe reloads during preview/sidebar selection and exercise the actual preview message handler, including repeated targets, clearing selection and rejecting messages from unrelated windows. Live browser verification remains outstanding.

# Code editor alignment - 1.9.1

The textarea is now the sole scroll authority. Previously the syntax layer and gutter were separate scroll containers: browser clamping could give them different offsets from the textarea, particularly with horizontal scrollbars and at the bottom of the document. Decoration contents now translate by the native textarea offsets instead. The extra painted newline has been removed, and syntax spans retain identical font metrics. No pointer-coordinate calculations or new dependencies were introduced.

Validation: 84 automated checks pass, including fractional horizontal/vertical scroll offsets, return to the top, exact painted content, tag matching, CRLF mapping and protected edits. These checks use a DOM simulation and do not verify browser hit testing. Live browser verification remains outstanding: check clicks on opening and closing tags at the top, middle and bottom, after horizontal scrolling, and at different browser zoom levels in Safari and Chrome on macOS.

# Bug sweep - 1.8.2

Reviewed the multi-client workspace, quick HTML editor, import/export boundaries and preview failure states. Fixes were applied in descending impact order.

| Priority | Confirmed issue | Fix |
| --- | --- | --- |
| High | A stale browser tab could overwrite the saved workspace from another tab. | Compare persisted data before each write; reject stale saves, show an unsaved status and warn before closing. This detects stale writes; it is not a collaborative editing or atomic locking system. |
| High | An asynchronous HTML upload could write into whichever module was active when it finished. | Bind the read and confirmation to the original module and draft. Cancel when the module or draft changes; handle file-read failures. |
| High | An imported identity and path could match two separate templates; replacement behaviour depended on their order. | Reject ambiguous imports before confirmation or mutation, with guarded errors at the confirmation callback. |
| Medium | Switching modules while a ZIP was being prepared changed the downloaded filename. | Capture the project, selected modules, options and filename before export starts. |
| Medium | Missing or malformed draftSource values in imported projects could crash rendering. | Restore missing draftSource from source for older files; reject malformed values before opening. Validate stored repository settings too. |
| Medium | Closing the page with a quick HTML draft or a failed browser save could discard work without a warning. | Add a beforeunload warning while those changes remain unsaved. |
| Lower | A failed trial render left the previous HTML and preview visible. | Clear the previous output and show a preview-unavailable message. |

Regression coverage includes delayed and rejected file reads, cross-tab stale writes, ambiguous imports in both array orders, export selection changes, malformed draft inputs and unsaved quick-edit closure. Existing field, runtime, template and export tests also pass.

Validation is automated Node logic, ZIP and DOM/SDK simulation. Live visual browser and SFMC verification remain outstanding. No claim of email-client certification is made.

---

# Critical bug review: 1.5.1

17 September 2026

This pass prioritised data loss and incorrect saved output in project import, source rendering and exported SFMC editors. Four confirmed bugs were reproduced before fixes.

| Priority | Confirmed bug | Fix |
| --- | --- | --- |
| High | A block without Studio metadata mounted its editable controls before `getContent` returned. Edits could race with the existing-content check. | Keep controls unmounted and disabled until SFMC confirms the block is empty. Existing content, invalid responses, timeouts and late replies never unlock editing. |
| High | Save snapshots copied only the top-level values. Mutating a repeater row while `setContent` awaited acknowledgement could change the metadata saved for earlier HTML. | Deep-copy JSON field values for both normal saves and close-hook saves. |
| High | Malformed repeater rows could silently use defaults during validation and then crash rendering or controls. | Validate value structure before mounting saved controls and before accepting project defaults. Preserve saved content and display a recovery message if stored values are invalid. |
| High | Imported duplicate module IDs were accepted. Selecting a module could resolve to the wrong one, while deletion removed every matching ID. | Reject duplicate identities before the project replaces the current workspace. |

## Validation

32 Node tests pass: 25 core/template tests and seven exported-runtime tests. The runtime tests execute the actual runtime script with a simulated SDK and minimal form/control stubs. They exercise delayed callbacks, queued edits, immutable snapshots, closing during a pending save, malformed metadata, content-check timeouts and invalid responses. New reproductions failed before the corresponding fixes.

JavaScript syntax and standalone build checks pass. Export packaging was checked for root and `/docs`, including the new shared runtime and core value validation.

No new browser workflow or live SFMC tenant test was performed in this pass. Previous visual/browser validation remains documented separately in VALIDATION.md. This is a targeted critical-bug pass, not a claim that every possible UI or platform defect has been eliminated.

## Applying the fixes

Open the updated Studio, load your saved project and re-export affected modules. Exports reference `shared-assets/block-studio-1.5.1`; include that folder and the updated module pages in the GitHub Pages branch. Retain older shared runtime folders for modules that still reference them. This release does not change module IDs, module versions or stored field names. It does not automatically update previously downloaded or published files.
