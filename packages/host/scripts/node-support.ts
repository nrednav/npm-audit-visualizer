#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  decideSupport,
  parseSchedule,
  type SupportVerdict,
} from "./support-policy.js";

const SCHEDULE_URL =
  "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json";
const TIMEOUT_MS = 15_000;

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

const readPinnedVersion = async (): Promise<string> => {
  const pinned = await readFile(`${repoRoot}.nvmrc`, "utf8");

  return pinned.trim();
};

const fetchSchedule = async (): Promise<unknown> => {
  const response = await fetch(SCHEDULE_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `The release schedule answered ${response.status} ${response.statusText}.`,
    );
  }

  return (await response.json()) as unknown;
};

/**
 * Exit codes are the contract: 0 means supported, 1 means unsupported, and 2
 * means the support state could not be determined. A reader of the scheduled
 * job can tell a real failure from an unreadable check.
 */
const main = async (): Promise<void> => {
  let verdict: SupportVerdict;
  let pin: string;

  try {
    pin = await readPinnedVersion();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Could not read the pinned Node version: ${message}\n`,
    );
    process.exitCode = 2;
    return;
  }

  try {
    const schedule = parseSchedule(await fetchSchedule());
    const today = new Date().toISOString().slice(0, 10);
    verdict = decideSupport(pin, schedule, today);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Could not determine Node support: ${message}\n`);
    process.exitCode = 2;
    return;
  }

  const report = `Node ${pin}: ${verdict.reason}\n`;

  if (verdict.supported) {
    process.stdout.write(report);
    return;
  }

  process.stderr.write(report);
  process.exitCode = 1;
};

try {
  await main();
} catch (error) {
  // A rejection here would surface as an unhandled rejection. The check has a
  // defined answer for an unreadable state, so it reports that answer instead.
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Could not complete the support check: ${message}\n`);
  process.exitCode = 2;
}
