# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

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

[v1.0.0-alpha.3]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.2...v1.0.0-alpha.3
[v1.0.0-alpha.2]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.1...v1.0.0-alpha.2
[v1.0.0-alpha.1]: https://github.com/nrednav/npm-audit-visualizer/compare/v1.0.0-alpha.0...v1.0.0-alpha.1
[v1.0.0-alpha.0]: https://github.com/nrednav/npm-audit-visualizer/releases/tag/v1.0.0-alpha.0
