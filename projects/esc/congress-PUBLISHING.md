# Publish Congress with Tower

## One-time repository setup

Use the supplied Block Studio repository package. In GitHub Settings > Pages, choose Deploy from a branch, your branch and /docs. Open the published /studio/ page to use the central tool. Do not append /docs to the public site URL.

## Apply this export

1. Extract the ZIP outside your repository.
2. Merge its docs/ and projects/ contents into the corresponding folders in your local repository. On macOS, do not replace an existing top-level folder with the exported folder: that can remove other clients. Copy the changed files into their matching folders, preserving all other files.
3. In Tower, review the diff. This export only updates this template and adds the runtime assets it needs. Unexpected deletions of other templates or older runtimes should not be committed.
4. Commit and push to the configured Pages branch.
5. Open the endpoints below and register each module separately in SFMC.

Template destination: docs/clients/esc/congress/
Editable source: projects/esc/congress.jarrang.json

This full template export refreshes its catalogue. Removed modules disappear from the catalogue but their previously published folders must be retained for existing SFMC content.

## Module endpoints

- Attribution: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/attribution/
- Button Row: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/button-row/
- Checklist: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/checklist/
- Conversation: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/conversation/
- Deadlines List: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/deadlines-list/
- Lead Editorial: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/lead-editorial/
- Lead Poster: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/lead-poster/
- Personal Letter: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/personal-letter/
- Section Header: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/section-header/
- Spotlight: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/spotlight/
- Story 1 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/story-1col/
- Story 2 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/story-2col/
- Together List: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/congress/modules/together-list/

## Keep existing blocks working

Keep module identities, publishing folders and older runtime folders. Runtime folders are identified by their content and are never overwritten by a different release. Updating Studio does not change published modules. Re-export intentionally to adopt new code. For a changed field schema, create a new module folder and release; retain the previous endpoint. Existing SFMC instances are not migrated automatically.

## Shared editing

Pull the latest changes in Tower before starting. Import the relevant projects/ JSON into Studio, edit it, then export back into the same repository. Browser drafts are local to that browser and do not synchronise between people or devices. Resolve conflicting project edits through your normal Git review process.
