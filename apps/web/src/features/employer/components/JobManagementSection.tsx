import { useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, MapPin, Plus, Search } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import type { JobPosting, JobStatus } from "../types";
import { FeedbackMessage } from "./FeedbackMessage";
import { JobDetailsDialog } from "./JobDetailsDialog";
import { JobEditorForm } from "./JobEditorForm";

type JobManagementSectionProps = {
  jobs: JobPosting[];
  loading?: boolean;
  error?: string;
  onSave: (job: Omit<JobPosting, "id" | "status">, status: JobStatus, id?: string) => void;
  onStatusChange: (job: JobPosting, status: JobStatus) => void;
};

type FilterStatus = "All statuses" | JobStatus | "Expired";

function isExpired(job: JobPosting) {
  return job.status === "Published" && Boolean(job.deadline) && job.deadline < new Date().toISOString().slice(0, 10);
}

function statusLabel(job: JobPosting) {
  return isExpired(job) ? "Expired" : job.status;
}

function statusTone(job: JobPosting): StatusTone {
  switch (statusLabel(job)) {
    case "Published": return "success";
    case "Expired": return "warning";
    case "Draft": return "info";
    case "Closed": return "neutral";
  }
}

function JobManagementSection({
  error,
  jobs,
  loading = false,
  onSave,
  onStatusChange,
}: JobManagementSectionProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("All statuses");
  const [editing, setEditing] = useState<JobPosting | "new" | null>(null);
  const [selected, setSelected] = useState<JobPosting | null>(null);
  const [notice, setNotice] = useState("");

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesTitle = job.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const status = statusLabel(job);
    return matchesTitle && (statusFilter === "All statuses" || statusFilter === status);
  }), [jobs, query, statusFilter]);

  function saveJob(values: Omit<JobPosting, "id" | "status">, status: JobStatus) {
    onSave(values, status, editing !== "new" && editing ? editing.id : undefined);
    setEditing(null);
    setNotice(status === "Draft" ? "Draft saved in this preview." : "Job posting saved in this preview.");
  }

  function editFromDetails(job: JobPosting) {
    setSelected(null);
    setEditing(job);
  }

  return (
    <section aria-labelledby="job-management-heading" className="space-y-5">
      <PageHeader
        actions={!editing ? <Button onClick={() => { setEditing("new"); setNotice(""); }} icon={<Plus size={17} />}>Create job</Button> : undefined}
        description="Create openings, keep listings current, and review their publication status."
        eyebrow="Hiring"
        title="Job management"
      />
      <h2 className="sr-only" id="job-management-heading">Job management</h2>
      {notice ? <FeedbackMessage tone="success">{notice}</FeedbackMessage> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}
      {loading ? <FeedbackMessage tone="loading">Loading job postings...</FeedbackMessage> : null}
      {!loading && !error && editing ? (
        <JobEditorForm job={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onSave={saveJob} />
      ) : null}
      {!loading && !error && !editing ? (
        <>
          <Card as="div" padding="sm" className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search by job title</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search job titles" type="search" value={query} />
            </label>
            <label className="block sm:w-48">
              <span className="sr-only">Filter jobs by status</span>
              <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatusFilter(event.target.value as FilterStatus)} value={statusFilter}>
                {(["All statuses", "Published", "Draft", "Closed", "Expired"] satisfies FilterStatus[]).map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </Card>
          {filteredJobs.length ? (
            <div className="grid gap-3">
              {filteredJobs.map((job) => <JobRow job={job} key={job.id} onDetails={() => setSelected(job)} onStatusChange={onStatusChange} />)}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <BriefcaseBusiness className="mx-auto size-10 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{jobs.length ? "No matching jobs" : "No job postings yet"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{jobs.length ? "Try another title or status filter." : "Create your first job posting to start meeting qualified candidates."}</p>
              {!jobs.length ? <Button className="mt-5" onClick={() => setEditing("new")} icon={<Plus size={16} />}>Create your first job</Button> : null}
            </Card>
          )}
        </>
      ) : null}
      {selected ? <JobDetailsDialog expired={isExpired(selected)} job={selected} onClose={() => setSelected(null)} onEdit={editFromDetails} /> : null}
    </section>
  );
}

function JobRow({ job, onDetails, onStatusChange }: { job: JobPosting; onDetails: () => void; onStatusChange: (job: JobPosting, status: JobStatus) => void }) {
  const closed = job.status === "Closed";
  const canChangeStatus = job.status !== "Draft";

  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-950">{job.title}</h3>
          <StatusBadge tone={statusTone(job)}>{statusLabel(job)}</StatusBadge>
        </div>
        <p className="mt-1 text-sm text-slate-600">{job.department} · {job.employmentType} · {job.salary || "Salary not specified"}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{job.location || "Location not specified"}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />Deadline {formatDate(job.deadline)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button onClick={onDetails} size="sm" variant="secondary">View details</Button>
        {canChangeStatus ? (
          <Button onClick={() => onStatusChange(job, closed ? "Published" : "Closed")} size="sm" variant={closed ? "primary" : "ghost"}>
            {closed ? "Reopen" : "Close job"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export { JobManagementSection };
