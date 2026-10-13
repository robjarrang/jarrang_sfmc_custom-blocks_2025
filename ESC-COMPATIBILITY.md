# ESC suite compatibility review

Reviewed 10 October 2026 against the supplied repository. Verified Studio release: 1.20.1.

## Independent round-trip verification (1.20.1)

The current Studio imported both templates directly from the original supplied repository ZIP and exported them again. The test then executed each original and newly exported runtime in separate DOM simulations. This comparison uses the supplied runtime as its reference, rather than comparing the new renderer with itself.

| Check | Result |
| --- | --- |
| Original repository import and full-template export | Both templates passed: 27 Newsletter and 13 Congress modules |
| Embedded module definitions | All 40 exactly match the original JSON definitions |
| Icons | All 80 PNG files are byte-identical |
| Runtime/CSS references | All exported asset paths resolve inside the generated ZIPs |
| Exported repository reopened | Both templates reopen with matching module definitions |
| Rendered email HTML | 6,728 cases match the supplied runtime byte for byte |
| Dropdown/show-hide combinations | All 6,119 combinations across each module's top-level controls match |
| Edited values | 492 cases, including repeated child values, links, formatting, colours and lists, match |
| Repeat lengths | Every configured item count tested for each repeating group |
| Structural checks | 2,326 distinct outputs pass the authoring tag-structure check |
| Routine field maintenance | Open/save all 275 top-level fields, including their connection and Advanced tabs; rerun all 6,728 cases with identical output and no export blockers |
| Existing regression suite | 167 tests pass, including guided-rule support for all 235 ESC conditions and single-item conversion for all 11 repeating groups |

No production code changes were needed for this verification. Generated hosting pages use the current runtime assets, so the page files themselves are not expected to be byte-identical to the old pages. Email source, settings and icon artwork are preserved.

The combination check covers all top-level dropdown/toggle combinations per module. Repeat counts and edited values are additional cases, not an exhaustive cross-product of every possible content value and list size. Both renderers receive the same stable test block ID. AMPscript is preserved as source and is not executed.

Repeat with:

```bash
node block-studio/scripts/verify-esc.cjs /path/to/original-repository.zip /path/to/results
```

The script requires the same developer dependencies as the automated suite. It writes a per-module JSON result file plus two freshly exported template ZIPs. The result records the original archive's SHA-256 fingerprint. Browser layout, SFMC messaging/saved instances and real email-client rendering remain separate live release checks.

## What changed in the supplied suite

- 40 ESC modules: 27 Newsletter and 13 Congress, with 275 top-level controls and 305 field definitions including repeating-item fields.
- Runtime and authoring code are separated. Exported pages use one CSS bundle and either a lean JavaScript bundle or a rich-text bundle. The runtime displays inert defaults while waiting for SFMC and reconciles the standalone preview without reloading unchanged images.
- Rich text now includes bulleted and numbered lists, marker styles, inherited email typography and valid paragraph splitting around lists. Toggle fields default to switches.
- The 40 project definitions match their exported page definitions. 149 existing published files, including module pages, icon files and shared runtimes, were retained byte for byte in this delivery.
- 36 modules use 58×58 supplied icon pairs; the other four use the earlier generated 60×60 / 120×120 pair. Regenerating all icons would lose supplied artwork.

## Bug-fix follow-up (1.20.0)

See BUG-FIX-CHECKLIST.md for seven fixes in impact order and their regression evidence. Export validation now catches missing/misnested closing tags in representative rendered states, including common Outlook conditional branches. Last-exported definitions are saved separately from newer drafts, so exporting a single module does not prevent the repository from reopening. Field type/key changes update their template bindings transactionally. Failed saves lock rich-text controls as well as ordinary inputs, and repeater actions retain keyboard focus.

The bundled editable projects now include each module's exact exported definition as authoring metadata. This changes no existing hosted module or runtime. Re-export the affected modules to adopt the save-lock and focus fixes in SFMC.

## Authoring support follow-up (1.19.0)

The earlier compatibility checks protect existing saved SFMC values. They are not a substitute for supporting the features in the supplied blocks. This follow-up reviewed the actual editing workflow as well as rendering.

