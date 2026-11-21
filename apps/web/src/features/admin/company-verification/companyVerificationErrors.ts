import { CompanyVerificationApiError } from "./companyVerificationApi";

function getQueueErrorMessage(
  error: unknown,
  decisionWasSaved = false,
): string {
  if (decisionWasSaved)
    return "The decision was saved, but the company list could not be refreshed. Retry loading to show the current status.";
  if (!(error instanceof CompanyVerificationApiError)) {
    return "Could not load company verification requests. Check your connection and retry.";
  }
  if (error.code === "AUTHENTICATION_REQUIRED")
    return "Your session has expired. Sign in again, then retry.";
  if (error.code === "FORBIDDEN")
    return "Your account does not have permission to view this queue.";
  if (error.status === null)
    return `${error.message} Check your connection and retry.`;
  if (error.status >= 500)
    return "The company verification service is unavailable. Retry in a moment.";
  return error.message;
}

function getDecisionErrorMessage(error: unknown): string {
  if (!(error instanceof CompanyVerificationApiError))
    return "The decision could not be confirmed. Refresh the queue before retrying.";
  if (error.code === "INVALID_STATE_TRANSITION")
    return "This company status changed or this action is no longer allowed. Refresh the queue and review it again.";
  if (error.code === "COMPANY_NOT_FOUND")
    return "This company no longer exists. Refresh the queue.";
  if (error.code === "REJECTION_REASON_REQUIRED")
    return "Enter a rejection reason of at least 10 characters.";
  if (error.code === "AUTHENTICATION_REQUIRED")
    return "Your session has expired. Sign in again before retrying.";
  if (error.code === "FORBIDDEN")
    return "Your account does not have permission to decide company verification.";
  if (error.status === null)
    return `${error.message} Refresh the queue before submitting again.`;
  if (error.status >= 500)
    return "The company verification service is unavailable. Retry loading the queue before submitting again.";
  return error.message;
}

export { getDecisionErrorMessage, getQueueErrorMessage };
