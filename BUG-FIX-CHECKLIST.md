# Bug-fix sweep - 1.24.1

> Historical review record. Claims and test totals apply to the dated release below, not automatically to later changes. For current operation use the [user guide](USER_GUIDE.md) and [technical documentation](DEVELOPER_GUIDE.md).

Completed 12 October 2026. Baseline: 208 passing tests. Seven confirmed defects were reproduced before their fixes; the final suite contains 214 passing tests, including extensions to existing ESC tests.

Prioritisation is by potential data loss or incorrect publishing state, followed by blocked workflows and misleading feedback. These ratings describe impact, not observed frequency.

- [x] 1. High: global Undo could mutate a module during repository saving.
  - Cause: inert controls did not stop the window-level keyboard handler. The saved-status baseline could then represent different content from the written snapshot.
  - Fix: history mutations are blocked while the repository save is running; Undo resumes afterwards.
  - Regression: an Undo shortcut injected during a pending write cannot change the module, saved reference or reported status.
- [x] 2. High: rollback could overwrite an external empty edit or deletion.
  - Cause: the recovery guard treated all empty/missing files as failed writes created by Studio.
  - Fix: track completed writes and only clean up an empty new file left by an incomplete first write. Preserve intervening edits/deletions and report incomplete recovery.
  - Regressions: external empty edits/deletions survive rollback; an empty file from a failed first write is still removed; retry stays blocked until reload.
- [x] 3. Medium: draft folder changes could bypass published-page verification on reload.
  - Cause: the importer looked for the live page using the draft folder, then treated its absence as a new module. Draft-only version changes could also prevent reopening an otherwise valid partial save.
  - Fix: locate and verify the saved page using the last exported definition. Retain draft folder/version changes as drafts, with the existing maintenance save restrictions intact.
  - Regression: partial exports preserve those drafts but still reject a changed page at the registered endpoint.
- [x] 4. Medium: missing published pages were silently accepted as drafts.
  - Cause: missing pages were skipped without distinguishing new modules from previously exported ones.
  - Fix: reject an incomplete repository when the module already has an export reference. New unpublished drafts remain allowed.
  - Regression: removing an ESC page fails repository import before browser drafts change.
- [x] 5. Medium: repository-save success hid a failed recovery-draft write.
  - Cause: the normal success notice replaced the storage error without checking persist()'s result.
  - Fix: report that the repository was saved while retaining a specific recovery-draft warning and backup guidance. Keep the successful export reference.
  - Regression: a storage quota failure after file writing does not produce a misleading unconditional success message.
- [x] 6. Medium: compatibility errors opened unrelated module settings.
  - Cause: all maintenance errors had one generic destination.
  - Fix: return structured issue destinations from the existing maintenance validator. Field issues open their field or field list; icons, version/folder and repository-reference problems use their respective destinations. The string-based problems() API remains compatible.
  - Regression: making an existing field required blocks writing and its correction button opens that field.
- [x] 7. Low: Undo back to saved content still showed unsaved repository changes.
  - Cause: obsolete review flags participated in the repository-content comparison, although history resets them and they no longer control saving.
  - Fix: exclude only those two flags from save-status comparison. Source, fields, icons, width and template settings still participate.
  - Regression: edit a saved module name and undo it; the status returns to Saved to repository.

## Verification

- `npm test`: 214 passed, 0 failed, 0 skipped. Includes syntax and runtime-size checks.
- Focused formatting checks passed for changed source and tests.
- Independent ESC audit: 40 modules, 6,728 comparison cases, 6,119 conditional combinations, 492 edited cases, 275 field-editor saves, 2,326 unique structure checks, 0 failures.
- Published ESC pages, icons, project files and export-assets.js are byte-identical to v1.24.0. No dependencies were added and no runtime code was changed.
- Hosted and standalone Studio builds match. No deployment or changes to the user's local Tower checkout were performed.

To repeat the independent check: `node block-studio/scripts/verify-esc.cjs <original-repository.zip> <results-directory>`. It uses the independently supplied ESC ZIP, not this release as its baseline.

## Approach and limits

