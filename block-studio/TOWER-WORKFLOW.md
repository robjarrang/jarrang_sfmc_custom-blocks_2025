# Set up the repository with Tower and GitHub Pages

For the Jarrang person responsible for initial hosting. Day-to-day editing is covered in the [user guide](../USER_GUIDE.md#open-the-current-files).

## One-time setup

1. Put the supplied package in the team's local Git repository. If updating an existing checkout, merge files into their matching paths; retain other client folders and old runtime assets.
2. Review, commit and push in Tower to the intended publishing branch.
3. On GitHub, open **Settings → Pages**, choose **Deploy from a branch**, the intended branch and **/docs**, then save. The package is prebuilt; no custom Actions workflow is needed.
4. After deployment, open the Pages site followed by `/studio/`.
5. In Studio, open **Clients & templates → Manage templates → Repository settings** and enter the Pages site URL including its repository path, for example `https://your-team.github.io/custom-blocks/`. Do not append `/docs` or `/studio`.
6. Choose **Open repository** and select the local repository root containing `docs/`, `projects/` and `block-studio/`. Grant access and load the intended template.

**Result:** Studio reads and saves files in the same checkout Tower uses. Each module's **Module settings → Copy module URL** provides its endpoint.

GitHub may show an automatically managed Pages deployment in Actions even with branch publishing. That does not require changing this setup to a custom Actions workflow. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Normal publishing

Pull in Tower, open/reload the repository in Studio, edit and test, then **Save** or **Save template**. Review, commit and push in Tower. Check deployment, the hosted endpoint and SFMC before client use. Register an endpoint only for a new block; compatible updates keep the existing endpoint.

A save is local, not a commit or deployment. Browser drafts do not synchronise between colleagues. Coordinate work on the same template and reload after pulls. Studio checks for external changes rather than overwriting them.

## ZIP fallback

If folder writing is unavailable, use **Clients & templates → Manage templates → Download template ZIP** or **Download current module ZIP**. Extract outside the checkout and merge changed files into matching paths. Do not replace whole `docs/` or `projects/` folders in Finder. Use a template ZIP to refresh the complete catalogue.

## Updating or rolling back Studio

Follow the [technical release procedure](../DEVELOPER_GUIDE.md#change-and-release-procedures). Keep editable projects, all required module paths and older runtime folders. Rebuild after changing source or bundled project snapshots. Re-saving modules intentionally adopts the current runtime; updating the central Studio by itself does not.

For a rollback, revert the relevant commit in Tower, push, then reopen the repository in Studio. Restore matching editable and generated files together. An endpoint move is not automatic migration: retain the previous URL while it is used in SFMC.
