import {
  getWorkspaceAccessToken,
  WorkspaceSessionError,
} from "../../auth/workspaceSession";
import type { CreateJobDraftInput, UpdateJobInput } from "./types";
import type { JobPosting } from "../types";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(
  /\/+$/,
  "",
);

type JobApiSkill = {
  skillId: string;
  required: boolean;
  weight: number;
  skill: { id: string; name: string; normalizedName: string };
};

type EmployerJob = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  workMode: "ONSITE" | "HYBRID" | "REMOTE" | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "CLOSED";
  skills: JobApiSkill[];
};

type EmployerJobsPage = {
  data: EmployerJob[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
};

class JobApiError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(
    message: string,
    options: { status?: number; code?: string } = {},
  ) {
    super(message);
    this.name = "JobApiError";
    this.status = options.status;
    this.code = options.code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmployerJob(value: unknown): value is EmployerJob {
  if (!isRecord(value)) return false;
  const validModes = ["ONSITE", "HYBRID", "REMOTE"];
  const validStatuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "PUBLISHED",
    "REJECTED",
    "CLOSED",
  ];
  const categoryIsValid =
    value.category === null ||
    (isRecord(value.category) &&
      typeof value.category.id === "string" &&
      typeof value.category.name === "string");
  const skillsAreValid =
    Array.isArray(value.skills) &&
    value.skills.every((item) => {
      if (
        !isRecord(item) ||
        typeof item.skillId !== "string" ||
        typeof item.required !== "boolean" ||
        typeof item.weight !== "number" ||
        !Number.isFinite(item.weight)
      )
        return false;
      return (
        item.skill === null ||
        (isRecord(item.skill) &&
          typeof item.skill.id === "string" &&
          typeof item.skill.name === "string" &&
          typeof item.skill.normalizedName === "string")
      );
    });
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (typeof value.location === "string" || value.location === null) &&
    ((typeof value.workMode === "string" &&
      validModes.includes(value.workMode)) ||
      value.workMode === null) &&
    (typeof value.categoryId === "string" || value.categoryId === null) &&
    categoryIsValid &&
    skillsAreValid &&
    typeof value.status === "string" &&
    validStatuses.includes(value.status)
  );
}

function apiErrorMessage(status: number, payload: unknown): string {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have permission to manage this job.";
  if (status === 404)
    return "This job could not be found or is no longer available.";
  if (status === 400) {
    const code =
      isRecord(payload) && typeof payload.code === "string" ? payload.code : "";
    if (code === "CANNOT_EDIT_JOB") {
      return "This job's status changed and it can no longer be edited. Reload the job list and try again.";
    }
    return "Some job details are invalid. Review the form and try again.";
  }
  if (status >= 500)
    return "The job service is temporarily unavailable. Try again.";
  return "The job could not be saved. Try again.";
}

async function requestJobApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let token: string;
  try {
    token = await getWorkspaceAccessToken();
  } catch (error) {
    if (error instanceof WorkspaceSessionError) {
      throw new JobApiError(error.message, { status: error.status });
    }
    throw new JobApiError("Could not verify your session. Try again.");
  }
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new JobApiError("Could not connect to the job service.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const code =
      isRecord(payload) && typeof payload.code === "string"
        ? payload.code
        : undefined;
    const message = apiErrorMessage(response.status, payload);
    throw new JobApiError(message, { status: response.status, code });
  }

  return payload as T;
}

async function listEmployerJobs(): Promise<EmployerJobsPage> {
  const firstPage = await getEmployerJobsPage(1);
  const data = [...firstPage.data];
  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const nextPage = await getEmployerJobsPage(page);
    data.push(...nextPage.data);
  }
  return { ...firstPage, data };
}

async function getEmployerJobsPage(page: number): Promise<EmployerJobsPage> {
  const result = await requestJobApi<unknown>(
    `/jobs/my?page=${page}&pageSize=100`,
  );
  if (
    !isRecord(result) ||
    !Array.isArray(result.data) ||
    !result.data.every(isEmployerJob) ||
    !isRecord(result.meta)
  ) {
    throw new JobApiError("The job service returned invalid job data.");
  }
  return result as EmployerJobsPage;
}

async function getEmployerJob(jobId: string): Promise<EmployerJob> {
  if (!jobId.trim()) throw new JobApiError("A job ID is required.");
  const result = await requestJobApi<unknown>(
    `/jobs/my/${encodeURIComponent(jobId)}`,
  );
  if (!isEmployerJob(result))
    throw new JobApiError("The job service returned invalid job data.");
  return result;
}

function mapEmployerJob(job: EmployerJob): JobPosting {
  const status = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending approval",
    PUBLISHED: "Published",
    REJECTED: "Rejected",
    CLOSED: "Closed",
  } as const;

  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location ?? "",
    status: status[job.status],
    department: job.category?.name,
    categoryId: job.categoryId,
    workMode: job.workMode,
    requiredSkills: job.skills.map(({ skillId, skill, required, weight }) => ({
      id: skill?.id ?? skillId,
      name: skill?.name ?? "",
      normalizedName: skill?.normalizedName ?? "",
      required,
      weight,
    })),
  };
}

async function createJobDraft(
  input: CreateJobDraftInput,
): Promise<EmployerJob> {
  const result = await requestJobApi<unknown>("/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!isEmployerJob(result))
    throw new JobApiError("The job service returned invalid job data.");
  return result;
}

async function updateJobDraft(
  jobId: string,
  input: UpdateJobInput,
): Promise<EmployerJob> {
  if (!jobId.trim())
    return Promise.reject(new JobApiError("A job ID is required."));
  const result = await requestJobApi<unknown>(
    `/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!isEmployerJob(result))
    throw new JobApiError("The job service returned invalid job data.");
  return result;
}

export {
  createJobDraft,
  getEmployerJob,
  JobApiError,
  listEmployerJobs,
  mapEmployerJob,
  updateJobDraft,
};
export type { EmployerJob, EmployerJobsPage, JobApiSkill };
