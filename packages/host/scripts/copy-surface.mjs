import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hostRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = path.resolve(hostRoot, "../surface/dist");
const destination = path.resolve(hostRoot, "dist/surface");

if (!existsSync(path.join(source, "index.html"))) {
  console.error(
    `The surface build is missing at ${source}. Run "npm run build -w @npm-audit-visualizer/surface" first.`,
  );
  process.exit(1);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
