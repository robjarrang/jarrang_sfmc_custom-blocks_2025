# Publish Newsletter with Tower

## One-time repository setup

Use the supplied Block Studio repository package. In GitHub Settings > Pages, choose Deploy from a branch, your branch and /docs. Open the published /studio/ page to use the central tool. Do not append /docs to the public site URL.

## Apply this export

1. Extract the ZIP outside your repository.
2. Merge its docs/ and projects/ contents into the corresponding folders in your local repository. On macOS, do not replace an existing top-level folder with the exported folder: that can remove other clients. Copy the changed files into their matching folders, preserving all other files.
3. In Tower, review the diff. This export only updates this template and adds the runtime assets it needs. Unexpected deletions of other templates or older runtimes should not be committed.
4. Commit and push to the configured Pages branch.
5. Open the endpoints below and register each module separately in SFMC.

Template destination: docs/clients/esc/newsletter/
Editable source: projects/esc/newsletter.jarrang.json

This full template export refreshes its catalogue. Removed modules disappear from the catalogue but their previously published folders must be retained for existing SFMC content.

## Module endpoints

- Hero Story: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/hero-story/
- Checklist: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/checklist/
- Navigation: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/navigation/
- Table of Contents: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/table-of-contents/
- Story Card 1 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/story-card-1col/

## Keep existing blocks working

Keep module identities, publishing folders and older runtime folders. Runtime folders are identified by their content and are never overwritten by a different release. Updating Studio does not change published modules. Re-export intentionally to adopt new code. For a changed field schema, create a new module folder and release; retain the previous endpoint. Existing SFMC instances are not migrated automatically.

## Shared editing

Pull the latest changes in Tower before starting. Import the relevant projects/ JSON into Studio, edit it, then export back into the same repository. Browser drafts are local to that browser and do not synchronise between people or devices. Resolve conflicting project edits through your normal Git review process.

The projects/ folder is outside the Pages publishing folder; it remains visible to people with repository access (and everyone if the repository is public). Published module defaults are public site content.

## Verify in SFMC

Test new blocks, editing, close/reopen, duplication, tracking, AMPscript and sends. Browser preview does not certify email-client rendering. Conditions and loops render in the editor; AMPscript remains for SFMC. Template context CSS is preview-only.
