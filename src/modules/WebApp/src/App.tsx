import { useEffect, useState } from "react";
import { ParsedAuditReport } from "root/src/modules/AuditReport/Parser/types";
import AuditReportMetadata from "./components/AuditReportMetadata";
import { importParsedAuditReport } from "./modules/audit-report";

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<ParsedAuditReport | null>(
    null,
  );

  useEffect(() => {
    setIsLoading(true);
    importParsedAuditReport()
      .then((auditReport) => {
        setAuditReport(auditReport);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!auditReport) {
    return <div>Error: Could not read parsed audit report</div>;
  }

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold text-center">npm-audit-visualizer</h1>
      </header>
      <main>
        <AuditReportMetadata metadata={auditReport.metadata} />
      </main>
      <footer />
    </>
  );
};

export default App;
