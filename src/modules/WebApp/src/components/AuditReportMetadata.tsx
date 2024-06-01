import clsx from "clsx";
import { useState } from "react";
import type { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
import { SEVERITY_COLOR_MAP } from "src/constants";
import { TabList } from "./TabList";

type AuditReportMetadataProps = {
  metadata: ParsedAuditReport["metadata"];
};

type MetadataKey = keyof ParsedAuditReport["metadata"];
type MetadataValue = Record<string, number>;

const AuditReportMetadata = (props: AuditReportMetadataProps) => {
  const { metadata } = props;
  const tabs = Object.keys(metadata) as unknown as MetadataKey[];
  const [selectedTab, setSelectedTab] = useState(0);
  const selectedMetadataKey = tabs[selectedTab];
  return (
    <section>
      <TabList
        tabs={tabs}
        selectedTab={selectedTab}
        onTabSelected={setSelectedTab}
      />
      <MetadataCardList data={metadata[selectedMetadataKey]} />
    </section>
  );
};

type MetadataCardListProps = {
  data: MetadataValue;
};

const MetadataCardList = (props: MetadataCardListProps) => {
  const { data } = props;
  const keys = Object.keys(data);
  return (
    <ul className="py-4 | flex flex-row gap-4">
      {keys.map((key) => {
        const value = String(data[key]);
        return (
          <MetadataCard key={`${key}-${value}`} label={key} value={value} />
        );
      })}
    </ul>
  );
};

type MetadataCardProps = {
  label: string;
  value: string;
};

const MetadataCard = (props: MetadataCardProps) => {
  const { label, value } = props;
  return (
    <li
      className={clsx(
        "w-32 p-4 | flex flex-col | rounded-lg bg-white shadow border-r-4",
      )}
      style={{ borderRightColor: SEVERITY_COLOR_MAP[label.toLowerCase()] }}
    >
      <p className="truncate text-sm font-semibold text-slate-500 capitalize">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-dark">
        {value}
      </p>
    </li>
  );
};

export default AuditReportMetadata;
