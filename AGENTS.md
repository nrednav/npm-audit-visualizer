# AGENTS.md

## Scope

- This file applies to the whole npm workspace.
- The product obtains an `npm audit --json` report with `auditReportVersion: 2`, from a file or from an automatic audit of the caller's project, and serves a local React interface.
- The publishable CLI is `packages/host`, named `npm-audit-visualizer`. The other packages are private.
- Reports are user data. Serve them on loopback only and do not transmit them.

## Setup and environment

- Use Node.js `26.13.1` and npm `11.20.0` exactly. `.nvmrc`, `.node-version`, root `engines`, and `packageManager` declare the pins.
- Run `npm ci` for a clean install. Run `npm install` only when intentionally changing dependencies or the lockfile.
- `.npmrc` sets `engine-strict=true` and `save-exact=true`. Do not bypass either setting.
- Keep one root `package-lock.json`. Package-level lockfiles fail `test/toolchain-pins.test.ts`.
- When changing a workspace version, update every `@npm-audit-visualizer/*` dependency that references it to the same exact version.
- There are no install-time Git hooks. The local verification gate is `npm run check`.

## Commands

Run file-scoped and package-scoped commands while iterating:

```sh
npm test -- --project node test/boundaries.test.ts
npm test -- --project node packages/host/test/cli.test.ts
npm test -- --project surface packages/surface/src/components/severity-pill.test.tsx
npm exec -- biome check --no-errors-on-unmatched --files-ignore-unknown=true packages/host/src/cli.ts
npm run typecheck -w @npm-audit-visualizer/contract
npm run typecheck -w npm-audit-visualizer
npm run typecheck -w @npm-audit-visualizer/surface
npm run build -w @npm-audit-visualizer/contract
```

Run repository-wide commands from the root:

```sh
npm run check          # Biome check, typecheck, tests, then build
npm run lint
npm run format         # Writes formatting and import organization
npm run format:check
npm run typecheck
npm test
npm run test:watch
npm run build          # contract, then surface, then host
npm run dev -- -f path/to/audit.json
npm run dev -- -d -f path/to/audit.json --port 3000 --no-open
npm start -- -f path/to/audit.json --no-open
npm run dev:surface
npm run check:support
```

- `npm run dev` builds before starting. `npm start` runs the existing `packages/host/dist/main.js` and does not build first.
- `npm run dev:surface` starts Vite with hot reload. It needs a host server providing `/report.json`.
- The CLI defaults to port `1248`, tries subsequent ports, and opens a browser unless `--no-open` is passed.
- With no `--file`, the CLI runs `npm audit --json` in the directory it was started from. With `--file`, it runs no audit.
- The audit adapter caps combined child output at 16 MiB and terminates the child on abort or on exceeding the cap.

## Code style

- Use TypeScript ESM with strict compiler settings. Use two-space indentation, double quotes, semicolons, and trailing newlines. Let Biome format code.
- Use named exports, arrow functions, and explicit return types in shared and host modules. Follow existing React component export conventions in the surface.
- Use `.js` extensions for relative imports in `contract` and `host`. The surface uses bundler resolution and the `src/*` alias.
- Use `import type` for type-only imports where `verbatimModuleSyntax` applies.
- Define report and payload shapes with Zod in `contract`. Derive TypeScript types with `z.infer` instead of declaring duplicate shapes.
- Model failures and UI states as discriminated unions. Return failures to the caller instead of terminating the process.
- Put comments on constraints and reasons, not on obvious syntax.

```ts
import { z } from "zod";
import { SeveritySchema } from "./severity.js";

export const FindingSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  severity: SeveritySchema,
  direct: z.boolean(),
});

export type Finding = z.infer<typeof FindingSchema>;
```

## Testing

