import { Either, left, right } from "fp-ts/lib/Either.js";
import { AppError } from "src/shared/errors.js";
import { logger } from "src/shared/modules/logger.js";
import type { RawJson } from "src/shared/types.js";
import { assertIsError } from "src/shared/utils.js";
import { AuditReport, AuditReportSchema } from "./schema.js";

export const validateAuditReport = (
  auditReport: RawJson,
): Either<AppError, AuditReport> => {
  logger.debug("Validating audit report");

  try {
    const validatedAuditReport = AuditReportSchema.parse(auditReport);

    return right(validatedAuditReport);
  } catch (error) {
    assertIsError(error);

    return left(
      new AppError(
        "Failed to validate audit report",
        {
          file: "modules/AuditReport/Validator/index.ts",
          functionName: "validateAuditReport",
          data: { auditReport },
        },
        error,
      ),
    );
  }
};