Use review plus automated tests, prioritise impact, reproduce the defect, apply a focused fix and retain a regression that checks its observable result. Tests are isolated and exercise failure paths as well as success. This follows the risk/impact and actionable-reporting principles in the [OWASP testing guide](https://wstg.owasp.org/latest/2-Introduction/) and the user-visible behaviour and isolation guidance in [Playwright best practices](https://playwright.dev/docs/best-practices), accessed 12 October 2026. This was not a penetration test or a Playwright browser run.

- [ ] Real-browser smoke test: save, Undo/Redo, validation correction, folder permission refusal and repository reload.
- [ ] Real-browser layout and keyboard/zoom checks for the current editor screens.
- [ ] Live SFMC install/edit/close/reopen and email-client rendering checks before deployment.

The automated checks use DOM/events and a simulated filesystem. They do not certify browser painting, operating-system locking/permission behaviour, SFMC or email-client rendering. The browser File System Access API does not make a multi-file save atomic against other applications; keep the normal Tower diff review before committing.

---

# Bug-fix checklist - 1.20.0

Completed 10 October 2026, in impact order. Each item has a targeted regression check.

- [x] 1. Reject missing/misnested closing tags and invalid rendered template output.
  - Quick edits, field saves and exports use structural validation. Tests cover broken closes, permitted omitted tags, opaque AMPscript, raw CSS, Outlook conditional branches and a broken non-default state.
- [x] 2. Record the exact last-exported schema in the browser after an export is generated and download is initiated.
  - Snapshot the actual export, preserve newer drafts, and update only the originating project. Tests cover a module switch during compression and incompatible field removal after export.
- [x] 3. Reopen partial exports without confusing unexported drafts with exported definitions.
  - Repository pages are verified against exported snapshots. Tests preserve another module's newer source, name and icon choices. Legacy schema-only projects require a repository reload or full-template export first.
- [x] 4. Change field types transactionally, including template filters and existing repeated rows.
  - Tests cover text to rich text and back, literal markup preservation, formatting-removal guidance and rejection of formatted text in an attribute binding.
- [x] 5. Lock every control after a failed save and retain the failure message.
  - The whole form becomes inert. Tests cover later change events and delayed SDK callbacks, including a delayed initial connection response.
- [x] 6. Rename template keys and their scoped references atomically; protect published item keys.
  - Tests cover schema, row values, scoped expressions, loop alias collisions, untouched quoted literals/AMPscript and published-key protection.
- [x] 7. Retain keyboard focus after adding, moving, duplicating or removing repeated items.
  - Tests follow the relevant item/action and the Add item button when the list becomes empty.
- [x] Run the complete automated suite and rebuild the standalone app.
  - 164 tests passed, 0 failed, 0 skipped. Source syntax and formatting checks passed. Both standalone entries were rebuilt.
- [x] Confirm existing published modules, icons and runtime folders remain unchanged.
  - All 149 original published files outside docs/studio are byte-identical to the supplied ZIP. Editable project metadata now includes exact exported definitions.

## Release checks still required

- [ ] Check real-browser rich-text interaction, focus and layout.
- [ ] Re-export the affected modules to adopt the save-lock and focus fixes, then commit via Tower to the GitHub Pages publishing branch.
- [ ] In SFMC, test new and saved block instances: edit, close/reopen, duplicate, repeaters, links and relevant conditional states.
- [ ] Check the resulting email in the required email clients.

Automated DOM and SDK simulations do not establish live browser or SFMC behaviour. Structural validation samples representative states rather than every possible combination. No deployment was performed; existing hosted runtime files remain unchanged.

## UI refinement sweep - 1.20.1

Completed 10 October 2026. Reviewed the supplied screenshot, shared styles and UI markup. These are CSS fixes; no editor behaviour or field data model was rewritten.

- [x] Content-behaviour radios inherited full-width text-input styling. Exclude radios from that rule, use compact native controls and align each label beside its control. Add a selected border and keyboard-focus state to the option card.
- [x] Dropdown default-choice radios inherited text-input padding. Apply that padding only to text inputs so the radio stays within its column.
- [x] The template-colour sample inherited the exported editor's full-screen minimum height. Reset the sample's minimum height without changing actual exported editors.
- [x] Dialog action rows, field tabs and preview controls could crowd narrow panels. Allow wrapping, constrain ordinary dialogs to the viewport height and retain readable footer notes.
- [x] Long module names and field labels could overflow their containers. Allow them to wrap, and let the workspace heading and actions share separate lines when necessary.
- [x] Repeater actions and rich-text toolbar groups could crowd narrow controls. Allow them to wrap and keep individual action buttons from shrinking. Long rich-text content can wrap within its control.
- [x] Disabled primary/secondary and rich-text controls still received hover styling. Exclude disabled controls from those hover rules, including the disabled field drag handle.
- [x] New module was hidden at narrow viewport widths. Keep the action available alongside the responsive module list.
- [x] Rebuild both Studio entry points, run the complete suite and check formatting.
  - 167 tests passed, 0 failed, 0 skipped. Three added CSS cascade tests cover radio sizing at 320/552/1024px viewport settings, the colour sample height and narrow-screen action visibility. These tests use happy-dom and do not perform browser layout or painting.
- [x] Preserve existing published modules, icons and runtime folders.
  - All 149 original published files outside docs/studio remain byte-identical to the supplied repository.

### Remaining visual verification

- [ ] Check the field editor, option cards, dropdown choices and template colours in a real browser.
- [ ] Check narrow windows and browser zoom, including long names, dialog actions, rich-text toolbars and repeater controls.
- [ ] Re-export affected modules and verify shared control refinements inside SFMC before client use.

The screenshot's CSS conflict is reproduced and corrected in computed-style checks. This sweep is not a claim that every screen has been visually verified. Existing hosted blocks retain their original styles until deliberately re-exported.