- Vitest has two projects. `node` covers root tests, `contract`, and `host`. `surface` uses jsdom for colocated `.test.ts` and `.test.tsx` files.
- Put contract tests in `packages/contract/test`, host tests in `packages/host/test`, and surface tests beside their source.
- Reuse audit fixtures in `packages/contract/test/fixtures`. Add synthetic fixtures rather than committing private reports.
- Tests alias `@npm-audit-visualizer/contract` to source, so unit tests do not require a prior build.
- Root artifact and development-command tests call `ensureBuild()` and can build the workspace. Do not skip them when artifacts are absent.
- The `node` project sets `fileParallelism: false` because several test files share one built tree. Do not enable parallel node test files without removing that shared-state hazard.
- `test/boundaries.test.ts`, `test/toolchain-pins.test.ts`, and `test/automation.test.ts` enforce architecture, pins, and CI policy. Update them deliberately when policy changes.
- Run the focused test for a change, then run `npm run check` before finishing.

## Project structure

| Path                        | Responsibility                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/contract/src`     | Zod report and payload schemas, shared types, severity order, and `REPORT_ROUTE`          |
| `packages/host/src/main.ts` | Entry module, signals, output streams, browser opening, and the sole exit-code assignment |
| `packages/host/src/cli.ts`  | Argument parsing, defaults, usage text, and exit-code selection                           |
| `packages/host/src/report`  | Report acquisition, validation, and payload construction                                  |
| `packages/host/src/serve`   | Loopback HTTP server, routes, and static-file handling                                    |
| `packages/surface/src`      | React application, components, hooks, table, and graph views                              |
| `test`                      | Cross-package artifact, boundary, toolchain, automation, and development-command tests    |
| `docs`                      | CLI, payload, and report-reading documentation                                            |

- Dependencies point only from `host` to `contract` and from `surface` to `contract`.
- `contract` imports only its own modules and `zod`. It must remain runtime-neutral.
- `surface` must not import `host` or Node builtins. `host` must not import surface source, `graphology`, or `sigma`.
- The host build bundles the CLI and copies `packages/surface/dist` into `packages/host/dist/surface`.
- Treat `dist` directories as generated output. Do not edit them directly.

## Git workflow

- Branch from `main`. Use short imperative commit subjects, matching the existing history.
- Keep dependency changes and the root lockfile in the same commit.
- Run `npm run check` before committing or opening a pull request.
- CI runs `npm ci`, checks the npm version against `packageManager`, then runs `npm run check` on Ubuntu.
- Pin external GitHub Actions to full commit SHAs. Keep workflow permissions read-only and checkout credentials disabled.
- Scheduled drift checks run verification, `npm audit --audit-level=high`, `npm outdated --json`, and `npm run check:support` weekly.

## Boundaries

### Always do

- Always validate report and payload data with the schemas in `contract` before using it.
- Always pass an explicit loopback host to every server `listen` call.
- Always return errors from lower modules and assign `process.exitCode` only in `packages/host/src/main.ts`.
- Always keep Node.js, npm, workspace-version, and internal-dependency pins synchronized.
- Always update tests and user documentation when changing CLI options, routes, payload fields, or exit codes.
- Always update this `AGENTS.md` in the same change when commands, package structure, runtime pins, test layout, CI workflows, or boundaries change.

### Ask first

- Ask first before adding or removing dependencies, changing the lockfile, or upgrading a major version.
- Ask first before changing the contract schemas, `REPORT_ROUTE`, CLI behavior, package versions, or publication contents.
- Ask first before changing runtime pins, CI workflows, Dependabot policy, or release automation.
- Ask first before publishing a package or running a command that sends repository or report data to an external service.

### Never do

- Never push directly to `main`, force-push shared branches, or merge without the required verification.
- Never commit credentials, tokens, `.env` files, private audit reports, or other secrets. Use environment variables or a secret manager for required credentials.
- Never import across package boundaries by relative path or bypass the contract boundary.
- Never call `process.exit` in host source or assign `process.exitCode` outside `main.ts`.
- Never bind the report server to a non-loopback address or add telemetry that includes report data.
- Never commit `dist`, `node_modules`, package-level lockfiles, or other generated output.
- Never use `pull_request_target`, write-capable CI permissions, unpinned actions, or `continue-on-error` to weaken verification.
- Never delete, skip, or weaken tests to make a failing check pass.
