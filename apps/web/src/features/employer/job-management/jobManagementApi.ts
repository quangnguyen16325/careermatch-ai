import {
  refreshWorkspaceAccessToken,
  WorkspaceSessionError,
} from "../../auth/workspaceSession";
import { normalizeEmployerJobsQuery } from "./jobListUtils";
import type {
  EmployerJobListItem,
  EmployerJobsPage,
  EmployerJobsQuery,
  EmployerJobMutationAction,
} from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(
  /\/+$/,
  "",
);

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
  const validCategory = (category: unknown) =>
    category === null ||
    (isRecord(category) &&
      typeof category.id === "string" &&
      typeof category.name === "string");
  const validSkill = (entry: unknown) =>
    isRecord(entry) &&
    typeof entry.skillId === "string" &&
    typeof entry.required === "boolean" &&
    typeof entry.weight === "number" &&
    entry.weight >= 0.1 &&
    entry.weight <= 10 &&
    isRecord(entry.skill) &&
    typeof entry.skill.id === "string" &&
    typeof entry.skill.name === "string";
  const validDate = (date: unknown) =>
    typeof date === "string" && !Number.isNaN(Date.parse(date));

  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "CLOSED"].includes(
      String(value.status),
    ) &&
    (typeof value.location === "string" || value.location === null) &&
    (["ONSITE", "HYBRID", "REMOTE"].includes(String(value.workMode)) ||
      value.workMode === null) &&
    validDate(value.createdAt) &&
    validDate(value.updatedAt) &&
    (validDate(value.publishedAt) || value.publishedAt === null) &&
    validCategory(value.category) &&
    Array.isArray(value.skills) &&
    value.skills.every(validSkill) &&
    isRecord(value._count) &&
    Number.isInteger(value._count.applications) &&
    Number(value._count.applications) >= 0
  );
}

function isMeta(value: unknown): value is EmployerJobsPage["meta"] {
  return (
    isRecord(value) &&
    Number.isInteger(value.total) &&
    Number(value.total) >= 0 &&
    Number.isInteger(value.page) &&
    Number(value.page) >= 1 &&
    Number.isInteger(value.pageSize) &&
    Number(value.pageSize) >= 1 &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function failureMessage(
  status: number,
  action: "list" | EmployerJobMutationAction,
  code?: string,
): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (code === "COMPANY_NOT_VERIFIED")
    return "Your company must be verified before submitting a job for approval.";
  if (status === 403)
    return action === "list"
      ? "You do not have permission to view these jobs."
      : "You do not have permission to change this job.";
  if (status === 404)
    return action === "list"
      ? "The job list is not available."
      : "This job could not be found.";
  if (status === 400)
    return action === "close"
      ? "This job can no longer be closed. Reload the list and check its current status."
      : "This action is not available for the job's current status. Reload the list and try again.";
  if (status >= 500)
    return "The job service is temporarily unavailable. Try again.";
  return "Could not load job postings. Try again.";
}

async function readFailureMessage(
  response: Response,
  action: EmployerJobMutationAction,
): Promise<string> {
  const body = await readJson(response);
  const code =
    isRecord(body) && typeof body.code === "string" ? body.code : undefined;
  return failureMessage(response.status, action, code);
}

async function authenticatedRequest(
  path: string,
  method: "GET" | "POST" | "DELETE",
  signal?: AbortSignal,
): Promise<Response> {
  let token: string;
  try {
    token = await refreshWorkspaceAccessToken();
  } catch (error) {
    const message =
      error instanceof WorkspaceSessionError && error.status === 401
        ? "Your session has expired. Please sign in again."
        : "Could not verify your session. Try again.";
    throw new EmployerJobsApiError(message);
  }

  try {
    return await fetch(`${apiBaseUrl}${path}`, {
      cache: "no-store",
      credentials: "omit",
      headers: { Authorization: `Bearer ${token}` },
      method,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new EmployerJobsApiError("Could not connect to the job service.");
  }
}

export async function listEmployerJobs(
  input: EmployerJobsQuery = {},
  signal?: AbortSignal,
): Promise<EmployerJobsPage> {
  const query = normalizeEmployerJobsQuery(input);
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);

  const response = await authenticatedRequest(
    `/jobs/my?${params.toString()}`,
    "GET",
    signal,
  );

  if (!response.ok)
    throw new EmployerJobsApiError(
      failureMessage(response.status, "list"),
      response.status,
    );
  const result: unknown = await readJson(response);
  if (
    !isRecord(result) ||
    !Array.isArray(result.data) ||
    !result.data.every(isJob) ||
    !isMeta(result.meta)
  ) {
    throw new EmployerJobsApiError(
      "The job service returned invalid job data.",
    );
  }
  return result as EmployerJobsPage;
}

export async function closeEmployerJob(
  jobId: string,
): Promise<EmployerJobListItem> {
  if (!jobId.trim())
    throw new EmployerJobsApiError(
      "A job ID is required before closing a posting.",
    );
  return updateEmployerJob(jobId, "close", "CLOSED");
}

const ACTION_ENDPOINTS: Record<EmployerJobMutationAction, string> = {
  close: "close",
  delete: "",
  submit: "submit-approval",
  withdraw: "withdraw",
};

const ACTION_STATUSES = {
  close: "CLOSED",
  submit: "PENDING_APPROVAL",
  withdraw: "DRAFT",
} as const;

async function updateEmployerJob(
  jobId: string,
  action: Exclude<EmployerJobMutationAction, "delete">,
  expectedStatus: (typeof ACTION_STATUSES)[typeof action],
): Promise<EmployerJobListItem> {
  if (!jobId.trim())
    throw new EmployerJobsApiError(
      "A job ID is required before changing a posting.",
    );
  const response = await authenticatedRequest(
    `/jobs/${encodeURIComponent(jobId)}/${ACTION_ENDPOINTS[action]}`,
    "POST",
  );
  if (!response.ok)
    throw new EmployerJobsApiError(
      await readFailureMessage(response, action),
      response.status,
    );
  const result: unknown = await readJson(response);
  if (!isJob(result) || result.status !== expectedStatus)
    throw new EmployerJobsApiError(
      action === "close"
        ? "The job service returned an invalid close result."
        : "The job service returned an invalid status update.",
    );
  return result;
}

export async function performEmployerJobAction(
  jobId: string,
  action: EmployerJobMutationAction,
): Promise<EmployerJobListItem | null> {
  if (action === "delete") {
    if (!jobId.trim())
      throw new EmployerJobsApiError(
        "A job ID is required before deleting a draft.",
      );
    const response = await authenticatedRequest(
      `/jobs/${encodeURIComponent(jobId)}`,
      "DELETE",
    );
    if (!response.ok)
      throw new EmployerJobsApiError(
        await readFailureMessage(response, action),
        response.status,
      );
    const result: unknown = await readJson(response);
    if (!isRecord(result) || result.success !== true)
      throw new EmployerJobsApiError(
        "The job service did not confirm draft deletion.",
      );
    return null;
  }
  return updateEmployerJob(jobId, action, ACTION_STATUSES[action]);
}
