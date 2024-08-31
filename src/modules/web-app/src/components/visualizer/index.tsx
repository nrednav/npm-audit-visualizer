import "@react-sigma/core/lib/react-sigma.min.css";
import { useState } from "react";
import { ParsedAuditReport } from "root/src/modules/audit-report/parser/types";
import { TabList } from "src/components/tab-list";
import VulnerabilityGraphComponent from "src/components/visualizer/vulnerability-graph";
import VulnerabilityTableComponent from "src/components/visualizer/vulnerability-table";

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
      return <VulnerabilityGraphComponent data={data.vulnerability.graph} />;
    case "table":
      return <VulnerabilityTableComponent data={data.vulnerability.table} />;
    default:
      return null;
  }
};

export default Visualizer;
