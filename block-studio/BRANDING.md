# Jarrang interface styling

Version 1.5 follows https://www.jarrang.com/, reviewed 16 September 2026.

- Navy: `#080043`
- Aqua: `#59DBCA`
- Pale blue-grey: `#EFF2FA`
- Neue Montreal: regular (400) and medium (500)
- Pill-shaped primary/secondary actions, 12px panels, restrained 4px form controls
- Original Jarrang SVG wordmark

The theme covers the authoring workspace, field dialogues, rich-text controls, exported module editor and exported catalogue. Imported email code and field content retain their authored styles. New module icons default to navy with an aqua detail; saved icon colours remain customisable.

`src/brand-theme.css` is the shared theme source. `build.py` generates `src/brand.css`, embedding both WOFF2 fonts from `vendor/brand`. The standalone HTML and exported runtime include this stylesheet, so the branding does not depend on network access. Rebuild after changing theme or font files.

Asset provenance: wordmark from Jarrang's homepage; fonts from its public stylesheet's `PPNeueMontreal-Regular.5e0546b4.woff2` and `PPNeueMontreal-Medium.8cc8aa34.woff2` URLs under `https://www.jarrang.com/css/`. These are existing Jarrang brand assets for this internal tool, not assets covered by the third-party SDK's licence.

Exports now use `shared-assets/block-studio-1.5.0`. Retain older shared runtime folders when publishing updates alongside existing modules.
