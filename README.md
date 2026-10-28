# Jarrang Block Studio

An internal tool for turning coded email modules into individual Salesforce Marketing Cloud custom blocks. One repository hosts Studio and each client's template/module folders. The supplied ESC suite contains 28 Newsletter and 13 Congress modules, plus one shared Email settings block.

## Documentation

| I want to… | Start here |
| --- | --- |
| Create a block, change fields, fix HTML/CSS or save my work | [Internal user guide](documentation/internal/USER_GUIDE.md) |
| Maintain the code, build Studio or understand compatibility and releases | [Technical documentation](documentation/internal/DEVELOPER_GUIDE.md) |
| Set up GitHub Pages and Tower for the first time | [Repository setup](documentation/internal/DEVELOPER_GUIDE.md#repository-setup-with-tower) |
| Install the shared Email settings block | [ESC email settings integration](integrations/esc/email-settings/README.md) |
| Maintain the ESC suite | [Internal ESC handover](documentation/clients/esc/INTERNAL-HANDOVER.md) |

The user and technical guides describe the current workflow. ESC-specific handover, integration files and the supplied reference spreadsheet are grouped under `documentation/clients/esc/`.

## Open and work

1. Pull the repository in Tower.
2. Open `block-studio/Open-Block-Studio.html`, or your Pages site followed by `/studio/`.
3. Choose **Open repository**, select the repository root and choose a client/template.
4. Edit, test and **Save** a module, or **Save template** for the whole suite.
5. Review, commit and push in Tower. GitHub Pages publishes the committed `docs/` files.

Direct saving uses a desktop browser with folder write access, such as Chrome or Edge. ZIP downloads remain available under **Clients & templates → Manage templates** when needed. The prebuilt tool requires no installation or build command for everyday use.

## Repository layout

| Folder | Purpose |
| --- | --- |
| `block-studio/` | Tool source and prebuilt standalone application |
| `documentation/internal/` | Studio user guide, technical guide and template syntax |
| `documentation/clients/esc/` | ESC internal handover and reference material |
| `integrations/esc/` | AMPscript, email example and SFMC installation instructions |
| `projects/` | Editable client/template projects |
| `docs/studio/` | Prebuilt hosted application |
| `docs/clients/` | Generated module editors and catalogues |
| `docs/shared-assets/` | Versioned runtime dependencies; retain old folders |

Pages uses **Deploy from a branch → /docs**. Save writes local files; Tower pushes them. Updating Studio alone does not update generated blocks or existing email content. See the technical guide for builds, testing and safe releases.
