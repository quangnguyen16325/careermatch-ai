import { refreshWorkspaceAccessToken } from "../../auth/workspaceSession";
import { normalizeEmployerJobsQuery } from "./jobListUtils";
import type {
  EmployerJobListItem,
  EmployerJobsPage,
  EmployerJobsQuery,
} from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/+$/, "");

export class EmployerJobsApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "EmployerJobsApiError";
    this.status = status;
  }
}

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJob(value: unknown): value is EmployerJobListItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "CLOSED"].includes(String(value.status)) &&
    (typeof value.location === "string" || value.location === null) &&
    (typeof value.workMode === "string" || value.workMode === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (typeof value.publishedAt === "string" || value.publishedAt === null) &&
    (isRecord(value.category) || value.category === null) &&
    Array.isArray(value.skills) &&
    isRecord(value._count) &&
    Number.isInteger(value._count.applications)
  );
}

function isMeta(value: unknown): value is EmployerJobsPage["meta"] {
  return (
    isRecord(value) &&
    Number.isInteger(value.total) && Number(value.total) >= 0 &&
    Number.isInteger(value.page) && Number(value.page) >= 1 &&
    Number.isInteger(value.pageSize) && Number(value.pageSize) >= 1 &&
    Number.isInteger(value.totalPages) && Number(value.totalPages) >= 0
  );
}

async function readJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch { return null; }
}

function failureMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to view these jobs.";
  if (status === 404) return "The job list is not available.";
  if (status >= 500) return "The job service is temporarily unavailable. Try again.";
  return "Could not load job postings. Try again.";
}

export async function listEmployerJobs(
  input: EmployerJobsQuery = {},
  signal?: AbortSignal,
): Promise<EmployerJobsPage> {
  const query = normalizeEmployerJobsQuery(input);
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);

  let token: string;
  try {
    token = await refreshWorkspaceAccessToken();
  } catch (error) {
    const message = error instanceof Error && error.message.includes("401")
      ? "Your session has expired. Please sign in again."
      : "Could not verify your session. Try again.";
    throw new EmployerJobsApiError(message);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/jobs/my?${params.toString()}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new EmployerJobsApiError("Could not connect to the job service.");
  }

  if (!response.ok) throw new EmployerJobsApiError(failureMessage(response.status), response.status);
  const result: unknown = await readJson(response);
  if (!isRecord(result) || !Array.isArray(result.data) || !result.data.every(isJob) || !isMeta(result.meta)) {
    throw new EmployerJobsApiError("The job service returned invalid job data.");
  }
  return result as EmployerJobsPage;
}
