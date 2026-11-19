import type { AccountStatus, AdminRole, AdminUser } from "../types";

export type AccountAction = "lock" | "unlock";
export type AccountActionReason = string;

export type AccountSearchCriteria = {
  keyword: string;
  role?: AdminRole | "All roles";
  status?: AccountStatus | "All statuses";
};

export type AccountActionRequest = {
  accountId: AdminUser["id"];
  action: AccountAction;
  reason: AccountActionReason;
};

export type AccountOperationErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "invalid_request"
  | "not_found"
  | "unavailable"
  | "unknown";

export type AccountAuthorizationError = Extract<
  AccountOperationErrorKind,
  "unauthenticated" | "forbidden"
>;

export type AccountOperationError = {
  kind: AccountOperationErrorKind;
};

export type AccountOperationResult =
  | { success: true; accountId: AdminUser["id"]; status: AccountStatus }
  | { success: false; error: AccountOperationError };

export type AccountActionReasonValidation =
  | { valid: true; value: AccountActionReason }
  | { valid: false; error: "required" };
