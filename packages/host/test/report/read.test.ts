import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { describeReadFailure, readReport } from "../../src/report/read.js";

let workspace: string;

const fixturePath = (name: string): string =>
  path.resolve(
    import.meta.dirname,
    "../../../contract/test/fixtures",
    `${name}.json`,
  );

const write = async (name: string, body: string): Promise<string> => {
  const filePath = path.join(workspace, name);
  await writeFile(filePath, body, "utf8");

  return filePath;
};

beforeEach(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), "nav-read-"));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("readReport", () => {
  it("accepts a report written by npm audit", async () => {
    const result = await readReport(
      fixturePath("few-vulnerabilities-audit-report"),
    );

    expect(result.ok).toBe(true);
  });

  it("reports a missing file as missing", async () => {
    const result = await readReport(path.join(workspace, "absent.json"));

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.failure.kind).toBe("missing");
  });

  it("reports a directory as unreadable, not as missing", async () => {
    const result = await readReport(workspace);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("unreadable");
    expect(describeReadFailure(result.failure)).toContain("directory");
  });

  it("separates unreadable JSON from an unreadable report", async () => {
    const notJson = await readReport(await write("broken.json", "{ nope"));

    expect(notJson.ok).toBe(false);

    if (notJson.ok) {
      return;
    }

    expect(notJson.failure.kind).toBe("not-json");

    const notReport = await readReport(await write("other.json", '{"a":1}'));

    expect(notReport.ok).toBe(false);

    if (notReport.ok) {
      return;
    }

    expect(notReport.failure.kind).toBe("unsupported-version");
  });

  it("names an unsupported report version rather than calling it invalid", async () => {
    const filePath = await write(
      "v3.json",
      JSON.stringify({
        auditReportVersion: 3,
        vulnerabilities: {},
        metadata: {},
      }),
    );
    const result = await readReport(filePath);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("unsupported-version");
    expect(describeReadFailure(result.failure)).toContain("version 3");
    expect(describeReadFailure(result.failure)).toContain("reads version 2");
  });

  it("names the fields it could not read", async () => {
    const filePath = await write(
      "shape.json",
      JSON.stringify({ auditReportVersion: 2, vulnerabilities: {} }),
    );
    const result = await readReport(filePath);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.failure.kind).toBe("not-a-report");
    expect(describeReadFailure(result.failure)).toContain("metadata");
  });

  it("gives each failure kind its own sentence", async () => {
    const sentences = new Set<string>();
    const inputs: string[] = [
      JSON.stringify({ auditReportVersion: 9 }),
      "{ broken",
      JSON.stringify([1, 2, 3]),
      JSON.stringify({ auditReportVersion: 2 }),
    ];

    for (const [index, body] of inputs.entries()) {
      const filePath = await write(`case-${index}.json`, body);
      const result = await readReport(filePath);

      if (!result.ok) {
        sentences.add(describeReadFailure(result.failure));
      }
    }

    const missing = await readReport(path.join(workspace, "nothing.json"));

    if (!missing.ok) {
      sentences.add(describeReadFailure(missing.failure));
    }

    expect(sentences.size).toBe(inputs.length + 1);
  });
});
