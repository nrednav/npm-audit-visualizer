/**
 * The published command declares one exact Node version. That declaration is a
 * claim about the runtime's support state, so it is checked against the
 * official release schedule rather than against a date written in a document.
 */

export type ReleaseLine = {
  major: number;
  start: string;
  lts: string | null;
  maintenance: string | null;
  end: string;
  codename: string | null;
};

export type SupportPhase = "active-lts" | "maintenance" | "current" | "ended";

export type SupportVerdict = {
  supported: boolean;
  phase: SupportPhase | "unknown";
  reason: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readDate = (
  entry: Record<string, unknown>,
  field: string,
  line: string,
): string => {
  const value = entry[field];

  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new Error(
      `schedule.json: ${line}.${field} must be an ISO date, received ${JSON.stringify(value)}`,
    );
  }

  return value;
};

const readOptionalDate = (
  entry: Record<string, unknown>,
  field: string,
  line: string,
): string | null => {
  const value = entry[field];

  if (value === undefined || value === null) {
    return null;
  }

  return readDate(entry, field, line);
};

/**
 * Unknown input is rejected, not assumed. A schedule the tool cannot read must
 * never be reported as support.
 */
export const parseSchedule = (raw: unknown): ReleaseLine[] => {
  if (!isRecord(raw)) {
    throw new Error("schedule.json must contain an object of release lines");
  }

  const lines: ReleaseLine[] = [];

  for (const [key, entry] of Object.entries(raw)) {
    const match = /^v(\d+)$/.exec(key);

    if (match === null) {
      continue;
    }

    if (!isRecord(entry)) {
      throw new Error(`schedule.json: ${key} must be an object`);
    }

    const major = Number(match[1]);

    lines.push({
      major,
      start: readDate(entry, "start", key),
      lts: readOptionalDate(entry, "lts", key),
      maintenance: readOptionalDate(entry, "maintenance", key),
      end: readDate(entry, "end", key),
      codename: typeof entry.codename === "string" ? entry.codename : null,
    });
  }

  if (lines.length === 0) {
    throw new Error("schedule.json contains no release lines");
  }

  return lines.sort((left, right) => left.major - right.major);
};

const MIDNIGHT = "T00:00:00.000Z";

const dayOf = (isoDate: string): number => Date.parse(`${isoDate}${MIDNIGHT}`);

export const majorOfPin = (pin: string): number | null => {
  const match = /^(\d+)\.\d+\.\d+$/.exec(pin);

  return match === null ? null : Number(match[1]);
};

/**
 * The project supports a release line only while Node.js supports it and only
 * once it is LTS. A Current line is deliberately unsupported: the foundation is
 * meant to rest on a line that will not receive breaking changes.
 */
export const decideSupport = (
  pin: string,
  schedule: readonly ReleaseLine[],
  today: string,
): SupportVerdict => {
  const major = majorOfPin(pin);

  if (major === null) {
    return {
      supported: false,
      phase: "unknown",
      reason: `The pinned version ${JSON.stringify(pin)} is not an exact version.`,
    };
  }

  const line = schedule.find((entry) => entry.major === major);

  if (line === undefined) {
    return {
      supported: false,
      phase: "unknown",
      reason: `Node ${major} is not in the official release schedule.`,
    };
  }

  const now = dayOf(today);

  if (now > dayOf(line.end)) {
    return {
      supported: false,
      phase: "ended",
      reason: `Node ${major} reached end of life on ${line.end}.`,
    };
  }

  if (line.lts === null) {
    return {
      supported: false,
      phase: "current",
      reason: `Node ${major} has not entered LTS coverage.`,
    };
  }

  if (now < dayOf(line.lts)) {
    return {
      supported: false,
      phase: "current",
      reason: `Node ${major} enters LTS coverage on ${line.lts}.`,
    };
  }

  if (line.maintenance !== null && now > dayOf(line.maintenance)) {
    return {
      supported: true,
      phase: "maintenance",
      reason: `Node ${major} is in maintenance support until ${line.end}.`,
    };
  }

  return {
    supported: true,
    phase: "active-lts",
    reason: `Node ${major} is in active LTS support until ${line.maintenance ?? line.end}.`,
  };
};
