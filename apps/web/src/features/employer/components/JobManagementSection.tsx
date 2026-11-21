import { useState } from "react";
import { BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { FeedbackMessage } from "./FeedbackMessage";
import { getEmployerJobStatusLabel } from "../job-management/jobListUtils";
import type { EmployerJobListItem, EmployerJobsPage } from "../job-management/types";

type JobManagementSectionProps = {
  page: EmployerJobsPage | null;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
};

function statusTone(status: EmployerJobListItem["status"]): StatusTone {
  switch (status) {
    case "PUBLISHED": return "success";
    case "PENDING_APPROVAL": return "warning";
    case "DRAFT": return "info";
    case "REJECTED": return "danger";
    case "CLOSED": return "neutral";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Not published";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function JobManagementSection({ error, loading = false, onRetry, page }: JobManagementSectionProps) {
  const [selected, setSelected] = useState<EmployerJobListItem | null>(null);
  const jobs = page?.data ?? [];

  return (
    <section aria-labelledby="job-management-heading" className="space-y-5">
      <PageHeader
        description="Review your job postings and their current approval status."
        eyebrow="Hiring"
        title="Job management"
      />
      <h2 className="sr-only" id="job-management-heading">Job management</h2>
      {loading ? <FeedbackMessage tone="loading">Loading job postings...</FeedbackMessage> : null}
      {error ? (
        <div className="space-y-3" role="alert">
          <FeedbackMessage tone="error">{error}</FeedbackMessage>
          <Button onClick={onRetry} variant="secondary">Retry loading jobs</Button>
        </div>
      ) : null}
      {!loading && !error && jobs.length > 0 ? (
        <div className="grid gap-3" aria-label="Employer job postings">
          {jobs.map((job) => (
            <Card as="article" padding="md" className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" key={job.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words font-semibold text-slate-950">{job.title}</h3>
                  <StatusBadge tone={statusTone(job.status)}>{getEmployerJobStatusLabel(job.status)}</StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{job.location || "Location not specified"}</span>
                  {job.workMode ? <span>{job.workMode}</span> : null}
                  {job.category ? <span>{job.category.name}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" />Updated {formatDate(job.updatedAt)}</span>
                  <span>{job._count.applications} applications</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button aria-label={`View details for ${job.title}`} onClick={() => setSelected(job)} size="sm" variant="secondary">View details</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {!loading && !error && page && jobs.length === 0 ? (
        <Card className="py-12 text-center">
          <BriefcaseBusiness className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">No job postings yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Your job postings will appear here after they have been created.</p>
        </Card>
      ) : null}
      {selected ? <JobDetailDialog job={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function JobDetailDialog({ job, onClose }: { job: EmployerJobListItem; onClose: () => void }) {
  return (
    <Modal aria-labelledby="employer-job-detail-title" aria-modal="true" className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8" onClose={onClose} role="dialog">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <StatusBadge tone={statusTone(job.status)}>{getEmployerJobStatusLabel(job.status)}</StatusBadge>
          <h2 className="mt-3 break-words text-2xl font-semibold text-slate-950" id="employer-job-detail-title">{job.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{job.location || "Location not specified"}{job.workMode ? ` · ${job.workMode}` : ""}</p>
        </div>
        <Button aria-label="Close job details" onClick={onClose} size="sm" variant="ghost">Close</Button>
      </div>
      <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-700">{job.description}</p>
      {job.category ? <p className="mt-4 text-sm text-slate-600">Career category: {job.category.name}</p> : null}
      {job.skills.length ? <div className="mt-4"><h3 className="text-sm font-semibold">Required skills</h3><ul className="mt-2 flex flex-wrap gap-2">{job.skills.map((entry) => <li className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700" key={entry.skillId}>{entry.skill.name}</li>)}</ul></div> : null}
      <p className="mt-4 text-sm text-slate-600">Applications: {job._count.applications}</p>
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4"><Button onClick={onClose} variant="secondary">Close details</Button></div>
    </Modal>
  );
}

export { JobManagementSection };
