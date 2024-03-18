import { createRequire } from "node:module";
import path from "path";

const require = createRequire(import.meta.url);

export const PACKAGE_NAME = "npm-audit-visualizer";
export const PACKAGE_ENTRY_POINT = require.resolve(PACKAGE_NAME);
const PACKAGE_BUILD_DIR = path.dirname(PACKAGE_ENTRY_POINT);

export const WEB_APP_SERVER_PORT = 1248;
export const WEB_APP_BUILD_DIR = path.resolve(PACKAGE_BUILD_DIR, "web-app");
