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
