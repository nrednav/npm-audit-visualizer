import AuditReportMetadata from "./components/audit-report-metadata";
import Visualizer from "./components/visualizer";
import { useParsedAuditReport } from "./hooks/use-parsed-audit-report";

const App = () => {
  const { parsedAuditReport, loading } = useParsedAuditReport();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!parsedAuditReport) {
    return <div>Error: Could not read parsed audit report</div>;
  }

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-center">npm-audit-visualizer</h1>
      </header>
      <main>
        <AuditReportMetadata metadata={parsedAuditReport.metadata} />
        <Visualizer parsedAuditReport={parsedAuditReport} />
      </main>
      <footer />
    </>
  );
};

export default App;
