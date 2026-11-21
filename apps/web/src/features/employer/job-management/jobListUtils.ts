import {
  EMPLOYER_JOB_STATUSES,
  type EmployerJobAction,
  type EmployerJobStatus,
  type EmployerJobsQuery,
} from "./types";

const STATUS_LABELS: Record<EmployerJobStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending approval",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

const AUTHORIZED_ACTIONS: Record<EmployerJobStatus, EmployerJobAction[]> = {
  DRAFT: ["edit", "submit", "delete"],
  PENDING_APPROVAL: ["withdraw"],
  PUBLISHED: ["close"],
  REJECTED: ["edit"],
  CLOSED: [],
};

export function isEmployerJobStatus(value: unknown): value is EmployerJobStatus {
  return EMPLOYER_JOB_STATUSES.some((status) => status === value);
}

export function getEmployerJobStatusLabel(status: EmployerJobStatus): string {
  return STATUS_LABELS[status];
}

export function getEmployerJobActions(
  status: EmployerJobStatus,
): EmployerJobAction[] {
  return [...AUTHORIZED_ACTIONS[status]];
}

export function normalizeEmployerJobsQuery(
  query: EmployerJobsQuery = {},
): Required<Pick<EmployerJobsQuery, "page" | "pageSize">> &
  Pick<EmployerJobsQuery, "search" | "status"> {
  const page = Number.isInteger(query.page) && (query.page ?? 0) > 0
    ? query.page!
    : 1;
  const pageSize = Number.isInteger(query.pageSize) && (query.pageSize ?? 0) > 0
    ? Math.min(query.pageSize!, 100)
    : 20;
  const search = query.search?.trim();

  return {
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(isEmployerJobStatus(query.status) ? { status: query.status } : {}),
  };
}

export function getEmployerJobsPageTarget(
  currentPage: number,
  totalPages: number,
  direction: "previous" | "next",
): number | null {
  if (!Number.isInteger(currentPage) || !Number.isInteger(totalPages) || totalPages < 1) return null;
  if (direction === "previous") return currentPage > 1 ? currentPage - 1 : null;
  return currentPage < totalPages ? currentPage + 1 : null;
}
