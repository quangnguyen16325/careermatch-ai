import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  StatusBadge,
  type StatusTone,
} from "../../../components/ui/StatusBadge";
import type { JobPosting, JobStatus } from "../types";
import type { CreateJobDraftInput, UpdateJobInput } from "../job-editor/types";
import { FeedbackMessage } from "./FeedbackMessage";
import { JobDetailsDialog } from "./JobDetailsDialog";
import { JobEditorForm } from "./JobEditorForm";
import { createRequestVersion } from "../job-editor/requestVersion";

type JobManagementSectionProps = {
  jobs: JobPosting[];
  loading?: boolean;
  error?: string;
  onSubmitDraft?: (
    draft: CreateJobDraftInput | UpdateJobInput,
    job?: JobPosting,
  ) => Promise<string | void>;
  onLoadJob?: (job: JobPosting) => Promise<JobPosting>;
  onStatusChange?: (job: JobPosting, status: JobStatus) => void;
  onRetry?: () => void;
};

type FilterStatus = "All statuses" | JobStatus | "Expired";

function isExpired(job: JobPosting) {
  return (
    job.status === "Published" &&
    Boolean(job.deadline) &&
    job.deadline! < new Date().toISOString().slice(0, 10)
  );
}

function statusLabel(job: JobPosting) {
  return isExpired(job) ? "Expired" : job.status;
}

function statusTone(job: JobPosting): StatusTone {
  switch (statusLabel(job)) {
    case "Published":
      return "success";
    case "Expired":
      return "warning";
    case "Draft":
      return "info";
    case "Closed":
      return "neutral";
    case "Pending approval":
      return "warning";
    case "Rejected":
      return "danger";
  }
}

