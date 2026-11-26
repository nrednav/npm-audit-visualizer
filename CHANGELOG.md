# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic
Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The payload version is now `4`. The graph carries a required `derivation`, so a
  version-3 payload is refused by name.

### Added

- The graph states that it is derived from the `via` relationships npm reported,
  and says it is not a complete dependency tree. The page shows that sentence
  wherever it draws the graph.
- The payload version is now `3`. Two descriptor fields became a union of a value
  and an unknown, so a version-2 payload is refused by name. A `null` no longer
  states an absence in the descriptor.

### Added

- Four evidence origins: `reported`, `observed`, `derived`, and `asserted`.
  `unknown` is a knowledge state and is refused as an origin, because an origin
  says where a value came from and a value that does not exist has none.
- An unknown carries the reason it is unknown, and the page shows that reason
  beside the field. The descriptor's creation time and producer version are the
  first unknowns, because npm states neither.

### Added

- The payload carries `sources`, one descriptor per artifact it was built from.
  A descriptor names the artifact kind, its producer, the artifact's own schema
  version, and a label. A creation time stays `null` when the report states none,
  and the page shows `not supplied` rather than guessing from a file's
  modification time. The label is the file's own name with no directory, or a
  phrase for an automatic audit, so a local path never reaches the page.
- The interface shows the report's source, producer, and creation state beside
  the scope counts.
- The payload carries `schemaVersion`, so the page can tell whether the report it
  received is one it can read. A different, missing, or wrongly typed version is
  a named compatibility failure that shows no findings, instead of an empty
  report. The field is documented in the [CLI and payload
reference](docs/cli-reference.md).

## [v1.0.0-alpha.11] - 2026-11-26

### Added

- `docs/vocabulary.md` gives one meaning each to reported, derived, asserted,
  unknown, exception, and verification incomplete, and the README links to it
- The README states the charter: what the tool reports and what it leaves to
  npm and to the reader
- Running the command with no arguments now audits the project in the current
  directory. It runs `npm audit --json` there and serves the result, so you no
  longer generate a report file and pass it in. `--file` remains for a saved
  report and runs no audit
- A valid audit report is accepted even though `npm audit --json` exits nonzero
  when it finds vulnerabilities. The exit status matters only when the output is
  not a valid report, and the message then names the status and npm's error
- Automatic-audit failures are distinguished: npm could not start, the caller
  interrupted, output passed 16 MiB, or npm exited without a valid report
- Each severity level now has its own silhouette, drawn in the table's pill, the
  severity ledger, and the graph legend. Severity was previously carried by
  colour and by the label's text, so a greyscale print or a colour-vision
  difference showed one level as another. The five shapes step from an octagon
  to a circle, which keeps the rank legible as well as the level
- Light and dark themes with operating-system detection, a header switch, and
  locally persisted explicit preferences
- Theme-aware severity, relationship, graph, and control colours
- Severity-ledger filtering, finding search, and a fix-available filter
- Responsive card rows for small screens
- Keyboard-operable view switch and pagination
- Directional animated dashes and arrowheads for selected graph edges, with a
  static reduced-motion fallback
- Continuous, constant-speed graph flow without a visible pause between loops
- `check:support` reads `.nvmrc` and the official Node.js release schedule, then
  exits 0 for an LTS or maintenance line, 1 for a line that has ended or has not
  entered LTS, and 2 when the schedule cannot be read
- `verify.yml` installs the pinned runtime on Ubuntu, installs
  strictly from the lockfile, checks that the running npm matches
  `packageManager`, and runs the full `npm run check`
- `drift.yml` repeats that verification every Monday, then audits the resolved
  graph, checks every direct dependency against the registry, and checks the
  Node line against the official release schedule
- `dependabot.yml` proposes npm and GitHub Actions updates weekly, grouping
  minor and patch changes and leaving majors reviewable on their own. Nothing
  is merged automatically
- Tests guard the support policy, the automation contracts, the typed Node
  major, the strict install settings, and the lockfile's engine agreement

### Changed

- The empty state describes the report rather than the project: it says the
  audit report lists no vulnerabilities instead of calling the project clean
- npm's `nodes` are presented as install locations, and "Reach" is renamed
  "Position". The reader is no longer told to follow a chain to a direct
  dependency
- Severity is presented as the level npm reported, and ordering critical first
  is a default rather than a claim about risk
- A fix is labelled "Reported fix" with its version and any major-change note,
  or "No fix reported". A reported change is no longer called a resolution
- Search covers advisory titles, advisory URLs, CWE identifiers, and fix
  targets, which is what the placeholder promised
- The report map no longer claims where the report came from
- The toolchain now rests on Node.js 26.13.1, an Active LTS line supported until
  2029-04-30, instead of Node.js 20.19.0, which reached end of life on
  2026-04-30. `.nvmrc`, `.node-version`, both engine declarations, the lockfile,
  the TypeScript libraries, and the host bundle target move together
- Every direct dependency now resolves to its latest stable release: TypeScript
  7, Biome 2, Vite 8, Vitest 5, React 19, Tailwind CSS 4, Zod 4, Sigma 4,
  graphology 0.26, jsdom 31, tsup 9, and their companions
