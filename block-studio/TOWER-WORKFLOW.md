# One repository, multiple clients

## Set up once

1. Extract this repository package into your local Git repository. It includes the tool source plus the pre-built site in `docs/`.
2. In Tower, review the files, commit and push.
3. In GitHub Settings → Pages, choose **Deploy from a branch**, your branch and **/docs**.
4. Open `https://<organisation>.github.io/<repository>/studio/`.
5. Open **Clients & templates → Repository settings** and enter `https://<organisation>.github.io/<repository>/`. Do not include `/docs` or `/studio`.

The tool is already built. No build command or custom Actions workflow is needed to publish the supplied package. Developers changing the tool source run `python3 build.py` locally before committing the regenerated files.

## Edit existing modules or create new ones

1. Pull in Tower before editing.
2. Choose **Open repository** in Studio and select the repository root. Grant read/write permission. Studio loads projects and their existing module artwork. A remembered connection can be reopened with **Reconnect**.
3. Select the client, template and module. Use HTML & CSS for code fixes, Fields for configuration, and Test for temporary editor values.
4. Click **Save** for the current module, or **Save template** for every module. Resolve any validation messages. Studio writes the project JSON, module files, icons, catalogue and required runtime assets directly into their existing folders.
5. Review changed files in Tower, commit and push. GitHub Pages publishes through the configured branch and /docs folder. No manual copying or ZIP extraction is needed for normal editing.
6. Register a new module using **Copy module URL** from **Module settings** once Pages has deployed. Existing modules keep their URLs.

Browser recovery drafts are separate from repository saves. Single-module saves keep other module drafts in the project JSON but preserve their generated files. Save template applies shared template styling to all modules. After pulling changes during an editing session, use **Reload repository** before saving; Studio refuses to overwrite files changed outside the app.

Direct writing requires a supported browser, such as desktop Chrome or Edge. **Clients & templates → Manage templates** retains ZIP and editable-project downloads for sharing or browsers without folder write access. For ZIP fallback only, merge files into matching repository paths without replacing whole directories.

Saving is not a multi-file filesystem transaction. Output is prepared and checked first; failures trigger best-effort rollback and block further writes until the repository is reopened. If rollback cannot complete, review and restore the affected files in Tower before committing. A crashed browser cannot complete rollback.

## Update Studio

Merge updated tool source and `docs/studio/index.html` from a new Studio release. Preserve `docs/clients/`, `docs/shared-assets/` and `projects/`. Review, commit and push with Tower. Existing blocks keep using their previously exported code. Re-export only the modules you intend to update.

## Existing projects and endpoints

Old `.jarrang.json` projects can be imported without rebuilding their field mappings. Assign their client and template in Template settings before exporting. This produces new nested endpoints. Already registered SFMC blocks still use their old endpoint, so retain the old hosting paths or repositories while those blocks remain in use. No automatic endpoint migration is performed.

Renaming a template changes its display name, not its publishing folder. New field schemas should use new module folders and versions; retain old folders for existing emails.

## Shared work

Browser drafts do not automatically update from Git. Pull in Tower and open or reload the repository before starting work. Imports matching an existing project identity or publishing folder ask before replacing the local draft. Coordinate concurrent edits to the same template using your normal Git workflow.

Project JSON files are outside `/docs` and are not published by Pages. They are still readable by people with repository access, or everyone if the repository is public. Published module definitions include their default content.
