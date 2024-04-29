# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0-alpha.2] - 2024-04-29

### Added

- CLI
  - Parser
    - Added `label` and `size` attributes to graph nodes
    - Added `size` attribute to graph edges
- WebApp
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

### Changed

- CLI
  - Parser
    - Replace normal edges with directed edges
- WebApp
  - Re-organized structure of `Visualizer` component
  - Changed shade of `dark` color from `#162026` to `#212326`

## [v1.0.0-alpha.0] - 2024-04-10

- First Release

## Resources

- [Keep a changelog](https://keepachangelog.com/)
