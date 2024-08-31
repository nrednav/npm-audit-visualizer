import { useEffect, useState } from "react";
import {
  ParsedAuditReport,
  ParsedAuditReportSchema,
} from "root/src/modules/AuditReport/Parser/types";
import { assertIsError } from "root/src/shared/utils";

export const useParsedAuditReport = () => {
  const [data, setData] = useState<ParsedAuditReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParsedAuditReport = async () => {
      try {
        const res = await fetch("/parsed-audit-report.json");
        const rawJson = (await res.json()) as unknown;
        const data = ParsedAuditReportSchema.parse(rawJson);

        setData(data);
      } catch (error) {
        assertIsError(error);

        console.error(
          `Failed to import parsed audit report: \n${error.message}`,
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchParsedAuditReport();
  }, []);

  return { parsedAuditReport: data, loading };
};
