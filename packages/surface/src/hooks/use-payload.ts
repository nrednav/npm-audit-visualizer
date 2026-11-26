import {
  decodePayload,
  PAYLOAD_SCHEMA_VERSION,
  type Payload,
  REPORT_ROUTE,
} from "@npm-audit-visualizer/contract";
import { useEffect, useState } from "react";

/**
 * Three states, and no fourth. A failed request, a version mismatch, and a
 * payload that does not match the contract all land on `failed`, so none can be
 * drawn as a report that happens to have no findings.
 */
export type PayloadState =
  | { status: "loading" }
  | { status: "failed"; cause: string }
  | { status: "loaded"; payload: Payload };

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const describeReceived = (received: unknown): string =>
  received === undefined ? "no version" : (JSON.stringify(received) ?? "null");

const describeVersionFailure = (received: unknown): string =>
  `This page expects payload version ${PAYLOAD_SCHEMA_VERSION}, but the report carries ${describeReceived(received)}. The server and the page were built from different contracts, so the report has not been read.`;

const describeShapeFailure = (paths: readonly string[]): string =>
  `The report does not match the expected shape. Could not read: ${paths.join(", ")}.`;

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

      const decoded = decodePayload(raw);

      if (!decoded.success) {
        settle({
          status: "failed",
          cause:
            decoded.error.kind === "version"
              ? describeVersionFailure(decoded.error.received)
              : describeShapeFailure(decoded.error.paths),
        });
        return;
      }

      settle({ status: "loaded", payload: decoded.payload });
    };

    void load();

    return () => {
      live = false;
      controller.abort();
    };
  }, []);

  return state;
};
