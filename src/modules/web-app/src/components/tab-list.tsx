import clsx from "clsx";
import type { KeyboardEvent } from "react";

export type TabItem = {
  id: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
};

export type TabListProps = {
  tabs: TabItem[];
  selectedTab: number;
  onTabSelected: (tabIndex: number) => void;
  label: string;
};

export const TabList = (props: TabListProps) => {
  const { tabs, selectedTab, onTabSelected, label } = props;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const lastIndex = tabs.length - 1;
    let nextIndex: number | undefined;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = selectedTab === lastIndex ? 0 : selectedTab + 1;
        break;
      case "ArrowLeft":
        nextIndex = selectedTab === 0 ? lastIndex : selectedTab - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    onTabSelected(nextIndex);
    requestAnimationFrame(() => {
      document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
    });
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-full border border-line bg-control p-1"
    >
      {tabs.map((tab, tabIndex) => {
        const isSelected = tabIndex === selectedTab;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onTabSelected(tabIndex)}
            onKeyDown={handleKeyDown}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,33,27,0.08)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  "num rounded-full px-2 py-1 text-[0.625rem] font-semibold leading-none",
                  isSelected
                    ? "bg-teal-soft text-teal"
                    : "bg-ink/[0.06] text-ink-muted",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
