import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (relativePath: string): string =>
  path.resolve(fileURLToPath(new URL(relativePath, import.meta.url)));

/**
 * The contract is aliased to its source. Tests then run without a prior build,
 * and the alias matches the `paths` mapping each package uses for typecheck.
 */
const resolve = {
  alias: {
    "@npm-audit-visualizer/contract": at("./packages/contract/src/index.ts"),
  },
};

export default defineConfig({
  resolve,
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "node",
          environment: "node",
          include: [
            "test/**/*.test.ts",
            "packages/contract/test/**/*.test.ts",
            "packages/host/test/**/*.test.ts",
          ],
          // The artifact assertions read and produce one built tree. Each test
          // file runs in its own worker, so two files that both find the build
          // missing would build over each other's output directories, and the
          // development command rebuilds the tree inside the file that runs it.
          // One file at a time keeps that tree whole for every reader.
          fileParallelism: false,
        },
      },
      {
        resolve: {
          alias: [
            { find: /^src\//, replacement: `${at("./packages/surface/src")}/` },
            {
              find: "@npm-audit-visualizer/contract",
              replacement: at("./packages/contract/src/index.ts"),
            },
          ],
        },
        test: {
          name: "surface",
          environment: "jsdom",
          include: ["packages/surface/src/**/*.test.{ts,tsx}"],
          setupFiles: [at("./packages/surface/setupTests.ts")],
        },
      },
    ],
  },
});
