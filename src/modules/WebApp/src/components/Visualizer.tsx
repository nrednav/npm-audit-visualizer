import "@react-sigma/core/lib/react-sigma.min.css";
import { useState } from "react";
import { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
import { TabList } from "./TabList";
import VulnerabilityGraphVisualizer from "./Visualizer/VulnerabilityGraph";

type VisualizerProps = {
  parsedAuditReport: ParsedAuditReport;
};

const Visualizer = (props: VisualizerProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const selectedMode = modes[selectedTab];
  const selectedData = props.parsedAuditReport.vulnerability[selectedMode.name];

  return (
    <section>
      <TabList
        tabs={modes.map((mode) => mode.name)}
        selectedTab={selectedTab}
        onTabSelected={setSelectedTab}
      />
      <selectedMode.Component data={selectedData} />
    </section>
  );
};

type VisualizerMode = {
  name: keyof ParsedAuditReport["vulnerability"];
  Component: () => JSX.Element;
};

const modes: VisualizerMode[] = [
  { name: "graph", Component: VulnerabilityGraphVisualizer },
  { name: "table", Component: () => <div>Table Mode</div> },
];

export default Visualizer;
