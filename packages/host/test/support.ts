import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Payload } from "@npm-audit-visualizer/contract";
import { PAYLOAD_SCHEMA_VERSION } from "@npm-audit-visualizer/contract";

export const FIXTURE_PAYLOAD: Payload = {
  schemaVersion: PAYLOAD_SCHEMA_VERSION,
  sources: [
    {
      kind: "audit-report",
      producer: { name: "npm", version: null },
      schemaVersion: "2",
      createdAt: null,
      label: "report.json",
    },
  ],
  metadata: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 1,
      high: 0,
      critical: 0,
      total: 1,
    },
    dependencies: {
      prod: 1,
      dev: 0,
      optional: 0,
      peer: 0,
      peerOptional: 0,
      total: 1,
    },
  },
  findings: [
    {
      id: "left-pad",
      name: "left-pad",
      severity: "moderate",
      direct: true,
      range: "<1.3.0",
      paths: ["node_modules/left-pad"],
      via: [],
      effects: [],
      advisories: [],
      fix: {
        available: true,
        name: "left-pad",
        version: "1.3.0",
        major: false,
      },
    },
  ],
  graph: {
    nodes: [{ id: "left-pad", name: "left-pad", severity: "moderate" }],
    edges: [],
  },
};

export type TemporaryAssets = {
  directory: string;
  dispose: () => Promise<void>;
};

/**
 * A stand-in for the built interface. The host only requires index.html to
 * exist and serves whatever else is beside it.
 */
export const createTemporaryAssets = async (): Promise<TemporaryAssets> => {
  const directory = await mkdtemp(path.join(tmpdir(), "nav-assets-"));

  await writeFile(
    path.join(directory, "index.html"),
    "<!doctype html><title>surface</title>",
    "utf8",
  );
  await mkdir(path.join(directory, "assets"), { recursive: true });
  await writeFile(
    path.join(directory, "assets", "index-abc123.js"),
    "console.log('surface');",
    "utf8",
  );

  return {
    directory,
    dispose: async () => {
      await rm(directory, { recursive: true, force: true });
    },
  };
};

export const waitFor = async (
  condition: () => boolean,
  description: string,
  timeoutMs = 4000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  throw new Error(`Timed out waiting for ${description}`);
};
