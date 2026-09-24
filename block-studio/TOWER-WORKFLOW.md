# One repository, multiple clients

## Set up once

1. Extract this repository package into your local Git repository. It includes the tool source plus the pre-built site in `docs/`.
2. In Tower, review the files, commit and push.
3. In GitHub Settings → Pages, choose **Deploy from a branch**, your branch and **/docs**.
4. Open `https://<organisation>.github.io/<repository>/studio/`.
5. Open **Clients & templates → Repository settings** and enter `https://<organisation>.github.io/<repository>/`. Do not include `/docs` or `/studio`.

The tool is already built. No build command or custom Actions workflow is needed to publish the supplied package. Developers changing the tool source run `python3 build.py` locally before committing the regenerated files.

## Create or update a template

1. Pull the latest changes in Tower before editing.
2. Open **Clients & templates**. Import the relevant JSON from `projects/`, or select **New template**.
3. Choose the client and template name. Add, configure and review its modules.
4. Select **Export template**. Every included module must pass its checks and have its dependencies acknowledged.
5. Extract the export outside the repository. Copy the changed files into matching paths under `docs/` and `projects/`. Preserve existing files that are not included. Finder’s folder replacement can delete unrelated content: do not replace the entire `docs` or `projects` folder.
6. Review the diff in Tower. Expect this template’s files and any new runtime directory. Commit and push.
7. Use the generated publishing guide for the module endpoints to register separately in SFMC.

Example files:

- `docs/studio/index.html`: one central application.
- `docs/clients/hertz/commercial/index.html`: the template catalogue.
- `docs/clients/hertz/commercial/modules/hero/index.html`: one SFMC editor.
- `docs/shared-assets/runtime-<hash>/`: immutable shared dependencies.
- `projects/hertz/commercial.jarrang.json`: the complete editable template.

**Download module ZIP** updates one module and retains the complete project source. It does not refresh the catalogue. Use **Export template** when adding modules to the catalogue.

## Update Studio

Merge updated tool source and `docs/studio/index.html` from a new Studio release. Preserve `docs/clients/`, `docs/shared-assets/` and `projects/`. Review, commit and push with Tower. Existing blocks keep using their previously exported code. Re-export only the modules you intend to update.

## Existing projects and endpoints

Old `.jarrang.json` projects can be imported without rebuilding their field mappings. Assign their client and template in Template settings before exporting. This produces new nested endpoints. Already registered SFMC blocks still use their old endpoint, so retain the old hosting paths or repositories while those blocks remain in use. No automatic endpoint migration is performed.

Renaming a template changes its display name, not its publishing folder. New field schemas should use new module folders and versions; retain old folders for existing emails.

## Shared work

Browser drafts do not automatically update from Git. Pull in Tower and import the latest committed project file before starting work. Imports matching an existing project identity or publishing folder ask before replacing the local draft. Coordinate concurrent edits to the same template using your normal Git workflow.

Project JSON files are outside `/docs` and are not published by Pages. They are still readable by people with repository access, or everyone if the repository is public. Published module definitions include their default content.
