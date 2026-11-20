import type {
  CompanyVerificationDecision,
  CompanyVerificationValidationError,
} from "./types";

/** Mirrors VerifyCompanyDto and the Admin rejection rule in CompaniesService. */
function validateCompanyVerificationDecision(
  decision: CompanyVerificationDecision,
): CompanyVerificationValidationError | null {
  const reason = decision.reason?.trim();

  if (reason && reason.length > 1000) return "reason-too-long";
  if (decision.status === "REJECTED") {
    if (!reason) return "reason-required";
    if (reason.length < 10) return "reason-too-short";
  }

  return null;
}

export { validateCompanyVerificationDecision };
