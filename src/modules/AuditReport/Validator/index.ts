import * as E from "fp-ts/Either";
import { AppError } from "src/shared/errors.js";
import type { RawJson } from "src/shared/types.js";
import { assertIsError } from "src/shared/utils.js";
import { AuditReport, AuditReportSchema } from "./audit-report-schema.js";

type ValidateAuditReport = (
  auditReport: RawJson,
  auditReportSchema: typeof AuditReportSchema,
) => E.Either<AppError, AuditReport>;

export const validateAuditReport: ValidateAuditReport = (
  auditReport,
  auditReportSchema,
) => {
  try {
    const validatedAuditReport = auditReportSchema.parse(auditReport);
    return E.right(validatedAuditReport);
  } catch (error) {
    assertIsError(error);
    return E.left(
      new AppError("ValidateAuditReportFailed", error.message, {
        file: "modules/AuditReport/Validator/index.ts",
        functionName: "validateAuditReport",
        data: {
          auditReport: JSON.stringify(auditReport),
          auditReportSchema: JSON.stringify(auditReportSchema),
        },
      }),
    );
  }
};
