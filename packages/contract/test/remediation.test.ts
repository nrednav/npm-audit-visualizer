import { describe, expect, it } from "vitest";
import {
  REMEDIATION_STATES,
  type Remediation,
  RemediationSchema,
  reportsChange,
} from "../src/remediation.js";

const change: Remediation = {
  state: "change-reported",
  target: { name: "semver", version: "7.5.2" },
};

const major: Remediation = {
  state: "major-change-reported",
  target: { name: "react-scripts", version: "5.0.1" },
};

const incomplete: Remediation = {
  state: "change-target-incomplete",
  target: null,
};

const none: Remediation = { state: "no-reported-change", target: null };

describe("remediation state", () => {
  it("accepts every legal pairing of state and target", () => {
    for (const remediation of [change, major, incomplete, none]) {
      expect(RemediationSchema.safeParse(remediation).success).toBe(true);
    }
  });

  it("lists every state the schema accepts, and no other", () => {
    const declared = new Set(REMEDIATION_STATES);
    const encoded = RemediationSchema.options.map(
      (option) => option.shape.state.value,
    );

    expect(new Set(encoded)).toEqual(declared);
    expect(REMEDIATION_STATES).toHaveLength(4);
  });

  it("refuses a target on a state that withholds it", () => {
    expect(
      RemediationSchema.safeParse({
        state: "change-target-incomplete",
        target: { name: "semver", version: "7.5.2" },
      }).success,
    ).toBe(false);
    expect(
      RemediationSchema.safeParse({
        state: "no-reported-change",
        target: { name: "semver", version: "7.5.2" },
      }).success,
    ).toBe(false);
  });

  it("refuses a change state with no target", () => {
    expect(
      RemediationSchema.safeParse({ state: "change-reported", target: null })
        .success,
    ).toBe(false);
    expect(
      RemediationSchema.safeParse({ state: "major-change-reported" }).success,
    ).toBe(false);
  });

  it("refuses a state outside the four", () => {
    expect(
      RemediationSchema.safeParse({ state: "fix-available", target: null })
        .success,
    ).toBe(false);
  });

  it("refuses an empty target string, because a name npm left blank is no name", () => {
    expect(
      RemediationSchema.safeParse({
        state: "change-reported",
        target: { name: "", version: "7.5.2" },
      }).success,
    ).toBe(false);
    expect(
      RemediationSchema.safeParse({
        state: "change-reported",
        target: { name: "semver", version: "" },
      }).success,
    ).toBe(false);
  });

  it("reports a change for every state except no-reported-change", () => {
    const withChange = REMEDIATION_STATES.filter(reportsChange);

    expect(withChange).toEqual([
      "change-reported",
      "major-change-reported",
      "change-target-incomplete",
    ]);
    expect(reportsChange("no-reported-change")).toBe(false);
  });
});
