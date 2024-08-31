import clsx from "clsx";

export type TabProps = {
  key: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
};

export const Tab = (props: TabProps) => {
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
