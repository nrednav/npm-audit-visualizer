import {
  isUnknown,
  type Payload,
  type SourceDescriptor,
} from "@npm-audit-visualizer/contract";

const DIGEST_PREFIX_LENGTH = 12;

type ReportContextProps = {
  metadata: Payload["metadata"];
  sources: Payload["sources"];
};

const DEPENDENCY_LABELS: Record<string, string> = {
  prod: "Production",
  dev: "Development",
  optional: "Optional",
  peer: "Peer",
  peerOptional: "Peer optional",
  total: "Total",
};

/**
 * The only artifact a payload can name today is the audit report. Later kinds
 * get their own row rather than being folded into this one.
 */
const reportSource = (
  sources: Payload["sources"],
): SourceDescriptor | undefined =>
  sources.find((source) => source.kind === "audit-report");

/**
 * The reason is shown verbatim. Shortening it here would mean the page inventing
 * an explanation for an absence the payload already explained.
 */
const producerText = (source: SourceDescriptor): string => {
  const { name, version } = source.producer;

  if (!isUnknown(version)) {
    return `${name} ${version}`;
  }

  return `${name} (version not supplied: ${version.unknown})`;
};

const createdText = (source: SourceDescriptor): string =>
  isUnknown(source.createdAt)
    ? `not supplied (${source.createdAt.unknown})`
    : source.createdAt;

/**
 * A prefix of the identity, with the whole value in a title attribute. The page
 * shows what the payload states and computes nothing: it has the bytes of a
 * payload, not of the report.
 */
const digestText = (digest: string): string => {
  const [algorithm, body] = digest.split(":");
  const shown = body.slice(0, DIGEST_PREFIX_LENGTH);

  return `${algorithm}:${shown}…`;
};

const ReportContext = (props: ReportContextProps) => {
  const { metadata, sources } = props;
  const source = reportSource(sources);
  const entries = Object.entries(metadata.dependencies).filter(
    ([key]) => key !== "total",
  );

  return (
    <section
      aria-labelledby="scope-heading"
      className="mt-5 flex flex-col gap-3 border-y border-line/80 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
    >
      <h2 id="scope-heading" className="eyebrow shrink-0 text-ink-muted">
        Report scope
      </h2>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:flex lg:items-baseline lg:gap-8">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-2">
            <dt className="text-xs text-ink-muted">
              {DEPENDENCY_LABELS[key] ?? key}
            </dt>
            <dd className="num text-sm font-semibold">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline gap-2 lg:border-l lg:border-line lg:pl-8">
          <dt className="text-xs text-ink-muted">Total</dt>
          <dd className="num text-sm font-semibold">
            {metadata.dependencies.total.toLocaleString("en-US")}
          </dd>
        </div>
      </dl>

      {source === undefined ? null : (
        <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-2 lg:border-l lg:border-line lg:pl-8">
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-ink-muted">Source</dt>
            <dd className="max-w-[22ch] truncate text-sm font-semibold">
              {source.label}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-ink-muted">Produced by</dt>
            <dd className="text-sm">{producerText(source)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-ink-muted">Identity</dt>
            <dd className="num text-sm" title={source.digest}>
              {digestText(source.digest)}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs text-ink-muted">Created</dt>
            <dd className="text-sm">
              {/* A time the report never stated stays unsaid, never guessed. */}
              {createdText(source)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
};

export default ReportContext;
