# Brand and editor appearance reference

For developers maintaining Studio's visual assets. For user settings, see [Style the client editor and block icon](../USER_GUIDE.md#style-the-client-editor-and-block-icon).

## Studio identity

The Jarrang styling follows the website reviewed on 16 September 2026:

- Navy `#080043`, aqua `#59DBCA` and pale blue-grey `#EFF2FA`.
- Neue Montreal regular (400) and medium (500) in Studio.
- Rounded panels, pill-shaped primary actions and the Jarrang wordmark.

`src/brand-theme.css` is the maintained shared theme source. `build.py` generates `src/brand.css` with bundled WOFF2 fonts for Studio/catalogues. It separately generates `src/runtime-brand.css` with the rules used by exported forms and system fonts, avoiding those embedded fonts in each SFMC runtime bundle. Do not edit either generated file directly.

## Client editor appearance

Template-level `editorTheme` controls the block form palette. `showEditorHeader` controls the Jarrang header and defaults on when absent. Both ESC templates disable it. Apply these settings through the exporter's theme/definition functions; do not hard-code branding by copying page wrappers. These settings do not alter the email's design or the wider SFMC application.

## Assets and licensing

The wordmark and Neue Montreal files were obtained from Jarrang's site for this internal tool. Font source filenames were `PPNeueMontreal-Regular.5e0546b4.woff2` and `PPNeueMontreal-Medium.8cc8aa34.woff2` under `https://www.jarrang.com/css/`. They are Jarrang brand assets, not covered by the SDK or Bootstrap Icons licences. Retain the supplied licence notices and confirm rights before repurposing brand assets elsewhere.

Generated module icons use the bundled Bootstrap Icons symbols and a chosen background, with a contrasting foreground. Existing supplied PNG pairs can be retained unchanged. Rebuild after changing source assets; deliberately save/export affected modules to adopt changed runtime styling. Assets use `docs/shared-assets/runtime-<hash>/`; never replace an old hash directory with different content.
