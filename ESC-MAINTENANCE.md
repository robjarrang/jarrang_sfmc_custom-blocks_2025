# ESC modules: internal maintenance handover

For Jarrang colleagues maintaining the ESC suite. Reviewed 14 October 2026 against Studio 1.28.0. This is an internal supplement to the [user guide](USER_GUIDE.md), not a client-facing manual.

## Open and make a change

1. Pull in Tower and open Studio. Choose **Open repository** and select the local repository root.
2. Choose **ESC / Newsletter** (27 modules) or **ESC / Congress** (13 modules).
3. Use **HTML & CSS** for a small code correction, **Fields → Edit** for starting content/control settings, or **Test** for temporary values.
4. Apply the edit, test the affected behaviour and choose **Save**. Use **Save template** for shared editor appearance changes.
5. Review, commit and push in Tower. Check the hosted editor and new/existing instances in SFMC.

If the repository import reports a project/page mismatch, reconcile that pair before editing. Do not load a stale bundled snapshot over a newer project. Current endpoints are listed in [Newsletter publishing notes](projects/esc/newsletter-PUBLISHING.md) and [Congress publishing notes](projects/esc/congress-PUBLISHING.md).

## Preserve existing content

Maintain existing module IDs, folders, releases, field IDs/types and item keys for compatible fixes. Use **Module actions → Duplicate** and a new endpoint for incompatible field changes; retain the original block. Preserve supplied `icon.png` and `dragIcon.png` bytes using **Module settings → Custom block icon → Keep supplied PNGs**.

Both ESC templates disable **Show Jarrang Block Studio header** under **Template settings → Editor appearance for all modules**. This is form branding, not email styling. Save the whole template when changing it.

Existing SFMC instances retain their saved values. New defaults, images and corrected punctuation do not replace them automatically. Plain-text fields use actual characters, for example `28 Aug – 31 Aug 2026`, rather than `&ndash;`.

## ESC controls and layouts

The suite uses optional sections, colour/theme choices, conditional layouts, repeating lists, item-position rules and formatted-text lists. Use **Where it applies → Layout rules** to edit supported existing conditions. Test each affected choice because several rules may work together on one layout. New/restructured logic belongs in **More tools → Advanced template logic** with developer review.

A repeated group can become a single item through its field settings, including supported item-position rules. The retained item becomes both first and last. This still changes an existing published field schema, so release that change as a duplicated module rather than replacing the live endpoint.

## Images and the Congress lead

The landscape placeholder is the ESC-hosted [1920 × 1080 image](https://image.info.escardio.org/lib/fe89127277620d7570/m/1/4fcce3d7-6f50-466b-a889-68d38120a9f9.jpg). It is used for populated general landscape-image defaults. Logos, journal covers and speaker portraits keep their own artwork; optional images remain blank. Display scaling does not reduce the asset's download size.

Congress **Lead Editorial** retains the side-by-side desktop composition: a 320px content column and a 300px visual column, with a 274px image frame and proportional height. The image frame is in normal table flow; its containing cell supplies vertical centring. Do not reintroduce `align="left"` on the nested image-frame table, which was removed to address Windows Outlook alignment.

**Visual image** is the main image. Leave **Mobile image (optional)** blank to reuse the main image and alt text. A supplied mobile alternative uses its own alt text. Existing instances with a saved alternative keep it until cleared.

Lead Editorial also includes organiser logo width and optional link controls. Width starts at 112px, renders with a 160px cap and falls back to 112px for non-positive values. A blank logo link produces no anchor. Test the result with the actual master-template mobile rules as well as on desktop.

## The master template is a separate dependency

The ESC master template was supplied and updated separately as `ESC-Master-Template.html`; it is not included as an editable Studio project in this package. Obtain the current approved template when handing over the suite. A Studio template is a collection of modules, not that master email file.

All current ESC modules have empty preview-only `contextCss`. The master template supplies responsive CSS and AMPscript initialisation. Context CSS can improve Studio previews but is never exported into email output. Studio does not execute AMPscript or emulate Outlook.

The separately supplied master-template changes include:

- A “View online” row whose light-mode background matches the outer `#e8e8e8` background, with explicit outer table/body values for Windows Outlook.
- Removal of organiser-table mobile hiding rules so organiser content remains visible.
- A mobile width exception that keeps the Onsite badge compact rather than stretching it across the column.
- An Apple Mail dark-mode correction for Lead Editorial: one continuous primary-colour outer surface with transparent inner structural table/cell backgrounds. The earlier `border-collapse:collapse` workaround did **not** resolve the seam and must not be treated as the final fix.

The user confirmed the Outlook centring and Apple Mail seam fixes on their proofs. The later View online Outlook background change still needs a fresh Outlook proof; automated structure checks do not establish its visual result. Do not infer that every master-template change is included merely by saving the module package.

## Link options and conversion tracking

Expand **Link options** below a destination, or inside a formatted-text link dialogue. **Title** and **Tracking Alias** are optional and start blank in the ESC suite. Title adds advisory text where supported; Tracking Alias names the link in SFMC reporting. Each repeated item stores its own options. Use field **Set up → Link options** to configure defaults or hide either input. Existing saved URLs and link styling remain unchanged.


URL controls and supported formatted-text link dialogues include **Conversion Tracking Link** under **Link options**. It starts unchecked for all ESC defaults and can be chosen separately for links within repeating items. Ticking it adds `conversion="true"` to the relevant generated web-link anchor; it does not change the destination or fixed link styling. Existing field IDs and saved URL strings remain compatible.

Deploy the updated module pages and their new runtime folder together. Reopen a block in SFMC to use the updated controls; existing stored email HTML is not regenerated simply by publishing the files. Check a newly inserted block and a saved instance. For Congress registrations and Membership links, verify a real send/click carries SFMC's conversion parameters and a completed website conversion reaches the existing reporting setup. DOM/SDK tests cannot establish that final website result.

## Release check for this suite

For each affected module, verify:

1. A new SFMC block and an existing saved instance can be edited, closed/reopened and duplicated without losing content.
2. Relevant switches, dropdown choices, list counts/order and rich-text links/lists render as intended.
3. URLs/tracking, alt text, mobile image fallback and any organiser link work with realistic content.
4. The email uses the approved master template and resolves AMPscript in subscriber preview/test sends.
5. The affected desktop/mobile, Windows Outlook and dark-mode layouts pass the team's client checks. For Lead Editorial, include image centring, the column seam, organiser visibility and badge width.

Record the environment and outcome, not just “preview passed”. [ESC-COMPATIBILITY.md](ESC-COMPATIBILITY.md) records an earlier independent comparison; it is not certification of subsequent email-client changes. [VALIDATION.md](block-studio/VALIDATION.md) records later automated work and its limits.

For recovery and deployment rollback, follow the [user guide](USER_GUIDE.md#recover-a-mistake). Restore matching project and generated files together; keep old runtime directories and existing endpoints.

## Shared email settings (1.28.0)

The additional **ESC / Email settings** suite contains one settings-only block for both Newsletter and Congress. It exposes Brand and Footer logo, with no category or header-prefix control. All 32 supplied brand keys are listed, with Council and Working Group labels. The original 40 modules remain unchanged. Follow [the integration guide](integrations/esc/email-settings/README.md) to update the setup snippet and initialisation/CSS ordering; publishing the editor alone does not install these SFMC changes.
