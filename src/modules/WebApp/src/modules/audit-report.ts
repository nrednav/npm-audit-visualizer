import {
  ParsedAuditReport,
  ParsedAuditReportSchema,
} from "root/src/modules/AuditReport/Parser/types";

import { assertIsError } from "root/src/shared/utils";

export const importParsedAuditReport =
  async (): Promise<ParsedAuditReport | null> => {
    try {
      const res = await fetch("/parsed-audit-report.json");
      const parsedAuditReport = (await res.json()) as unknown;
      return ParsedAuditReportSchema.parse(parsedAuditReport);
    } catch (error) {
      assertIsError(error);
      console.error(`Failed to import parsed audit report: \n${error.message}`);
      return null;
    }
  };
