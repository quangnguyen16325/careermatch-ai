export const EMPLOYER_JOB_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "REJECTED",
  "CLOSED",
] as const;

export type EmployerJobStatus = (typeof EMPLOYER_JOB_STATUSES)[number];

export type EmployerJobAction =
  | "edit"
  | "submit"
  | "withdraw"
  | "close"
  | "delete";

export type EmployerJobListItem = {
  id: string;
  title: string;
  description: string;
  status: EmployerJobStatus;
  location: string | null;
  workMode: "ONSITE" | "HYBRID" | "REMOTE" | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  category: { id: string; name: string } | null;
  skills: Array<{
    skillId: string;
    required: boolean;
    weight: number;
    skill: { id: string; name: string };
  }>;
  _count: { applications: number };
};

export type EmployerJobsMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EmployerJobsPage = {
  data: EmployerJobListItem[];
  meta: EmployerJobsMeta;
};

export type EmployerJobsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EmployerJobStatus;
};

export type EmployerJobsLoadState =
  | { status: "loading" }
  | { status: "success"; page: EmployerJobsPage }
  | { status: "empty"; page: EmployerJobsPage }
  | { status: "error"; message: string };
