import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { type Payload, REPORT_ROUTE } from "@npm-audit-visualizer/contract";
import { cacheControlFor, contentTypeFor, resolveInside } from "./static.js";

export type RouteContext = {
  assetsDir: string;
  payload: Payload;
};

const sendText = (
  response: ServerResponse,
  status: number,
  body: string,
): void => {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
};

const isReadableFile = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await stat(filePath);

    return stats.isFile();
  } catch {
    return false;
  }
};

/**
 * Two routes only. An unknown path is 404 and never a fall-through to
 * index.html: a misspelt asset must not answer 200 with a page, or the surface
 * reports a load failure that has nothing to do with the report.
 */
export const createRequestHandler = (context: RouteContext) => {
  const { assetsDir, payload } = context;
  const serialised = JSON.stringify(payload);

  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const url = request.url ?? "/";
    const pathname = url.split("?")[0] ?? "/";

    if (pathname === REPORT_ROUTE) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        sendText(response, 405, "Method not allowed.\n");
        return;
      }

      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(serialised),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      response.end(serialised);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method not allowed.\n");
      return;
    }

    const relative =
      pathname === "/" || pathname === "" ? "/index.html" : pathname;
    const resolved = resolveInside(assetsDir, relative);

    if (resolved === null || !(await isReadableFile(resolved))) {
      sendText(response, 404, "Not found.\n");
      return;
    }

    const filePath = resolved;

    response.writeHead(200, {
      "content-type": contentTypeFor(filePath),
      "cache-control": cacheControlFor(filePath),
      "x-content-type-options": "nosniff",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    await new Promise<void>((settle) => {
      const stream = createReadStream(filePath);

      stream.on("error", () => {
        response.destroy();
        settle();
      });
      stream.on("end", () => {
        settle();
      });
      stream.pipe(response);
    });
  };
};
