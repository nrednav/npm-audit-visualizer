import { describe, expect, it } from "vitest";
import {
  CHANGE_COST_NOTE,
  EMPTY_STATE_HINT,
  TRIAGE_DEFAULT,
  TRIAGE_NO_ACTION,
} from "./guidance";

const all = {
  TRIAGE_DEFAULT,
  TRIAGE_NO_ACTION,
  CHANGE_COST_NOTE,
  EMPTY_STATE_HINT,
};

describe("guidance copy", () => {
  it("states the default order with its basis and as a default", () => {
    expect(TRIAGE_DEFAULT).toMatch(/critical and high/i);
    expect(TRIAGE_DEFAULT).toMatch(/by default/i);
    expect(TRIAGE_DEFAULT).toMatch(/dependency position/i);
    expect(TRIAGE_DEFAULT).toMatch(/change cost/i);
  });

  it("never claims an action is required or ranks the project's risk", () => {
    const forbidden = [
      /action required/i,
      /act (now|immediately)/i,
      /safe to ignore/i,
      /risk score/i,
      /you must/i,
    ];

    for (const [name, sentence] of Object.entries(all)) {
      for (const pattern of forbidden) {
        expect(sentence, `${name} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("defines a change cost in the words the controls use", () => {
    expect(CHANGE_COST_NOTE).toMatch(/major change/i);
    expect(CHANGE_COST_NOTE).toMatch(/without naming a target/i);
  });

  it("names every constraint that can hide a row", () => {
    for (const control of [
      /search/i,
      /severity/i,
      /reported change/i,
      /dependency position/i,
    ]) {
      expect(EMPTY_STATE_HINT).toMatch(control);
    }
  });

  it("states no count, so no sentence goes stale", () => {
    for (const [name, sentence] of Object.entries(all)) {
      expect(sentence, name).not.toMatch(/\d/);
    }
  });
});
