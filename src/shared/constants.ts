import { createRequire } from "node:module";
import path from "path";

const require = createRequire(import.meta.url);

export const PACKAGE_NAME = "npm-audit-visualizer";

export const PACKAGE_ENTRY_POINT = {
  relative: "build/main.js",
  absolute: require.resolve(PACKAGE_NAME),
};

const PACKAGE_BUILD_DIR = path.dirname(PACKAGE_ENTRY_POINT.absolute);

export const WEB_APP_BUILD_DIR = path.resolve(PACKAGE_BUILD_DIR, "web-app");
