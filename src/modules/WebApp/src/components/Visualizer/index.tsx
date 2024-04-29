import "@react-sigma/core/lib/react-sigma.min.css";
import { useState } from "react";
import { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
import { TabList } from "src/components/TabList";
import VulnerabilityGraphVisualizer, {} from "src/components/Visualizer/VulnerabilityGraph";

type VisualizerProps = {
  parsedAuditReport: ParsedAuditReport;
};

const Visualizer = (props: VisualizerProps) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const modes = Object.keys(props.parsedAuditReport.vulnerability);
  const selectedMode = modes[selectedTab];
  const selectedComponent = getSelectedComponent(
    selectedMode,
    props.parsedAuditReport,
  );

  return (
    <section>
      <TabList
        tabs={modes}
        selectedTab={selectedTab}
        onTabSelected={setSelectedTab}
      />
      {selectedComponent}
    </section>
  );
};

const getSelectedComponent = (name: string, data: ParsedAuditReport) => {
  switch (name) {
    case "graph":
      return <VulnerabilityGraphVisualizer data={data.vulnerability.graph} />;
    case "table":
      return <div>Table Mode</div>;
  }
};

export default Visualizer;