No unsupported runtime field type or template expression was found in the 40 supplied modules. Three authoring gaps were addressed:

| Existing ESC feature | Authoring gap | Implemented support |
| --- | --- | --- |
| Optional content, dropdown-driven layouts, compound conditions and item-position rules | Their rules could only be changed in template code | Field editor → Where it applies → Layout rules now exposes each existing condition, its comparison and value. Combined conditions can match all or any. All 235 supplied conditional expressions have a supported guided model. The surrounding branch HTML stays intact. |
| Child fields inside repeating groups | Client help, required values and character limits had no authoring controls | Each item field now has Guidance and limits, using the same settings as top-level fields. |
| Navigation, editorials and together-list item-position logic | Conversion to one item rejected loop counters | Converting to a single item resolves index/index0, first/last and length for one item while retaining its editable content. All 11 supplied repeating groups were checked. |

The review also found and fixed an unchanged rich-text save rewriting source content. Opening and saving all 275 top-level ESC controls now retains identical rendered output.

The guided rules edit existing conditions; creating or restructuring arbitrary branches still uses Advanced template logic. Custom expressions outside the guided grammar remain available in that code editor. AMPscript remains opaque SFMC code and is preserved, not executed in Studio.

## Gaps addressed in 1.18.0

| Gap | Change |
| --- | --- |
| ESC templates required separate manual imports | Fresh workspaces include both templates. Open repository folder reads the latest local projects and exported module assets after a Tower pull. Existing drafts require confirmation before replacement. |
| Editable projects did not retain supplied PNG artwork | Both PNGs are stored in editable project metadata and exported unchanged. Replacing them with generated artwork requires confirmation. |
| Field changes could invalidate existing SFMC values | Export compares existing fields against a saved publishing reference and blocks removal, type changes, lost dropdown choices and tighter validation. Incompatible changes use a duplicated module/new endpoint. |
| Default rendering did not check unused branches | Authoring validation checks references in every conditional branch and list schema, including empty lists. Field save and export surface broken references. |
| Root test command ran only a subset | Root npm test now runs the automated suite, including the new ESC integration checks. |
| Developer documentation described older limitations | Added a current maintenance handover and corrected the developer/testing guidance. |

## Feature coverage

| Feature | Supplied use | Support and limits |
| --- | --- | --- |
| Text, image and destination fields | Every template | IDs, mappings and defaults preserved; individual field edits and protected HTML fixes remain available. |
| Formatted text | 22 fields, including repeated items | Existing links, span colours, superscript/subscript and list controls retained. Locked link style and toolbar configuration remain developer settings. |
| Show/hide | 25 toggles | Both states tested; existing switch/checkbox settings retained. |
| Dropdowns | 19 controls | Every supplied option rendered, including theme, button, column/count and divider choices. |
| Repeating lists | 11 controls | Minimum and maximum item counts rendered; child fields and existing loop conditions retained. |
| Conditional layouts | Template mode in 35 modules | if/elsif/else, compound tests, nested conditions and loop counters remain in the existing engine. All-branch reference validation added. |
| AMPscript | ESC master-template branding and personalisation | Preserved byte for byte during quick edits. Requires the ESC master template and SFMC subscriber context; Studio does not execute it. |
| Outlook and responsive markup | Supplied email source | Existing source kept. Browser/DOM output is not a substitute for Outlook and mobile email tests. |
| Supplied icons | All 40 module pairs | Exact PNG bytes, names, dimensions and transparency survive export. |

## Verification

- The 1.19.0 baseline had 150 passing automated tests, including 13 ESC integration checks. Current results are recorded in BUG-FIX-CHECKLIST.md.
- 172 rendering cases cover all defaults, every dropdown option, both toggle states and repeat minimum/maximum sizes.
- Small HTML edits were validated for every module, retaining field IDs and AMPscript.
- Both full-template ZIPs were generated in tests and reopened to check page/runtime paths and every PNG pair.
- Folder import was tested for matching definitions, drift rejection and atomic replacement. A DOM simulation boots the complete Studio with both templates and checks icon preview plus preservation of existing browser drafts.
- The supplied suite had 137 passing tests before this work.

## Remaining release checks

