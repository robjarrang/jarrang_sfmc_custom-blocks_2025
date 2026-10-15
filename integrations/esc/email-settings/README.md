# ESC email settings

One shared custom block for all ESC starter emails. Users choose **Brand** and **Footer logo**. There is no email-category or header-prefix control.

## Install once

1. Commit/push this repository through Tower. Pages continues to publish from the branch's `/docs` folder.
2. Register the new custom block endpoint in SFMC:
   `https://robjarrang.github.io/jarrang_sfmc_custom-blocks_2025/clients/esc/email-settings/modules/email-settings/`
3. Replace the contents of the existing **ESC_SNIP_Master_Setup** code snippet with `ESC_SNIP_Master_Setup.ampscript` from this folder. Keep its Customer Key **ESC_SNIP_Master_Setup**. The explicit footer choice takes precedence; emails without it retain the old category rules.
4. In each starter email, replace the old settings code snippet with **one Email settings custom block**, before the existing master-setup call. Keep the master-setup call once, outside the custom block:

   ```ampscript
   %%=ContentBlockByKey("ESC_SNIP_Master_Setup")=%%
   ```

5. Place the brand-dependent CSS after that call, before visible email content. `ESC-Email-Example.html` demonstrates the complete ordering using the email supplied for this task. `Brand-Dependent-Styles.html` is the exact trailing group of style blocks moved from its head, including the Outlook conditional styles. Move this group; do not add a duplicate copy. Keep the earlier static head styles in place.
6. Check a new email and a saved/reopened block in SFMC. The settings summary is editor-only. Subscriber Preview and a controlled send must resolve the actual branding. Confirm there is no summary or blank spacer in the sent email, and check the relocated CSS on the normal desktop/mobile, Outlook and dark-mode proofs.

The example is the supplied populated email with revised settings/CSS ordering, not a reconstruction of Content Builder's editable master-template regions. Apply the same change to the actual starter/master layout. The block must stay ahead of initialisation; the standard Block SDK cannot enforce its position or prevent someone inserting it twice. Include it once in each starter email and test the final result.

## Choices

- **Brand** selects the row in the existing `BrandSettings` Data Extension. All 32 supplied keys are included, preserving the spelling of `C-Gen`. Council and Working Group choices are labelled accordingly. No brand records or API credentials are embedded.
- **Footer logo → Selected brand** uses the selected brand's footer logo and the existing URL/alternative-text defaults.
- **Footer logo → ESC** uses the main ESC footer logo, ESC homepage and ESC alternative text. Footer colours still follow the selected brand.

There is no automatic Data Extension synchronisation. To add confirmed brands, open **ESC / Email settings** in Studio, edit the **Brand** field, and add each display label and exact `BrandSettings.BrandKey` as a dropdown option. Values support letters, numbers, underscores and hyphens, up to 80 characters. Save the template and commit/push with Tower. Existing dropdown choices must be retained for saved emails. Both email suites use this same shared endpoint.

Changing a settings block does not execute AMPscript in the editing canvas or in Studio. Use SFMC Subscriber Preview to check the resulting full email. Missing brand records continue to produce the existing explicit setup error.

## Files and compatibility

- `projects/esc/email-settings.jarrang.json`: editable settings suite, including both PNG icons.
- `docs/clients/esc/email-settings/`: generated editor and catalogue.
- `ESC_SNIP_Master_Setup.ampscript`: updated setup source. Transport escaping in the supplied Markdown was removed; existing assignments, URLs and fallbacks were retained apart from the new footer-selection branch.
- `ESC-Email-Example.html`: revised supplied email example. Its existing module content is unchanged.
- `Brand-Dependent-Styles.html`: exact relocated CSS group for integration.

Existing Newsletter/Congress modules and their runtime dependencies are unchanged. Existing emails without `@FooterLogoMode` retain their category-based footer rules. The master setup still handles legacy `@EmailType` header defaults. The separate `ESC_GLOBAL_Footer` source was not supplied, so any further category-dependent behaviour inside it has not been changed or certified.

No live SFMC assets are changed by downloading this package. Complete the installation and live checks above before client rollout.
