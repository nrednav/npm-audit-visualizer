import * as E from "fp-ts/lib/Either.js";
import { AppError } from "src/shared/errors.js";
import type { RawJson } from "src/shared/types.js";
import { assertIsError } from "src/shared/utils.js";
import { AuditReport, AuditReportSchema } from "./audit-report-schema.js";

export const validateAuditReport = (
  auditReport: RawJson,
): E.Either<AppError, AuditReport> => {
  try {
    const validatedAuditReport = AuditReportSchema.parse(auditReport);
    return E.right(validatedAuditReport);
  } catch (error) {
    assertIsError(error);
    return E.left(
      new AppError("ValidateAuditReportFailed", error.message, {
        file: "modules/AuditReport/Validator/index.ts",
        functionName: "validateAuditReport",
        data: { auditReport: JSON.stringify(auditReport) },
      }),
    );
  }
};
