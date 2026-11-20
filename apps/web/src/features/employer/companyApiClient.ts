import { getWorkspaceAccess } from "../auth/workspaceSession";
import {
  normalizeCompanyApiFailure,
  type CompanyApiFailure,
  type CompanyApiProfile,
  type CreateCompanyRequest,
  type UpdateCompanyRequest,
} from "./companyApi";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/+$/, "");

class CompanyApiRequestError extends Error {
  readonly failure: CompanyApiFailure;

  constructor(failure: CompanyApiFailure) {
    super(failure.message);
    this.name = "CompanyApiRequestError";
    this.failure = failure;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isCompanyProfile(value: unknown): value is CompanyApiProfile {
  if (!isRecord(value)) return false;
  const nullableString = (field: unknown) => field === null || typeof field === "string";
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    nullableString(value.description) &&
    nullableString(value.website) &&
    nullableString(value.location) &&
    nullableString(value.taxCode) &&
    ["PENDING", "VERIFIED", "REJECTED"].includes(String(value.verificationStatus)) &&
    nullableString(value.verifiedAt) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string";
}

function accessFailure(status: "unauthenticated" | "forbidden" | "unavailable") {
  const statusCode = status === "unauthenticated" ? 401 : status === "forbidden" ? 403 : 503;
  return new CompanyApiRequestError(normalizeCompanyApiFailure(statusCode, {
    code: status === "forbidden" ? "FORBIDDEN" : undefined,
  }));
}

async function requestCompanyProfile(
  method: "GET" | "POST" | "PATCH",
  payload?: CreateCompanyRequest | UpdateCompanyRequest,
  fetcher: typeof fetch = fetch,
): Promise<CompanyApiProfile | null> {
  const session = await getWorkspaceAccess();
  if (session.status !== "authenticated") throw accessFailure(session.status);
  if (session.role !== "EMPLOYER") {
    throw accessFailure("forbidden");
  }

  const endpoint = method === "POST" ? "/companies" : "/companies/my";
  const response = await fetcher(`${apiBaseUrl}${endpoint}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    method,
  }).catch(() => {
    throw new CompanyApiRequestError(normalizeCompanyApiFailure(0, null));
  });

  const body = await readJson(response);
  if (!response.ok) {
    const failure = normalizeCompanyApiFailure(response.status, body);
    if (method === "GET" && response.status === 404 && failure.code === "COMPANY_NOT_FOUND") {
      return null;
    }
    throw new CompanyApiRequestError(failure);
  }
  if (!isCompanyProfile(body)) {
    throw new CompanyApiRequestError(normalizeCompanyApiFailure(502, {
      code: "INVALID_COMPANY_RESPONSE",
    }));
  }
  return body;
}

function getMyCompanyProfile(fetcher?: typeof fetch) {
  return requestCompanyProfile("GET", undefined, fetcher);
}

function createMyCompanyProfile(payload: CreateCompanyRequest, fetcher?: typeof fetch) {
  return requestCompanyProfile("POST", payload, fetcher);
}

function updateMyCompanyProfile(payload: UpdateCompanyRequest, fetcher?: typeof fetch) {
  return requestCompanyProfile("PATCH", payload, fetcher);
}

export {
  CompanyApiRequestError,
  createMyCompanyProfile,
  getMyCompanyProfile,
  isCompanyProfile,
  updateMyCompanyProfile,
};
