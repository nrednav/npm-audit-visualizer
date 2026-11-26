import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AuditReportSchema,
  decodePayload,
  PAYLOAD_SCHEMA_VERSION,
  PayloadSchema,
  SUPPORTED_AUDIT_REPORT_VERSION,
} from "@npm-audit-visualizer/contract";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  describeReadFailure,
  readReport,
} from "../packages/host/src/report/read.js";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const fixtures = path.join(repoRoot, "packages/contract/test/fixtures");

const policy = async (): Promise<string> =>
  readFile(path.join(repoRoot, "docs/compatibility.md"), "utf8");

const fixturePath = (name: string): string =>
  path.join(fixtures, `${name}.json`);

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), "nav-compat-"));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

const payload = async () =>
  PayloadSchema.parse(
    JSON.parse(await readFile(fixturePath("parsed-report"), "utf8")) as unknown,
  );

describe("the policy page names every artifact and every refusal", () => {
  it("lists both artifact classes with a mismatch rule for each", async () => {
    const text = await policy();

    for (const artifact of ["npm audit report", "Companion artifacts"]) {
      expect(text).toContain(artifact);
    }
    expect(text).toMatch(/Refused at read time with `unsupported-version`/);
    expect(text).toMatch(/Policy, not behaviour/);
  });

  it("names every refusal kind the code can return", async () => {
    const text = await policy();

    for (const kind of [
      "version",
      "shape",
      "unsupported-version",
      "not-json",
      "not-a-report",
    ]) {
      expect(text).toContain(`\`${kind}\``);
    }
  });

  it("states the four things an unknown is not", async () => {
    const text = await policy();

    expect(text).toMatch(/It is \*\*not absent\*\*/);
    expect(text).toMatch(/It is \*\*not false\*\*/);
    expect(text).toMatch(/It is \*\*not current\*\*/);
    expect(text).toMatch(/It is \*\*not safe\*\*/);
  });

  it("states the two limits it does not claim", async () => {
    const text = await policy();

    expect(text).toMatch(/recorded, not compared/);
    expect(text).toMatch(/No companion artifact exists/);
  });
});

describe("a payload version mismatch is refused by name", () => {
  it("returns the version kind with both sides, exactly as the page states", async () => {
    const current = await payload();
    const decoded = decodePayload({
      ...current,
      schemaVersion: PAYLOAD_SCHEMA_VERSION - 1,
    });

    expect(decoded.success).toBe(false);

    if (decoded.success) return;

    expect(decoded.error.kind).toBe("version");
    expect(decoded.error).toHaveProperty(
      "received",
      PAYLOAD_SCHEMA_VERSION - 1,
    );
    expect(decoded.error).toHaveProperty("supported", PAYLOAD_SCHEMA_VERSION);
  });

  it("refuses a payload with no version at all, and says so", async () => {
    const { schemaVersion: _omitted, ...withoutVersion } = await payload();
    const decoded = decodePayload(withoutVersion);

    expect(decoded.success).toBe(false);
    expect(decoded.success ? undefined : decoded.error.kind).toBe("version");
  });
});

describe("a payload shape mismatch is refused by name", () => {
  it("returns the shape kind with paths the page promises", async () => {
    const current = await payload();
    const decoded = decodePayload({ ...current, findings: [{ id: "x" }] });

    expect(decoded.success).toBe(false);

    if (decoded.success) return;

    expect(decoded.error.kind).toBe("shape");
    expect(decoded.error.paths.length).toBeGreaterThan(0);
    expect(decoded.error.paths.join(" ")).toMatch(/^findings/);
  });
});

describe("an unsupported audit report version is refused by name", () => {
  it("names the file, what it holds, and what this tool reads", async () => {
    const report = JSON.parse(
      await readFile(fixturePath("few-vulnerabilities-audit-report"), "utf8"),
    ) as { auditReportVersion: unknown };
    const filePath = path.join(workspace, "future-report.json");

    await writeFile(
      filePath,
      JSON.stringify({
        ...report,
        auditReportVersion: SUPPORTED_AUDIT_REPORT_VERSION + 1,
      }),
      "utf8",
    );

    const result = await readReport(filePath);

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.failure.kind).toBe("unsupported-version");
    expect(result.failure).toHaveProperty(
      "found",
      String(SUPPORTED_AUDIT_REPORT_VERSION + 1),
    );
    expect(result.failure).toHaveProperty(
      "supported",
      SUPPORTED_AUDIT_REPORT_VERSION,
    );

    const sentence = describeReadFailure(result.failure);
    expect(sentence).toContain(filePath);
    expect(sentence).toContain(String(SUPPORTED_AUDIT_REPORT_VERSION + 1));
    expect(sentence).toContain(String(SUPPORTED_AUDIT_REPORT_VERSION));
  });

  it("refuses a report that is not JSON, naming the source and the reason", async () => {
    const filePath = path.join(workspace, "not-json.json");
    await writeFile(filePath, "this is not json", "utf8");

    const result = await readReport(filePath);

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.kind).toBe("not-json");
    expect(result.ok ? "" : describeReadFailure(result.failure)).toContain(
      filePath,
    );
  });

  it("refuses a report that lacks the audit fields, naming the paths", async () => {
    const filePath = path.join(workspace, "not-a-report.json");
    await writeFile(
      filePath,
      JSON.stringify({ auditReportVersion: 2 }),
      "utf8",
    );

    const result = await readReport(filePath);

    expect(result.ok).toBe(false);
    expect(result.ok ? undefined : result.failure.kind).toBe("not-a-report");
    expect(
      result.ok ? [] : (result.failure as { paths: string[] }).paths,
    ).not.toHaveLength(0);
  });
});

describe("the page is bound to the code, not to prose", () => {
  it("matches the report version the parser actually accepts", async () => {
    const report = JSON.parse(
      await readFile(fixturePath("few-vulnerabilities-audit-report"), "utf8"),
    ) as unknown;

    expect(AuditReportSchema.safeParse(report).success).toBe(true);
    expect(SUPPORTED_AUDIT_REPORT_VERSION).toBeGreaterThan(0);
  });

  it("refuses a null where an unknown belongs, as the page states", async () => {
    const current = await payload();

    expect(
      PayloadSchema.safeParse({
        ...current,
        sources: [{ ...current.sources[0], createdAt: null }],
      }).success,
    ).toBe(false);
    expect(
      PayloadSchema.safeParse({
        ...current,
        timestamps: { ...current.timestamps, auditTime: null },
      }).success,
    ).toBe(false);
  });

  it("says a required artifact cannot be dropped", async () => {
    const current = await payload();

    expect(PayloadSchema.safeParse({ ...current, sources: [] }).success).toBe(
      false,
    );
  });
});

describe("the page is reachable", () => {
  it("is linked from the README and the field reference", async () => {
    const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
    const reference = await readFile(
      path.join(repoRoot, "docs/cli-reference.md"),
      "utf8",
    );

    expect(readme).toContain("docs/compatibility.md");
    expect(reference).toContain("compatibility.md");
  });
});
