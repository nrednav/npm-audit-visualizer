import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cacheControlFor,
  contentTypeFor,
  resolveInside,
} from "../../src/serve/static.js";

const root = path.resolve("/srv/interface");

/**
 * Every hostile input must end in one of two states: refused, or mapped to a
 * path inside the root. Mapping outside the root is the failure.
 */
const isInside = (candidate: string): boolean =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);

describe("resolveInside", () => {
  it("resolves a path under the root", () => {
    expect(resolveInside(root, "/assets/app.js")).toBe(
      path.join(root, "assets", "app.js"),
    );
  });

  it("never maps a request outside the root", () => {
    const hostile = [
      "/../secret",
      "/assets/../../secret",
      "/%2e%2e/%2e%2e/etc/passwd",
      "/../../etc/passwd",
      "..%2f..%2fetc/passwd",
      "/%",
      "/index.html%00.png",
      "/etc/passwd",
    ];

    for (const request of hostile) {
      const resolved = resolveInside(root, request);

      if (resolved !== null) {
        expect(isInside(resolved), `${request} escaped the root`).toBe(true);
      }
    }
  });

  it("refuses a relative escape outright", () => {
    expect(resolveInside(root, "..%2f..%2fetc/passwd")).toBeNull();
  });

  it("refuses a path it cannot decode", () => {
    expect(resolveInside(root, "/%")).toBeNull();
  });

  it("refuses a name containing a null byte", () => {
    expect(resolveInside(root, "/index.html%00.png")).toBeNull();
  });

  it("treats an absolute-looking request as a path under the root", () => {
    expect(resolveInside(root, "/etc/passwd")).toBe(
      path.join(root, "etc", "passwd"),
    );
  });
});

describe("contentTypeFor", () => {
  it("names the types the interface ships", () => {
    expect(contentTypeFor("index.html")).toContain("text/html");
    expect(contentTypeFor("app.js")).toContain("text/javascript");
    expect(contentTypeFor("app.css")).toContain("text/css");
    expect(contentTypeFor("app.woff2")).toBe("font/woff2");
  });

  it("falls back to bytes for an unknown extension", () => {
    expect(contentTypeFor("note.unknown")).toBe("application/octet-stream");
  });
});

describe("cacheControlFor", () => {
  it("lets content-hashed assets be cached forever", () => {
    expect(cacheControlFor("/srv/interface/assets/app-abc123.js")).toContain(
      "immutable",
    );
  });

  it("revalidates the entry document so a new build is picked up", () => {
    expect(cacheControlFor("/srv/interface/index.html")).toBe("no-cache");
  });
});
