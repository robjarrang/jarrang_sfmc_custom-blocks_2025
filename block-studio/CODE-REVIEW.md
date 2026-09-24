# Debt remediation - 1.9.5

The earlier review used “technical debt” too broadly. A large workflow file is not automatically a defect, and an unexecuted browser check is a validation gap. The specific issues have now been separated and addressed:

| Issue | Action | Status |
| --- | --- | --- |
| Dense hand-written source | Formatted JavaScript, CSS, scripts and tests with pinned Prettier; added format and format:check commands | Fixed |
| Formatting regresses between changes | Added package.json, package-lock.json and .prettierignore; excludes generated assets and vendor code | Fixed |
| Unused inspector/order styling | Removed confirmed unused field-inspector and field-order rules, including responsive overrides | Fixed |
| Preview code mixed with workflow | Dedicated preview module with explicit inputs and readable message handling | Fixed in 1.9.4 |
| Historical browser tests presented as current | Labelled historical suites and added tests/browser-regressions.cjs for current preview selection, viewport switching, focus, reordering and editor click alignment | New suite prepared; live execution blocked |
| Missing repeatable checks | npm test runs syntax checks and 87 automated tests; npm run format:check enforces formatting | Fixed |

## Commands

`npm ci` installs the pinned development formatter. `npm run format` formats hand-written code; `npm run format:check` checks it. `npm test` requires only Node. `npm run build` requires Python 3. The distributed app still runs without npm or a server.

`npm run test:browser` runs the current browser regression suite. It requires Playwright available through PLAYWRIGHT_MODULE or normal Node resolution, plus a browser executable (optionally CHROMIUM_EXECUTABLE). It is intentionally separate from simulated tests. The older four browser suites remain labelled historical to preserve their previous scenarios; they are not current pass evidence.

## Outstanding validation

Local app browser access was denied by the environment security policy. The new browser suite has been syntax-checked but not executed. Visual CSS consolidation beyond confirmed unused rules is therefore deferred: responsive and branding overrides may be intentional and removing them without layout verification would risk regressions. Live SFMC validation also remains outstanding. No claim of zero bugs or zero future maintenance is made.

## Generated files

Edit src/ and index.html. Edit brand-theme.css instead of brand.css. build.py regenerates brand.css, export-assets.js, Open-Block-Studio.html and docs/studio/index.html. Embedded duplication supports the offline standalone distribution; it is not separately maintained source. Rebuild after source edits. Formatting shared runtime sources changes the content hash; old published runtime folders must be preserved.