- `packageManager` declares `npm@11.20.0`, the version Node.js 26.13.1 ships,
  so one runtime download reproduces the documented setup. `.npmrc` sets
  `engine-strict` and `save-exact`, so an install on another
  runtime stops instead of producing a tree that was never verified, and a new
  dependency is written at one exact version
- The graph's hover treatment is expressed as Sigma 4 node state instead of a
  hand-drawn canvas hover. A hovered node rises above its neighbours, its label
  carries a surface that follows the theme, and its neighbours take the
  direction colour of the edge that connects them
- Tailwind CSS 4 is wired through `@tailwindcss/postcss` with a CSS-first entry
  that keeps the existing token config. Dark mode remains a class on the
  document, so the surface tokens keep their single source
- Zod records name their key schema explicitly, and the payload failure message
  reads issue paths that may contain any property key
- The repository is now one npm workspace with three packages: a contract that
  both runtimes load, a host that turns a report into a page, and a surface that
  draws it. One lockfile, one Node pin, one formatter, one test runner, and one
  explicit build order replace the nested `web-app` project
- Severity order, the payload shape, and the graph shape are defined once and
  imported by both sides. The parser ranked six levels and the web app ranked
  five; they no longer disagree
- The graph payload is a list of nodes and edges, not a graphology
  serialisation. `graphology` and `sigma` are no longer dependencies of the
  published command
- The surface has three states rather than two: loading, failed with a printed
  cause, and loaded. A failed request can no longer be drawn as a report that
  happens to hold no findings
- The published command has no runtime dependencies. `yargs` is replaced by
  `node:util` `parseArgs` and `serve-handler` by an explicit static handler
- Rebuilt the web-app presentation around an audit briefing, severity ledger,
  and evidence-first explorer
- Replaced raw audit fields in the table with plain-language reach, fix, and
  evidence summaries plus expandable row detail
- Reworked the graph frame, legend, hover isolation, and control styling
- Separated critical, high, and moderate into distinct rose, orange, and amber
  palettes, and coloured both relationship labels and line samples
- Added a documented design system contract, tokens, and reduced-motion path

### Fixed

- A clean install now works on the pinned Node version. The pin is 26.13.1,
  which satisfies every upgraded package's engine range, and the undeclared
  Husky, lint-staged, and `type-check` hook path has been removed
- `npm ci` failed with `EBADENGINE` on a lockfile that still declared the
  previous engine. The lockfile is now checked against the manifest
- A `node_modules` carried over from another platform no longer masks a broken
  build. The native Rollup package is installed for the host platform, and the
  suite starts from a clean install
- Replaced Sigma's hardcoded white hover-label background with a theme-aware
  surface so graph labels remain readable in dark mode
- Reading a report now separates five outcomes that were previously one: no such
  file, an unreadable file, a file that is not JSON, JSON that is not an audit
  report, and a report of a version this tool does not read
- Every vulnerability used to gain an edge to itself in the graph, because an
  advisory's `name` is the vulnerable package. An advisory now contributes no
  edge
- `npm run dev -- --file audit.json` now forwards the flags and resolves the
  report from the directory where the command was invoked, rather than dropping
  `--file` or looking for the report under `packages/host`
- `process.exit` no longer appears inside a module. Modules return a result and
  the entry module assigns the exit code once
- The port retry no longer mutates one shared port across callbacks or re-listens
  a server that already failed. One server per attempt, and the port reported is
  the one actually bound
- Port `0` is accepted and reported as the port the operating system chose
- An unknown path is answered `404` rather than with `index.html`, so a missing
  asset is reported as missing
- `npm install` no longer fails when the workspace has no `.git` directory;
  Git hooks are installed only when repository metadata is present
- `npm run dev:web-app` now creates the export and public directories when
  they do not exist
- Development commands and tests no longer require `build/main.js` to exist
  before the source entrypoint can start
- Restored Sigma's base stylesheet so the graph canvas has dimensions and its
  controls remain anchored instead of rendering as full-width rows
- Centred Sigma control icons by matching the button and container sizes,
  resetting Sigma's legacy clipping rule, and sizing the SVGs explicitly
- Removed faint resting-state graph edges that could appear as stray artifacts

## [v1.0.0-alpha.9] - 2025-05-26

### Changed

- Updated dependency versions for tool and web-app module

### Fixed

- Fixed vulnerabilities that were fixable via (npm audit fix)

## [v1.0.0-alpha.8] - 2024-08-31

### Added

- Added `export-only` as a hidden option for CLI app
  - This can help with running the web-app in dev mode, since the audit report
    can be watched & re-exported without having to re-visualize it each time
- Added project scripts
  - prebuild
  - web-app dev
- Added dependencies
  - web-app
    - vite-tsconfig-paths
- Setup tsconfig paths plugin in vite config

### Changed

- Renamed files & folders and updated import paths
  - AuditReport -> audit-report
  - WebApp -> web-app
  - Component files & folders from PascalCase to kebab-case
- Updated import paths to be absolute in most cases
- Updated `tsconfig.json` for web-app
  - Added import re-maps for `src/*`
  - Removed `../../../*` from list of includes
- Split vitest config from vite config into separate file

### Removed

- Removed `src` resolve alias from vite config

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
