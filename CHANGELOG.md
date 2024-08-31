# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-alpha.8] - 2024-08-31

### Added

- Added `export-only` as a hidden option for CLI app
  - This can help with running the web-app in dev mode, since the audit report
    can be watched & re-exported without having to re-visualize it each time

## [v1.0.0-alpha.7] - 2024-06-02

### Changed

- Updated styles of table visualizer

## [v1.0.0-alpha.6] - 2024-06-02

### Added

- Added retry logic to the web-app server for when ports are already being used

## [v1.0.0-alpha.5] - 2024-06-01

### Added

- Added styles for metadata cards

### Changed

- Changed color palette for severity levels

## [v1.0.0-alpha.4] - 2024-05-02

### Added

- Added logs to pre-commit & pre-push git hooks
- Added code to AuditReport parser that will generate ID's (sha256 hashes) for
  each vulnerability
  - This will make them easier to work with in the Web App since React requires
    element keys to be unique
- Implemented basic vulnerability table visualizer
- Added shared utility type `ValueOf`

### Changed

- Updated `sortVulnerabilitiesBySeverity` to accept a `sortOrder` argument
- Updated `createVulnerabilityTable` to sort vulnerabilities in descending
  order of severity (critical -> low)
- Updated `VulnerabilitySchema` to include `id` as an optional field

## [v1.0.0-alpha.3] - 2024-04-29

### Added

- Defined new constant `SEVERITY_COLOR_MAP` which maps severity levels to a
  color
- Added new colors
  - red, yellow, limeGreen, green, grey, purple, blue

### Changed

- Vulnerabilities are now sorted by their severity in the AuditReport/Parser
  module
  - This is so that vulnerabilities are grouped by their severity e.g. all
    critical vulnerabilities will be lined up next to each other in a sequence
- Replace incoming & outgoing edge colors with purple & blue respectively
  - Since `COLORS.coral` will be used to represent `high` severity
    vulnerabilities
- Non-neighboring nodes will now be colored `COLORS.grey` when a node is hovered
  - This is so that the hovered node & its neighbors can be more easily
    distinguished

## [v1.0.0-alpha.2] - 2024-04-14

### Added

- Defined `light` and `dark` colors for web app
- Added `root` as new path alias
- Created new hook `useParsedAuditReport`
  - This contains all logic related to reading the exported
    `parsed-audit-report.json` into the web app domain
- Created Visualizer component
- Added new dependencies to web app
  - sigma, react-sigma, graphology, graphology-types
- Added `label` and `size` attributes to graph nodes
- Added `size` attribute to graph edges
- Added new scripts to `web-app` package.json
  - `predev` copies `parsed-audit-report.json` from the root build directory
    into `WebApp/public`
    - For the web-app to work in dev mode (`npm run dev`), it requires a
      `parsed-audit-report.json` to be present in `WebApp/build`
    - **Note:** This does require that `npm run dev` is run within the root
      project directory first, so that a `parsed-audit-report.json` is exported
  - `clean` ensures that `WebApp/build` starts from a clean slate each time &
    that `parsed-audit-report.json` is not stale
  - `prebuild` ensures that `clean` runs before every build, including at the
    publish stage for `prepack`
- Added new dependencies
  - `graphology-layout`
  - `del-cli`
- Temporarily mocked Visualizer component in `App` test suite
- Added new components `VulnerabilityGraph`, `GraphLegend`
- Added `constants.ts` to track constants like color hexcodes

### Removed

- Removed `shadcn` and related dependencies + code changes
- Removed `vite.svg` link from `index.html`

### Changed

- Replaced `@` path alias with `src`
- Refactored `App` test suite to use mock of `useParsedAuditReport` hook
- Rehoused `Tab` and `TabList` components in their own separate files
- Replace normal edges with directed edges
- Re-organized structure of `Visualizer` component
- Changed shade of `dark` color from `#162026` to `#212326`

## [v1.0.0-alpha.1] - 2024-04-10

### Added

- Added `--port` flag

## [v1.0.0-alpha.0] - 2024-04-10

- First Release

[v1.0.0-alpha.7]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.6...v1.0.0-alpha.7
[v1.0.0-alpha.6]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.5...v1.0.0-alpha.6
[v1.0.0-alpha.5]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.4...v1.0.0-alpha.5
[v1.0.0-alpha.4]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.3...v1.0.0-alpha.4
[v1.0.0-alpha.3]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.2...v1.0.0-alpha.3
[v1.0.0-alpha.2]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.1...v1.0.0-alpha.2
[v1.0.0-alpha.1]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.0...v1.0.0-alpha.1
[v1.0.0-alpha.0]: https://github.com/nrednav/npm-audit-visualizer/releases/tag/v1.0.0-alpha.0
