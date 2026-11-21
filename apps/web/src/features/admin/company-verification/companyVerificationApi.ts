import { resolveWorkspaceAccessToken } from "../../auth/workspaceSession";
import type {
  CompanyVerificationDecision,
  CompanyVerificationQueueQuery,
  CompanyVerificationQueueResponse,
  CompanyVerificationStatus,
} from "./types";
import { validateCompanyVerificationDecision } from "./validation";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(
  /\/+$/,
  "",
);

type JsonObject = Record<string, unknown>;

class CompanyVerificationApiError extends Error {
  readonly status: number | null;
  readonly code?: string;

  constructor(message: string, status: number | null, code?: string) {
    super(message);
    this.name = "CompanyVerificationApiError";
    this.status = status;
    this.code = code;
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is CompanyVerificationStatus {
  return value === "PENDING" || value === "VERIFIED" || value === "REJECTED";
}

function isDecisionResponse(
  value: unknown,
  companyId: string,
  expectedStatus: CompanyVerificationDecision["status"],
): boolean {
  return (
    isJsonObject(value) &&
    value.id === companyId &&
    value.verificationStatus === expectedStatus
  );
}

function isQueueResponse(
  value: unknown,
): value is CompanyVerificationQueueResponse {
  if (
    !isJsonObject(value) ||
    !Array.isArray(value.data) ||
    !isJsonObject(value.meta)
  ) {
    return false;
  }

  const { total, page, pageSize, totalPages } = value.meta;
  if (![total, page, pageSize, totalPages].every(Number.isInteger))
    return false;

  return value.data.every((item) => {
    if (!isJsonObject(item) || !isJsonObject(item._count)) return false;
    return (
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      (item.description === null || typeof item.description === "string") &&
      (item.website === null || typeof item.website === "string") &&
      (item.location === null || typeof item.location === "string") &&
      (item.taxCode === null || typeof item.taxCode === "string") &&
      isStatus(item.verificationStatus) &&
      (item.verifiedAt === null || typeof item.verifiedAt === "string") &&
      typeof item.createdAt === "string" &&
      typeof item.updatedAt === "string" &&
      Number.isInteger(item._count.jobs) &&
      Number.isInteger(item._count.employers)
    );
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("The request was aborted.");
  error.name = "AbortError";
  throw error;
}

function errorFromResponse(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): CompanyVerificationApiError {
  const code =
    isJsonObject(payload) && typeof payload.code === "string"
      ? payload.code
      : undefined;
  const backendMessage = isJsonObject(payload) ? payload.message : undefined;
  const message =
    typeof backendMessage === "string"
      ? getSafeBackendMessage(backendMessage, fallbackMessage)
      : Array.isArray(backendMessage)
        ? getSafeBackendMessage(
            backendMessage
              .filter((part): part is string => typeof part === "string")
              .join(" "),
            fallbackMessage,
          )
        : fallbackMessage;

  return new CompanyVerificationApiError(message, status, code);
}

function getSafeBackendMessage(message: string, fallbackMessage: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized || /\b(?:stack|traceback| at [\w./\\-]+:\d+)\b/i.test(normalized))
    return fallbackMessage;
  return normalized.slice(0, 400);
}

async function getCompanyVerificationQueue(
  query: CompanyVerificationQueueQuery,
  signal?: AbortSignal,
): Promise<CompanyVerificationQueueResponse> {
  const tokenResult = await resolveWorkspaceAccessToken();
  if (tokenResult.status === "unauthenticated") {
    throw new CompanyVerificationApiError(
      "Sign in to access company verification.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }
  if (tokenResult.status === "unavailable") {
    throw new CompanyVerificationApiError(
      "Your session could not be verified. Try again.",
      null,
      "SESSION_UNAVAILABLE",
    );
  }

  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined)
    params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/admin/companies${suffix}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new CompanyVerificationApiError(
      "Could not connect to the company verification service.",
      null,
      "NETWORK_ERROR",
    );
  }

  throwIfAborted(signal);
  const payload = await readJson(response);
  throwIfAborted(signal);
  if (!response.ok)
    throw errorFromResponse(
      response.status,
      payload,
      "The company list could not be loaded.",
    );
  if (!isQueueResponse(payload)) {
    throw new CompanyVerificationApiError(
      "The company verification service returned an unexpected response.",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  return payload;
}

async function decideCompanyVerification(
  companyId: string,
  decision: CompanyVerificationDecision,
): Promise<void> {
  const normalizedId = companyId.trim();
  if (!normalizedId) {
    throw new CompanyVerificationApiError(
      "A company must be selected before submitting a decision.",
      null,
      "COMPANY_ID_REQUIRED",
    );
  }
  if (decision.status !== "VERIFIED" && decision.status !== "REJECTED") {
    throw new CompanyVerificationApiError(
      "Choose a supported company verification decision.",
      400,
      "INVALID_DECISION",
    );
  }

  const validationError = validateCompanyVerificationDecision(decision);
  if (validationError) {
    throw new CompanyVerificationApiError(
      validationError === "reason-required"
        ? "A reason is required to reject a company."
        : validationError === "reason-too-short"
          ? "The rejection reason must contain at least 10 characters."
          : "The reason must be no longer than 1000 characters.",
      400,
      validationError.toUpperCase().replaceAll("-", "_"),
    );
  }

  const tokenResult = await resolveWorkspaceAccessToken();
  if (tokenResult.status === "unauthenticated") {
    throw new CompanyVerificationApiError(
      "Sign in to decide company verification requests.",
      401,
      "AUTHENTICATION_REQUIRED",
    );
  }
  if (tokenResult.status === "unavailable") {
    throw new CompanyVerificationApiError(
      "Your session could not be verified. Try again.",
      null,
      "SESSION_UNAVAILABLE",
    );
  }

  const payload: CompanyVerificationDecision = {
    status: decision.status,
    ...(decision.reason?.trim() ? { reason: decision.reason.trim() } : {}),
  };

  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl}/admin/companies/${encodeURIComponent(normalizedId)}/verify`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${tokenResult.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    throw new CompanyVerificationApiError(
      "Could not connect to the company verification service. The decision outcome is unknown; refresh the queue before submitting again.",
      null,
      "NETWORK_ERROR",
    );
  }

  const responseBody = await readJson(response);
  if (!response.ok) {
    const apiError = errorFromResponse(
      response.status,
      responseBody,
      "The company verification decision could not be completed.",
    );
    throw new CompanyVerificationApiError(
      apiError.message,
      apiError.status,
      apiError.code,
    );
  }
  if (!isDecisionResponse(responseBody, normalizedId, decision.status)) {
    throw new CompanyVerificationApiError(
      "The service response did not confirm the requested verification status. Refresh the queue before trying again.",
      response.status,
      "INVALID_RESPONSE",
    );
  }
}

export {
  CompanyVerificationApiError,
  decideCompanyVerification,
  getCompanyVerificationQueue,
};