Live browser interaction, SFMC installed-package loading/edit/close/reopen, and rendered emails in the required clients remain unverified here. In particular, test contenteditable caret/selection behaviour and rich-text lists in a real browser. Tests use happy-dom for DOM behaviour; no SFMC account or live endpoint was changed.

All supplied modules have empty preview context CSS. Their complete branding still depends on the email master template and its AMPscript values. Updating the hosted editor does not bulk-update content already stored in existing emails.

## Module inventory

| Template | Module | Controls | Lists | Toggles | Choices | Rich text | AMPscript |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Congress | attribution | 1 | 0 | 0 | 0 | 0 | Yes |
| Congress | button-row | 15 | 0 | 2 | 7 | 0 | Yes |
| Congress | checklist | 3 | 1 | 0 | 0 | 0 | Yes |
| Congress | conversation | 6 | 0 | 0 | 0 | 1 | Yes |
| Congress | deadlines-list | 3 | 1 | 0 | 0 | 0 | Yes |
| Congress | lead-editorial | 13 | 0 | 1 | 0 | 1 | Yes |
| Congress | lead-poster | 8 | 0 | 0 | 0 | 0 | Yes |
| Congress | personal-letter | 4 | 0 | 0 | 0 | 1 | Yes |
| Congress | section-header | 1 | 0 | 0 | 0 | 0 | No |
| Congress | spotlight | 6 | 0 | 1 | 0 | 1 | Yes |
| Congress | story-1col | 5 | 0 | 0 | 0 | 1 | Yes |
| Congress | story-2col | 14 | 0 | 0 | 0 | 2 | Yes |
| Congress | together-list | 3 | 1 | 0 | 0 | 0 | Yes |
| Newsletter | hero-story | 21 | 0 | 3 | 6 | 1 | Yes |
| Newsletter | checklist | 4 | 1 | 0 | 0 | 1 | Yes |
| Newsletter | navigation | 1 | 1 | 0 | 0 | 0 | No |
| Newsletter | table-of-contents | 2 | 2 | 0 | 0 | 0 | Yes |
| Newsletter | story-card-1col | 11 | 0 | 3 | 0 | 1 | Yes |
| Newsletter | story-card-2col | 23 | 0 | 6 | 1 | 2 | Yes |
| Newsletter | story-card-3col | 28 | 0 | 6 | 1 | 3 | Yes |
| Newsletter | feature-card | 9 | 0 | 2 | 0 | 1 | No |
| Newsletter | cta | 4 | 0 | 0 | 0 | 1 | Yes |
| Newsletter | image-banner | 3 | 0 | 0 | 0 | 0 | No |
| Newsletter | journal-section | 8 | 0 | 0 | 0 | 0 | Yes |
| Newsletter | link-list | 3 | 1 | 0 | 0 | 0 | Yes |
| Newsletter | membership-callout | 8 | 1 | 1 | 0 | 1 | Yes |
| Newsletter | quote | 3 | 0 | 0 | 0 | 0 | Yes |
| Newsletter | section-header | 3 | 0 | 0 | 1 | 0 | Yes |
| Newsletter | signature | 3 | 0 | 0 | 0 | 0 | Yes |
| Newsletter | social-block | 7 | 0 | 0 | 0 | 0 | Yes |
| Newsletter | speaker-grid | 19 | 0 | 0 | 1 | 0 | Yes |
| Newsletter | sponsor | 5 | 0 | 0 | 0 | 0 | No |
| Newsletter | video-embed | 7 | 0 | 0 | 0 | 1 | No |
| Newsletter | webinar-card | 7 | 0 | 0 | 0 | 1 | Yes |
| Newsletter | spacer | 1 | 0 | 0 | 1 | 0 | No |
| Newsletter | divider | 1 | 0 | 0 | 1 | 0 | No |
| Newsletter | decorative-header | 3 | 0 | 0 | 0 | 0 | Yes |
| Newsletter | events | 4 | 1 | 0 | 0 | 0 | No |
| Newsletter | editorials | 2 | 1 | 0 | 0 | 0 | No |
| Newsletter | text-block | 3 | 0 | 0 | 0 | 2 | No |
