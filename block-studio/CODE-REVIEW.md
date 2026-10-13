# Code cleanliness review - 1.21.1

Reviewed on 11 October 2026 against current MDN, web.dev and npm documentation. These are established practices still applicable in 2026, not reasons to replace a working app with a new framework.

## Principles and decisions

| Principle | How Block Studio applies it |
| --- | --- |
| Measure first; remove unnecessary work | Recovery availability now compares recoverable content directly. HTML typing no longer validates/renders an invisible preview. Validation runs when opening the visual preview or applying the fix. |
| Ship only what the user needs | SFMC gets the shared renderer, SDK and controls. Rich-text code is included only for blocks with rich-text fields. Studio authoring/history/export tools stay outside those bundles. |
| Keep dependencies explicit and proportionate | No framework or new production dependency added. ZIP tests now use the exact bundled JSZip distributed with Studio instead of an undeclared ambient npm installation. Happy DOM and Prettier remain pinned development dependencies. |
| Keep state ownership clear | Browsing code reads the saved module. The first actual code edit creates a separate pending snapshot. Returning to the saved source releases it. Removed/replaced module objects are pruned from the pending-draft map. |
| Avoid unnecessary synchronous storage | Identical workspace saves skip `setItem`, while still checking for another tab's changes first. Real edits remain immediately saved. |
| Readable source, repeatable builds | Formatted the HTML entry point and rewrote the dense build script into named functions with explicit UTF-8 handling. Generated export assets remain byte-identical. HTML is now included in the format check. |
| Guard behaviour and payload growth | Regression checks cover hidden previews, invalid edits, recovery comparison and storage conflicts. Runtime byte budgets are part of `npm test`. |

Removed the unused `previewDocument` wrapper. No speculative framework, generic state library, build dependency, worker or service worker was introduced. Existing `app.js` remains the workflow coordinator; a large file alone is not evidence that another abstraction would improve it.

## Measured results

The recovery-availability comparison was benchmarked in Node 24.19.0 against the largest supplied ESC module by JSON size, `story-card-3col` (86,514 bytes). Both paths were warmed up 100 times; the median of five runs of 1,000 checks was:

| Operation | Previous | Current |
| --- | ---: | ---: |
| 1,000 recovery availability checks | 539.11 ms | 150.83 ms |

This is approximately 72% less time for this specific operation. It is not a browser responsiveness measurement or an overall speed-up claim. The meaningful structural improvement is that icon data and export metadata are no longer copied just to decide whether a button should be enabled.

| Generated SFMC asset | Raw bytes | Review budget |
| --- | ---: | ---: |
| Standard JavaScript | 60,808 | 65,000 |
| JavaScript including rich text | 80,415 | 85,000 |
| Shared editor CSS | 9,760 | 11,000 |

These are project-specific guardrails, not universal industry thresholds or compressed transfer sizes. `npm run check:size` reports them. Increase a budget only after reviewing the added functionality and its cost. The offline Studio also embeds client templates, fonts and export assets; its size is reported separately because that data is not downloaded by each SFMC block.

## Deliberate trade-offs

- The standalone app works from a local HTML file without a server. Its embedded assets duplicate generated material by design; source files remain the single maintenance point. Runtime code splitting already separates rich-text and ordinary blocks. Further splitting needs actual loading measurements to justify the extra requests and offline complexity.
- Browser draft storage still serialises the workspace synchronously for real changes. Duplicate writes are removed, but this is not an unlimited-scale datastore. A much larger multi-client workspace would warrant measurement and potentially IndexedDB with an explicit migration/recovery design. This sweep does not claim that scale has been verified.
- Shared rendering code and old hosted runtimes were deliberately retained. Runtime files are versioned by content hash; existing URLs must stay byte-stable.
- JSON copies are retained at transaction/export boundaries because project data is JSON. They were removed from repeated read-only operations, not replaced globally without a behavioural reason.
- CSS cascade changes beyond confirmed defects need real layout verification. No speculative bulk removal of responsive or branding rules was made.

## Development and verification

Use `npm ci --prefix block-studio` for locked development dependencies. Then run `npm run build`, `npm test` and, inside `block-studio`, `npm run format:check`. The test runner uses the shipped ZIP library. Live browser tests require Playwright separately and remain an explicit opt-in command.

186 automated tests pass. The ESC audit compares all 40 modules against the supplied runtime over 6,728 cases, repeated after 275 field-editor saves. Existing published files remain unchanged. See VALIDATION.md for the current verification record.

A fresh offline `npm ci` check was attempted in an isolated directory but could not complete because the local npm cache lacked `ws-8.22.0.tgz`. Existing installed dependencies passed the suite. This is not evidence of a successful clean install, a dependency security audit, live-browser performance, accessibility conformance or SFMC validation.

## Sources

- [MDN: JavaScript performance optimisation](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript) - measure first, minimise code and prefer suitable native features.
- [web.dev: Optimise Interaction to Next Paint](https://web.dev/articles/optimize-inp) - reduce work in interaction handlers and avoid blocking the next paint.
- [web.dev: Code-split JavaScript](https://web.dev/learn/performance/code-split-javascript) - load what is needed while balancing bundles and network requests.
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) - synchronous storage costs and asynchronous alternatives.
- [npm: npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) - locked, reproducible dependency installation.
