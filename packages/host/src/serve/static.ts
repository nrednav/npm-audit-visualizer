import { extname, join, normalize, resolve, sep } from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export const contentTypeFor = (filePath: string): string =>
  CONTENT_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";

/**
 * Resolves a request path against the asset root and refuses anything that
 * escapes it. Null means "outside the root", which the caller answers with 404
 * rather than 403 so the response does not describe the tree.
 */
export const resolveInside = (
  root: string,
  requestPath: string,
): string | null => {
  let decoded: string;

  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }

  if (decoded.includes("\u0000")) {
    return null;
  }

  const rootPath = resolve(root);
  const candidate = resolve(join(rootPath, normalize(decoded)));

  if (candidate === rootPath) {
    return rootPath;
  }

  return candidate.startsWith(`${rootPath}${sep}`) ? candidate : null;
};

/**
 * Built assets carry a content hash in their name and never change, so they are
 * cached for a year. Everything else is revalidated, so a new build is picked
 * up without a hard refresh.
 */
export const cacheControlFor = (filePath: string): string => {
  const segments = filePath.split(sep);

  return segments.includes("assets")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
};
