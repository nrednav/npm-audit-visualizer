import {
  ParsedAuditReport,
  ParsedAuditReportSchema,
} from "root/src/modules/AuditReport/Parser/types";

export const importParsedAuditReport =
  async (): Promise<ParsedAuditReport | null> => {
    try {
      const res = await fetch("/parsed-audit-report.json");
      const parsedAuditReport = (await res.json()) as unknown;
      return ParsedAuditReportSchema.parse(parsedAuditReport);
    } catch (error) {
      return null;
    }
  };
