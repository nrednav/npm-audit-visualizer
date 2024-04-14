import clsx from "clsx";
import { useState } from "react";
import type { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";

type AuditReportMetadataProps = {
  metadata: ParsedAuditReport["metadata"];
};

type MetadataKey = keyof ParsedAuditReport["metadata"];
type MetadataValue = Record<string, number>;

const AuditReportMetadata = (props: AuditReportMetadataProps) => {
  const { metadata } = props;
  const tabs = Object.keys(metadata) as unknown as MetadataKey[];
  const [selectedTab, selectTab] = useState(0);
  const selectedMetadataKey = tabs[selectedTab];
  return (
    <section>
      <TabList
        tabs={tabs}
        selectedTab={selectedTab}
        onTabSelected={selectTab}
      />
      <MetadataCardList data={metadata[selectedMetadataKey]} />
    </section>
  );
};

type TabListProps = {
  tabs: string[];
  selectedTab: number;
  onTabSelected: (tabIndex: number) => void;
};

const TabList = (props: TabListProps) => {
  const { tabs, selectedTab, onTabSelected } = props;
  return (
    <div className="flex flex-row gap-x-4" role="tablist">
      {tabs.map((tabLabel, tabIndex) => (
        <Tab
          key={tabLabel}
          label={tabLabel}
          onClick={() => onTabSelected(tabIndex)}
          isSelected={tabIndex === selectedTab}
        />
      ))}
    </div>
  );
};

type TabProps = {
  key: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
};

const Tab = (props: TabProps) => {
  const { label, onClick, isSelected } = props;
  const className = clsx(
    "capitalize cursor-pointer",
    isSelected && "font-bold",
  );
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
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
