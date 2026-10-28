# Publish Newsletter with Tower

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

Template destination: docs/clients/esc/newsletter/
Editable source: projects/esc/newsletter.jarrang.json

This module save refreshes the catalogue using this module and the last generated definitions of other modules. Other module drafts remain in the editable project without updating their generated pages. Use Save template to update the whole suite.

## Module endpoints

- Hero Story: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/hero-story/
- Checklist: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/checklist/
- Navigation: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/navigation/
- Table of Contents: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/table-of-contents/
- Story Card 1 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/story-card-1col/
- Story Card 2 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/story-card-2col/
- Story Card 3 Col: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/story-card-3col/
- Feature Card: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/feature-card/
- CTA Banner: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/cta/
- Image Banner: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/image-banner/
- Journal Section: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/journal-section/
- Link List: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/link-list/
- Membership Callout: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/membership-callout/
- Membership Card: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/membership-card/
- Quote: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/quote/
- Section Header: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/section-header/
- Signature: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/signature/
- Social Block: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/social-block/
- Speaker Grid: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/speaker-grid/
- Sponsor: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/sponsor/
- Video Embed: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/video-embed/
- Webinar Card: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/webinar-card/
- Spacer: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/spacer/
- Divider: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/divider/
- Decorative Header: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/decorative-header/
- Events: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/events/
- Editorials: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/editorials/
- Text Block: https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/newsletter/modules/text-block/

## Keep existing blocks working

Keep module identities, publishing folders and older runtime folders. Runtime folders are identified by content and must not be overwritten with different bytes. Updating Studio alone does not update module pages. Save affected modules deliberately to adopt new code. Duplicate into a new folder and release for incompatible field changes; retain the previous endpoint. Existing SFMC email content is not rewritten automatically.

## Shared editing

Open the current repository before editing. Browser drafts and Test values do not synchronise between colleagues; Test values are excluded from saved files. If files change outside Studio, preserve your draft and reconcile it with the latest repository before saving again. Coordinate concurrent edits through the normal Git review process.

The projects/ folder is outside the Pages publishing folder; it remains visible to people with repository access (and everyone if the repository is public). Published module defaults are public site content.

## Verify in SFMC

Test new blocks, editing, close/reopen, duplication, tracking, AMPscript and sends. Browser preview does not certify email-client rendering. Conditions and loops render in the editor; AMPscript remains for SFMC. Template context CSS is preview-only.
