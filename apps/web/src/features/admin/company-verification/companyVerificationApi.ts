import { resolveWorkspaceAccessToken } from "../../auth/workspaceSession";
import type {
  CompanyVerificationQueueQuery,
  CompanyVerificationQueueResponse,
  CompanyVerificationStatus,
} from "./types";

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

function errorFromResponse(
  status: number,
  payload: unknown,
): CompanyVerificationApiError {
  const code =
    isJsonObject(payload) && typeof payload.code === "string"
      ? payload.code
      : undefined;
  const backendMessage = isJsonObject(payload) ? payload.message : undefined;
  const message =
    typeof backendMessage === "string"
      ? backendMessage
      : Array.isArray(backendMessage)
        ? backendMessage
            .filter((part): part is string => typeof part === "string")
            .join(" ")
        : status === 401
          ? "Your session has expired. Sign in again and retry."
          : status === 403
            ? "Your account does not have permission to view company verification."
            : status >= 500
              ? "The company verification service is unavailable. Try again later."
              : "The company list could not be loaded.";

  return new CompanyVerificationApiError(message, status, code);
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

  const payload = await readJson(response);
  if (!response.ok) throw errorFromResponse(response.status, payload);
  if (!isQueueResponse(payload)) {
    throw new CompanyVerificationApiError(
      "The company verification service returned an unexpected response.",
      response.status,
      "INVALID_RESPONSE",
    );
  }

  return payload;
}

export { CompanyVerificationApiError, getCompanyVerificationQueue };
