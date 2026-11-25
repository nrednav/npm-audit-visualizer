import {
  type Payload,
  PayloadSchema,
  REPORT_ROUTE,
} from "@npm-audit-visualizer/contract";
import { useEffect, useState } from "react";

/**
 * Three states, and no fourth. A failed request and a payload that does not
 * match the contract both land on `failed`, so neither can be drawn as a report
 * that happens to have no findings.
 */
export type PayloadState =
  | { status: "loading" }
  | { status: "failed"; cause: string }
  | { status: "loaded"; payload: Payload };

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const describeIssues = (
  issues: readonly { path: readonly PropertyKey[] }[],
): string =>
  issues
    .slice(0, 3)
    .map((issue) => issue.path.map(String).join(".") || "(root)")
    .join(", ");

export const usePayload = (): PayloadState => {
  const [state, setState] = useState<PayloadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    const load = async (): Promise<void> => {
      const settle = (next: PayloadState): void => {
        if (live) {
          setState(next);
        }
      };

      let response: Response;

      try {
        response = await fetch(REPORT_ROUTE, { signal: controller.signal });
      } catch (error) {
        settle({
          status: "failed",
          cause: `The report could not be requested. ${reasonOf(error)}`,
        });
        return;
      }

      if (!response.ok) {
        settle({
          status: "failed",
          cause: `The server answered ${response.status} for ${REPORT_ROUTE}.`,
        });
        return;
      }

      let raw: unknown;

      try {
        raw = (await response.json()) as unknown;
      } catch (error) {
        settle({
          status: "failed",
          cause: `The report is not JSON. ${reasonOf(error)}`,
        });
        return;
      }

      const parsed = PayloadSchema.safeParse(raw);

      if (!parsed.success) {
        settle({
          status: "failed",
          cause: `The report does not match the expected shape. Could not read: ${describeIssues(parsed.error.issues)}.`,
        });
        return;
      }

      settle({ status: "loaded", payload: parsed.data });
    };

    void load();

    return () => {
      live = false;
      controller.abort();
    };
  }, []);

  return state;
};
