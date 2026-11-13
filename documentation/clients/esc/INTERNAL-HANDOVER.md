# ESC modules: internal maintenance handover

**Audience: Jarrang developers. Not for client distribution.**

For Jarrang colleagues maintaining the ESC suite. Reviewed 14 October 2026 against Studio 1.28.0. This is an internal supplement to the [user guide](../../internal/USER_GUIDE.md), not a client-facing manual.

## Open and make a change

1. Pull in Tower and open Studio. Choose **Open repository** and select the local repository root.
2. Choose **ESC / Newsletter** (29 modules), **ESC / Congress** (13 modules) or **ESC / ESC TV** (5 modules).
3. Use **HTML & CSS** for a small code correction, **Fields → Edit** for starting content/control settings, or **Test** for temporary values.
4. Apply the edit, test the affected behaviour and choose **Save**. Use **Save template** for shared editor appearance changes.
5. Review, commit and push in Tower. Check the hosted editor and new/existing instances in SFMC.

If the repository import reports a project/page mismatch, reconcile that pair before editing. Do not load a stale bundled snapshot over a newer project. Current endpoints are listed in [Newsletter publishing notes](../../../projects/esc/newsletter-PUBLISHING.md) and [Congress publishing notes](../../../projects/esc/congress-PUBLISHING.md).

## Preserve existing content

Maintain existing module IDs, folders, releases, field IDs/types and item keys for compatible fixes. Use **Module actions → Duplicate** and a new endpoint for incompatible field changes; retain the original block. Preserve supplied `icon.png` and `dragIcon.png` bytes using **Module settings → Custom block icon → Keep supplied PNGs**.

Both ESC templates disable **Show Jarrang Block Studio header** under **Template settings → Editor appearance for all modules**. This is form branding, not email styling. Save the whole template when changing it.

Existing SFMC instances retain their saved values. New defaults, images and corrected punctuation do not replace them automatically. Plain-text fields use actual characters, for example `28 Aug – 31 Aug 2026`, rather than `&ndash;`.

## ESC controls and layouts

The suite uses optional sections, colour/theme choices, conditional layouts, repeating lists, item-position rules and formatted-text lists. Use **Where it applies → Layout rules** to edit supported existing conditions. Test each affected choice because several rules may work together on one layout. New/restructured logic belongs in **More tools → Advanced template logic** with developer review.

A repeated group can become a single item through its field settings, including supported item-position rules. The retained item becomes both first and last. This still changes an existing published field schema, so release that change as a duplicated module rather than replacing the live endpoint.

## Minified output