function JobManagementSection({
  error,
  jobs,
  loading = false,
  onSubmitDraft,
  onLoadJob,
  onStatusChange,
  onRetry,
}: JobManagementSectionProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("All statuses");
  const [editing, setEditing] = useState<JobPosting | "new" | null>(null);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");
  const editRequests = useRef(createRequestVersion());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const requests = editRequests.current;
    return () => {
      mountedRef.current = false;
      requests.invalidate();
    };
  }, []);

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesTitle = job.title
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase());
        const status = statusLabel(job);
        return (
          matchesTitle &&
          (statusFilter === "All statuses" || statusFilter === status)
        );
      }),
    [jobs, query, statusFilter],
  );

  function editFromDetails(job: JobPosting) {
    const requestVersion = editRequests.current.next();
    setSelected(null);
    setSavedNotice("");
    setEditError("");
    if (!onLoadJob) {
      setEditing(job);
      return;
    }
    setEditing(job);
    setEditLoading(true);
    void onLoadJob(job)
      .then((loadedJob) => {
        if (editRequests.current.isCurrent(requestVersion))
          setEditing(loadedJob);
      })
      .catch((error: unknown) => {
        if (!editRequests.current.isCurrent(requestVersion)) return;
        setEditError(
          error instanceof Error ? error.message : "Could not load this job.",
        );
      })
      .finally(() => {
        if (editRequests.current.isCurrent(requestVersion))
          setEditLoading(false);
      });
  }

  function cancelEditing() {
    editRequests.current.invalidate();
    setEditing(null);
    setEditLoading(false);
    setEditError("");
  }

  return (
    <section aria-labelledby="job-management-heading" className="space-y-5">
      <PageHeader
        actions={
          !editing ? (
            <Button
              onClick={() => {
                editRequests.current.invalidate();
                setSavedNotice("");
                setEditing("new");
              }}
              icon={<Plus size={17} />}
            >
              Create job
            </Button>
          ) : undefined
        }
        description="Create openings, keep listings current, and review their publication status."
        eyebrow="Hiring"
        title="Job management"
      />
      <h2 className="sr-only" id="job-management-heading">
        Job management
      </h2>
      {error ? (
        <div className="space-y-2">
          <FeedbackMessage tone="error">{error}</FeedbackMessage>
          {onRetry ? (
            <Button onClick={onRetry} variant="secondary">
              Retry loading jobs
            </Button>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <FeedbackMessage tone="loading">
          Loading job postings...
        </FeedbackMessage>
      ) : null}
      {savedNotice ? (
        <FeedbackMessage tone="success">{savedNotice}</FeedbackMessage>
      ) : null}
      {!loading && !error && editing ? (
        <>
          {editLoading ? (
            <div className="space-y-3">
              <FeedbackMessage tone="loading">
                Loading job draft...
              </FeedbackMessage>
              <Button onClick={cancelEditing} variant="secondary">
                Cancel loading
              </Button>
            </div>
          ) : null}
          {editError ? (
            <div className="space-y-2">
              <FeedbackMessage tone="error">{editError}</FeedbackMessage>
              <Button
                className="ml-3"
                onClick={() => editing !== "new" && editFromDetails(editing)}
                size="sm"
                variant="secondary"
              >
                Retry
              </Button>
            </div>
          ) : null}
          {!editLoading && !editError ? (
            <JobEditorForm
              categories={
                editing !== "new" && editing.categoryId && editing.department
                  ? [{ id: editing.categoryId, name: editing.department }]
                  : []
              }
              initialSkills={
                editing === "new" ? [] : (editing.requiredSkills ?? [])
              }
              job={editing === "new" ? undefined : editing}
              onCancel={cancelEditing}
              onSubmitDraft={async (draft) => {
                if (!onSubmitDraft)
                  throw new Error("Job saving is unavailable.");
                const notice = await onSubmitDraft(
                  draft,
                  editing === "new" ? undefined : editing,
                );
                if (mountedRef.current) {
                  setSavedNotice(notice || "Job draft saved successfully.");
                  setEditing(null);
                }
              }}
            />
          ) : null}
        </>
      ) : null}
      {!loading && !error && !editing ? (
        <>
          <Card
            as="div"
            padding="sm"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search by job title</span>
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search job titles"
                type="search"
                value={query}
              />
            </label>
            <label className="block sm:w-48">
              <span className="sr-only">Filter jobs by status</span>
              <select
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                onChange={(event) =>
                  setStatusFilter(event.target.value as FilterStatus)
                }
                value={statusFilter}
              >
                {(
                  [
                    "All statuses",
                    "Published",
                    "Draft",
                    "Pending approval",
                    "Rejected",
                    "Closed",
                    "Expired",
                  ] satisfies FilterStatus[]
                ).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </Card>
          {filteredJobs.length ? (
            <div className="grid gap-3">
              {filteredJobs.map((job) => (
                <JobRow
                  job={job}
                  key={job.id}
                  onDetails={() => setSelected(job)}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <BriefcaseBusiness
                className="mx-auto size-10 text-slate-400"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {jobs.length ? "No matching jobs" : "No job postings yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {jobs.length
                  ? "Try another title or status filter."
                  : "Create your first job posting to start meeting qualified candidates."}
              </p>
              {!jobs.length ? (
                <Button
                  className="mt-5"
                  onClick={() => {
                    editRequests.current.invalidate();
                    setSavedNotice("");
                    setEditing("new");
                  }}
                  icon={<Plus size={16} />}
                >
                  Create your first job
                </Button>
              ) : null}
            </Card>
          )}
        </>
      ) : null}
      {selected ? (
        <JobDetailsDialog
          expired={isExpired(selected)}
          job={selected}
          onClose={() => setSelected(null)}
          onEdit={editFromDetails}
        />
      ) : null}
    </section>
  );
}

function JobRow({
  job,
  onDetails,
  onStatusChange,
}: {
  job: JobPosting;
  onDetails: () => void;
  onStatusChange?: (job: JobPosting, status: JobStatus) => void;
}) {
  const closed = job.status === "Closed";
  const canChangeStatus = job.status === "Published" || job.status === "Closed";

  return (
    <Card
      as="article"
      padding="md"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-950">{job.title}</h3>
          <StatusBadge tone={statusTone(job)}>{statusLabel(job)}</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {job.department} · {job.employmentType} ·{" "}
          {job.salary || "Salary not specified"}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} />
            {job.location || "Location not specified"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} />
            Deadline {formatDate(job.deadline)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button onClick={onDetails} size="sm" variant="secondary">
          View details
        </Button>
        {onStatusChange && canChangeStatus ? (
          <Button
            onClick={() => onStatusChange(job, closed ? "Published" : "Closed")}
            size="sm"
            variant={closed ? "primary" : "ghost"}
          >
            {closed ? "Reopen" : "Close job"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export { JobManagementSection };
