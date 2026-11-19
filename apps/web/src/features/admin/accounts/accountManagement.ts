import type { AccountStatus, AdminUser } from "../types";
import type {
  AccountAction,
  AccountActionReasonValidation,
  AccountOperationError,
  AccountOperationErrorKind,
  AccountOperationResult,
  AccountSearchCriteria,
} from "./types";

type ErrorLike = {
  status?: unknown;
  code?: unknown;
};

function normalizeAccountSearchKeyword(keyword: string) {
  return keyword.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function filterAccounts(accounts: readonly AdminUser[], criteria: AccountSearchCriteria) {
  const keyword = normalizeAccountSearchKeyword(criteria.keyword);

  return accounts.filter((account) => {
    const matchesKeyword = !keyword || normalizeAccountSearchKeyword(`${account.name} ${account.email}`).includes(keyword);
    const matchesRole = !criteria.role || criteria.role === "All roles" || account.role === criteria.role;
    const matchesStatus = !criteria.status || criteria.status === "All statuses" || account.status === criteria.status;

    return matchesKeyword && matchesRole && matchesStatus;
  });
}

function validateAccountActionReason(reason: string): AccountActionReasonValidation {
  const normalized = reason.trim();
  return normalized ? { valid: true, value: normalized } : { valid: false, error: "required" };
}

function canPerformAccountAction(status: AccountStatus, action: AccountAction) {
  return action === "lock" ? status === "Active" : status === "Suspended";
}

function normalizeAccountOperationError(error: unknown): AccountOperationError {
  const candidate = error && typeof error === "object" ? error as ErrorLike : {};
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";

  let kind: AccountOperationErrorKind;
  if (status === 401 || code === "AUTHENTICATION_REQUIRED") {
    kind = "unauthenticated";
  } else if (status === 403 || code === "FORBIDDEN") {
    kind = "forbidden";
  } else if (status === 400 || code === "VALIDATION_ERROR") {
    kind = "invalid_request";
  } else if (status === 404 || code === "ACCOUNT_NOT_FOUND") {
    kind = "not_found";
  } else if (status === 0 || (status !== undefined && status >= 500) || error instanceof TypeError) {
    kind = "unavailable";
  } else {
    kind = "unknown";
  }

  return { kind };
}

function getAccountOperationErrorMessage(kind: AccountOperationErrorKind) {
  switch (kind) {
    case "unauthenticated":
      return "Your session has expired. Sign in again to continue.";
    case "forbidden":
      return "You do not have permission to manage accounts.";
    case "invalid_request":
      return "Check the action reason and try again.";
    case "not_found":
      return "This account could not be found. Refresh the account list and try again.";
    case "unavailable":
      return "Account management is temporarily unavailable. Try again shortly.";
    case "unknown":
      return "We could not complete this account action. Try again.";
  }
}

function getDemoAccountActionSuccessMessage(action: AccountAction, accountName: string) {
  const actionLabel = action === "lock" ? "locked" : "unlocked";
  return `Demo preview: ${accountName}'s account was ${actionLabel} in this preview only. No real account was changed.`;
}

function applyAccountOperationResult(accounts: AdminUser[], result: AccountOperationResult): AdminUser[] {
  if (!result.success) return accounts;
  return accounts.map((account) => account.id === result.accountId ? { ...account, status: result.status } : account);
}

export {
  canPerformAccountAction,
  applyAccountOperationResult,
  filterAccounts,
  getDemoAccountActionSuccessMessage,
  getAccountOperationErrorMessage,
  normalizeAccountOperationError,
  normalizeAccountSearchKeyword,
  validateAccountActionReason,
};
