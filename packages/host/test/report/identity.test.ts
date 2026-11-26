import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { digestOf } from "../../src/report/identity.js";
import { readReport } from "../../src/report/read.js";

const fixturePath = (name: string): string =>
  path.resolve(
    import.meta.dirname,
    "../../../contract/test/fixtures",
    `${name}.json`,
  );

const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text);

const platformDigest = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

describe("digestOf", () => {
  it("is the platform hash, prefixed and lowercase", () => {
    const bytes = bytesOf(`{"auditReportVersion":2}`);

    expect(digestOf(bytes)).toBe(platformDigest(bytes));
    expect(digestOf(bytes)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("gives the same digest for the same bytes, however often it is asked", () => {
    const bytes = bytesOf("the same report");

    expect(digestOf(bytes)).toBe(digestOf(bytes));
    expect(digestOf(bytes)).toBe(digestOf(bytesOf("the same report")));
  });

  it("changes when one byte changes", () => {
    expect(digestOf(bytesOf('{"a":1}'))).not.toBe(digestOf(bytesOf('{"a":2}')));
    expect(digestOf(bytesOf('{"a":1}'))).not.toBe(
      digestOf(bytesOf('{"a":1} ')),
    );
    expect(digestOf(bytesOf('{"a":1}'))).not.toBe(
      digestOf(bytesOf('{"a":1}\n')),
    );
  });

  it("hashes bytes, so a report and its own text are one subject", () => {
    const text = '{\n  "auditReportVersion": 2\n}\n';

    expect(digestOf(bytesOf(text))).toBe(digestOf(Buffer.from(text, "utf8")));
  });

  it("answers for an empty sequence without throwing", () => {
    expect(digestOf(new Uint8Array())).toBe(platformDigest(new Uint8Array()));
  });
});

describe("readReport identity", () => {
  it("hashes the bytes on disk, not the decoded text", async () => {
    const filePath = fixturePath("few-vulnerabilities-audit-report");
    const onDisk = await readFile(filePath);
    const result = await readReport(filePath);

    expect(result.ok && result.digest).toBe(platformDigest(onDisk));
  });

  it("gives one digest to a file and its copy, and another to a reformatted report", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nav-identity-"));
    const original = fixturePath("few-vulnerabilities-audit-report");
    const bytes = await readFile(original);
    const copy = path.join(directory, "copy.json");
    const reformatted = path.join(directory, "reformatted.json");

    await writeFile(copy, bytes);
    await writeFile(
      reformatted,
      `${JSON.stringify(JSON.parse(bytes.toString("utf8")), null, 2)}\n`,
    );

    const [a, b, c] = await Promise.all([
      readReport(original),
      readReport(copy),
      readReport(reformatted),
    ]);

    expect(a.ok && a.digest).toBe(b.ok && b.digest);
    expect(a.ok && a.report).toEqual(c.ok && c.report);
    // The same report, said another way, is a different subject on purpose.
    expect(a.ok && a.digest).not.toBe(c.ok && c.digest);
  });
});
