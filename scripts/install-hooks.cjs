const { existsSync } = require("node:fs");
const { execSync } = require("node:child_process");

/**
 * Install Git hooks only when this checkout has a .git entry.
 *
 * The published copy and exported session directories do not include
 * repository metadata, so `husky install` would fail there and abort
 * `npm install`.
 */
if (existsSync(".git")) {
  execSync("husky install", { stdio: "inherit" });
} else {
  console.log("Skipping Git hooks: no .git directory in this workspace.");
}
