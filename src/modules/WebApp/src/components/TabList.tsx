import { Tab } from "./Tab";

export type TabListProps = {
  tabs: string[];
  selectedTab: number;
  onTabSelected: (tabIndex: number) => void;
};

export const TabList = (props: TabListProps) => {
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