The Newsletter and Congress templates set `minifyOutput`, so the email HTML each block saves into SFMC has its indentation, tabs and line breaks removed (about 4–5% smaller). Source in Studio and in the project files stays formatted. AMPscript and comments are never changed. Write source for readability and do not add `white-space: pre` styling that relies on line breaks. The Email settings block does not use it. See [Output minification](../../internal/DEVELOPER_GUIDE.md#output-minification) for the rules.

## Vertical spacing

Use spacers for vertical spacing, not `padding` or `margin`, so every email client renders it the same way. A spacer is a fixed-height `<div>` holding a hair space (the [Good Email Code](https://www.goodemailcode.com/email-code/spacing.html) method):

```html
<div style="line-height:20px;height:20px;mso-line-height-rule:exactly">&#8202;</div>
```

Keep `height` and `line-height` equal and a multiple of 4, and always end with `mso-line-height-rule:exactly`: without it Windows Outlook treats `line-height` as a minimum and small spacers grow to a full text line. Add `font-size` equal to the height when the height is below the font size it inherits (16px in the master template), as in `<div style="line-height:8px;height:8px;font-size:8px;mso-line-height-rule:exactly">&#8202;</div>`. Add `background-color` only where the spacer sits on a coloured area that is set on the spacer itself. Do not use a `<div>` where a row in a structural table, a fixed-width accent bar or the Congress lead-module outer wrappers need a cell; those stay as table cells.

Text elements carry `margin: 0`; the gap between two elements is a spacer between them, placed inside the same `{% if %}` as the element it belongs to so a hidden element leaves no gap. Cell padding keeps only its horizontal part. Where a show/hide toggle connects to an element that has spacers, the connection is a one-cell wrapper table holding the element and its spacers, so hiding it removes both.

Deliberate exceptions: button and pill internal padding (it sizes the button), padding on cells with a fixed height (it interacts with the height), and the Congress Lead Editorial and Lead Poster, whose mobile padding is overridden by the master template CSS.

The Newsletter **Decorative Header** draws its desktop artwork with a VML box for Windows Outlook. Its textbox uses `mso-fit-shape-to-text:true`, so a taller logo or wrapped title extends the box instead of being clipped at 180px. Its `v:fill` keeps `size="465pt,135pt"` (the 620 × 180px artwork in points) with `origin` and `position` at `-0.5,-0.5`, which pins the artwork at its own size to the top-left. Any extra height shows the white fill colour, as in other clients, instead of stretching the artwork. Keep these attributes if the artwork changes. Give `size` in points (px × 0.75), because VML pixel values do not scale at 120 DPI while the box itself does, which leaves the artwork short of the right edge.

Newsletter **Hero Story** has **Show top spacing** and **Show bottom spacing** switches (both on by default) that remove its 32px outer spacer rows, for placing it directly against a neighbouring module that already supplies spacing. Existing emails keep both rows.

A text field left blank but still shown leaves an empty paragraph. Spacers around it add up in every client; the old margins collapsed in browsers but not in Outlook. Use the show/hide switch to remove a section.

## Outlook 1px lines

All ESC modules follow ActionRocket's [white-lines guidance](https://www.actionrocket.co/blog/white-lines-in-outlook). Keep these rules when editing or adding a module:

- Font sizes, line-heights, heights and padding are multiples of 4px. Exceptions: 1px hairline dividers, the hero outline buttons (11px padding plus a 1px border), `mso-text-raise`, letter-spacing and border-radius.
- Every px `line-height` carries `mso-line-height-rule: exactly`.
- Every block that holds text (`p`, `td`, `div`, headings), including one that only wraps a styled `<a>` or `<span>`, has its own px `line-height` with `mso-line-height-rule: exactly`. Windows Outlook sets line spacing per block and ignores the inline child's line-height, so a block without one gets the font's fractional natural height. Use the value it already inherits in browsers (the body's 24px unless an ancestor sets another), so other clients are unchanged. Never set an exact line-height on a block holding an image, because Outlook would crop the image to it.
- Every image has `border="0"` and `display: block` (or `display: none` for swapped images), with no whitespace before its closing `</a>`.
- Tables use `border-collapse: collapse` and zero `mso-table-lspace`/`mso-table-rspace`, except rounded buttons and cards, which need `separate` for their corners.
- `side` cells holding only `&nbsp;` use `font-size: 4px; line-height: 4px; mso-line-height-rule: exactly`. Leave `gap` cells between stacking columns alone: on screens from 581px to 640px their text line forms the gap between stacked cards.

### Button audit

All maintained ESC buttons use table/cell fills, zero table spacing and explicit exact text line heights. Solid buttons have no decorative table border. Outline borders remain, with padding chosen so the total height is divisible by 4. The Newsletter CTA Banner and Journal Section now use the same table-button structure rather than fractional `em` padding and percentage-based Outlook text-raise shims. Field IDs, link metadata, saved values, supplied icons and module endpoints are retained.

The shared dark-mode CSS in `integrations/esc/email-settings/Brand-Dependent-Styles.html` no longer adds a 1px border to filled buttons or overrides outline widths. Apply these two CSS rule changes to the live starter/master email too; updating module endpoints alone cannot change an email's head CSS. The populated `ESC-Email-Example.html` carries the same fixes. After deployment, reopen/save affected existing blocks and validate new sends in Windows Outlook at 100% and 125% scaling, plus the usual mobile and dark-mode proofs.

## Images and the Congress lead

The landscape placeholder is the ESC-hosted [1920 × 1080 image](https://image.info.escardio.org/lib/fe89127277620d7570/m/1/4fcce3d7-6f50-466b-a889-68d38120a9f9.jpg). It is used for populated general landscape-image defaults. Logos, journal covers and speaker portraits keep their own artwork; optional images remain blank. Display scaling does not reduce the asset's download size.

Landscape images carry an explicit `height` for Windows Outlook, which otherwise derives a fractional height (326.25px at 580px wide) that its 125% display scaling turns into 1px lines. Each image has an **… height in Outlook (px)** field: `0` uses the 1920 × 1080 height rounded to the nearest multiple of 4 for that width (for example 328px at 580px), and any positive value replaces it for other image shapes. The inline `height: auto` keeps every other client proportional, so the value affects Windows Outlook only. Logos, journal covers, the signature and speaker portraits are excluded.

Congress **Lead Editorial** retains the side-by-side desktop composition: a 320px content column and a 300px visual column, with a 274px image frame and proportional height. The image frame is in normal table flow; its containing cell supplies vertical centring. Do not reintroduce `align="left"` on the nested image-frame table, which was removed to address Windows Outlook alignment.

**Visual image** is the main image. Leave **Mobile image (optional)** blank to reuse the main image and alt text. A supplied mobile alternative uses its own alt text. Existing instances with a saved alternative keep it until cleared.

Lead Editorial also includes organiser logo width and optional link controls. Width starts at 112px, renders with a 160px cap and falls back to 112px for non-positive values. A blank logo link produces no anchor. Test the result with the actual master-template mobile rules as well as on desktop.

## Newsletter Membership Card

**Membership Card** is a personalised member card with a fixed orange treatment. Its AMPscript reads the `Salutation`, `FirstName`, `Last Name`, `Profession`, `ESC Product` and `ESCID` sendable-data attributes, builds the name and membership line, and links to the MyESC profile. Only the greeting, profile link text and badge label are editable; keep the AMPscript unchanged. The ESC ID badge appears only for members with an ESC ID. Check it with subscriber preview against real member records.

Its icon pair is a byte copy of Membership Callout's ID-badge artwork until dedicated artwork is supplied. Replace both PNGs through **Module settings → Custom block icon**.

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

Record the environment and outcome, not just “preview passed”. Follow the [technical verification procedure](../../internal/DEVELOPER_GUIDE.md#build-and-verification) and record results with the release.

For recovery and deployment rollback, follow the [user guide](../../internal/USER_GUIDE.md#recover-a-mistake). Restore matching project and generated files together; keep old runtime directories and existing endpoints.

## Full Width Image

**Full Width Image** (`full-width-image`) lives in **ESC / Newsletter** and can be used across ESC emails. It is a single linked image spanning the full 620px email width, with square edges and no side margins or extra spacers. Supply an image URL, alt text and destination; the link includes the shared conversion tracking, title and alias controls (conversion tracking off by default). A 1920 × 1080px image is recommended; other proportions scale naturally. **Image height in Outlook (px)** defaults to 0, which supplies a 348px height for Windows Outlook. For a different shape, enter its displayed height at 620px wide (source height × 620 ÷ source width), ideally rounded to a multiple of 4. Other clients use proportional `height: auto`. The surrounding table uses the standard white Newsletter background. The former ESC TV endpoint is retained for installed blocks, but is omitted from Studio and the ESC TV catalogue; register the Newsletter endpoint for new installations.

## ESC TV

**ESC / ESC TV** is a third template whose modules are interchangeable in one email, like Congress. Every ESC TV module sits on a `#011933` background: set `bgcolor` and `background-color` on the outer table, both side cells and the content cell, so the master template's dark-mode `.content-outer` rule cannot expose a grey frame. Text is white and carries no `dark-*` classes. Buttons use the shared `esc-btn` class and the brand button colours, and list bullets use the brand primary colour; check both on a brand whose primary colour is dark. Its endpoints are in [ESC TV publishing notes](../../../projects/esc/esc-tv-PUBLISHING.md).

**ESC TV Lead** (`esc-tv-lead`) has a personalised greeting with fallback, body copy, an optional topic list with `▸` bullets and an optional button. **Show topic list** and **Show button** are both on by default; with both off only the greeting and copy remain. No master-template CSS was added for it; run the usual Subscriber Preview, Outlook and dark-mode proofs before client use. Its solid CTA uses no border, zero table spacing and the brand fill on both table and cell. The 24px text line plus 12px padding above and below gives a 48px button height, avoiding the previous 50px height from two 1px borders. Text wrapper cells also carry explicit 24px exact line heights. Verify a fresh send in Windows Outlook, including 100% and 125% scaling; these mitigations do not certify Word rendering.

**ESC TV Story Card** (`esc-tv-story-card`) has the same 20px side margins on the navy background, with a white card holding a linked image (top corners rounded), headline, optional description and optional button. The card table has `overflow: hidden` and a 12px radius like Newsletter Story Card, with the radius repeated on the image and the text cell for clients that ignore `overflow`. The image uses the same **Card image height in Outlook (px)** field: 0 means 328px for a 1920 × 1080px image, so enter the displayed height for any other shape. It uses the `dark-bg-card`, `dark-invert` and `dark-body` classes, so in dark mode the card follows the shared dark card colours while the navy stays.

**ESC TV 2 Col** (`esc-tv-2-col`) is the dark-theme layout of Newsletter Story Card 2-col on the ESC TV navy: one white 16px-radius card holding two stacked-on-mobile columns, each with a linked image (12px radius), headline, optional description and optional "link text →" link. It reuses the shared `block`, `gap`, `mobile-hide` and `news-card-stack-first` classes for stacking and the `news-card dark-bg-card` classes for dark mode. There is no category label. Its description fields set a link style (bold, underlined, `#ae1022`) so links typed into the copy match the design; the Lead and Story Card descriptions keep the default inherited link colour. Card image height in Outlook defaults to 148px for a 1920 × 1080px image at 260px wide.

**ESC TV Button Row** (`esc-tv-button-row`) shows “Get reminders”, “Previous episodes” and “Become a member” on the navy background. All three are shown by default; buttons 2 and 3 can be hidden independently. Each button has editable text, link and style (primary brand colour, solid white or white outline). It follows the Congress Button Row table/stacking structure and uses narrower horizontal button padding to keep the supplied labels on one line at 620px. The primary button uses the existing brand AMPscript, so select the appropriate ESC TV brand in Email settings. Link defaults remain the ESC homepage until campaign destinations are supplied. Existing saved visibility choices are retained. The row uses 4px horizontal cell padding, exact wrapper line heights and explicit button-cell fills. Solid/white buttons have no border and 12px vertical padding; the outline uses a 2px white cell border (with `mso-border-alt: solid #ffffff 1.5pt`) and 10px vertical padding, so border plus padding is 12px per edge. All styles total 48px high and reset table spacing to zero. The outline table itself has no border; the cell draws it so Windows Outlook does not have to render a CSS-only table border. The outline retains its transparent hover background and navy cell fill for readable white text. Verify the saved output in a fresh Windows Outlook send.

**ESC TV Disclaimer** (`esc-tv-disclaimer`) contains two required, editable plain-text statements matching the supplied funding and independence wording. Both are centred in white Mulish text at 12px/16px on the same navy wrapper, with 8px fixed-height spacers above, between and below. It reuses the standard 620px outer table, 20px side cells and responsive `content-inner`/`sect` classes. Text wraps naturally on mobile; no new master-template CSS is required.

## Shared email settings (1.28.0)

The additional **ESC / Email settings** suite contains one settings-only block for both Newsletter and Congress. It exposes Brand and Footer logo, with no category or header-prefix control. All 31 supported brand keys are listed, with Council and Working Group labels. The original 40 modules remain unchanged. Follow [the integration guide](../../../integrations/esc/email-settings/README.md) to update the setup snippet and initialisation/CSS ordering; publishing the editor alone does not install these SFMC changes.

## Supplied module inventory

[ESC module spreadsheet](reference/ESC-Block-Studio-Modules.xlsx) is a preserved reference snapshot supplied with the repository. It predates the shared Email settings block and some later field changes. Use the current Studio projects and generated publishing notes for the maintained module/field definitions and URLs; do not treat this spreadsheet as a second source of truth.
