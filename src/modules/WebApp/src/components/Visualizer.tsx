import { useState } from "react";
import { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
import { TabList } from "./TabList";

type VisualizerProps = {
  parsedAuditReport: ParsedAuditReport;
};

const Visualizer = (props: VisualizerProps) => {
  console.log("rendered visualizer", props);
  const [selectedTab, setSelectedTab] = useState(0);
  const selectedMode = modes[selectedTab];

  return (
    <section>
      <TabList
        tabs={modes.map((mode) => mode.name)}
        selectedTab={selectedTab}
        onTabSelected={setSelectedTab}
      />
      <selectedMode.Component />
    </section>
  );
};

const modes: {
  name: keyof ParsedAuditReport["vulnerability"];
  Component: () => JSX.Element;
}[] = [
  { name: "graph", Component: () => <div>Graph Mode</div> },
  { name: "table", Component: () => <div>Table Mode</div> },
];

export default Visualizer;
