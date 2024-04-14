import { useState } from "react";
import type { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
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
    <ul className="flex flex-row gap-4">
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
    <li className="flex flex-col">
      <p>{label}</p>
      <p>{value}</p>
    </li>
  );
};

export default AuditReportMetadata;
