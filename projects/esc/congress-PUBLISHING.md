# Publish Congress with Tower

## One-time repository setup

Use the supplied Block Studio repository package. In GitHub Settings > Pages, choose Deploy from a branch, your branch and /docs. Open the published /studio/ page to use the central tool. Do not append /docs to the public site URL.

## Save and publish

1. Pull in Tower, then choose Open repository in Studio (or Reload repository after a pull). Select the client/template, edit and test.
2. Choose Save for the current module or Save template for the whole suite. These write into the connected local repository; no files need moving. A browser draft is not a repository save.
3. Review the diff in Tower. Keep the editable project and generated files together. Investigate unexpected changes to other clients or deletions of older runtimes.
4. Commit and push to the configured Pages branch, then verify deployment and the hosted endpoint.
5. Register only new endpoints in SFMC. Existing compatible blocks keep their registered endpoint. Test both a new block and an existing saved instance after an update.

## ZIP fallback

If folder writing is unavailable, use Clients & templates > Manage templates to download a publishing ZIP. Extract it outside the repository and merge files into matching docs/ and projects/ paths. Do not replace whole top-level folders in Finder. Then review, commit and push in Tower as above. An editable-project JSON download alone does not contain a deployable editor.

Template destination: docs/clients/esc/congress/
Editable source: projects/esc/congress.jarrang.json

This full-template save/package refreshes the catalogue. Removed modules disappear from the catalogue; retain their previously published folders for existing SFMC content.

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

Keep module identities, publishing folders and older runtime folders. Runtime folders are identified by content and must not be overwritten with different bytes. Updating Studio alone does not update module pages. Save affected modules deliberately to adopt new code. Duplicate into a new folder and release for incompatible field changes; retain the previous endpoint. Existing SFMC email content is not rewritten automatically.

## Shared editing

Open the current repository before editing. Browser drafts and Test values do not synchronise between colleagues; Test values are excluded from saved files. If files change outside Studio, preserve your draft and reconcile it with the latest repository before saving again. Coordinate concurrent edits through the normal Git review process.

The projects/ folder is outside the Pages publishing folder; it remains visible to people with repository access (and everyone if the repository is public). Published module defaults are public site content.

## Verify in SFMC

Test new blocks, editing, close/reopen, duplication, tracking, AMPscript and sends. Browser preview does not certify email-client rendering. Conditions and loops render in the editor; AMPscript remains for SFMC. Template context CSS is preview-only.
