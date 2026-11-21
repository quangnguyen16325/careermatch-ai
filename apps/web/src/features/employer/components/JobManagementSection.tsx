import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, CalendarDays, MapPin, Search } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Modal } from "../../../components/ui/Modal";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { FeedbackMessage } from "./FeedbackMessage";
import { getEmployerJobActions, getEmployerJobStatusLabel, getEmployerJobsPageTarget } from "../job-management/jobListUtils";
import { EMPLOYER_JOB_STATUSES, type EmployerJobListItem, type EmployerJobsPage, type EmployerJobsQuery } from "../job-management/types";

type JobManagementSectionProps = {
  page: EmployerJobsPage | null;
  loading?: boolean;
  error?: string;
  onRetry: () => void;
  onCloseJob: (jobId: string) => Promise<boolean>;
  query: EmployerJobsQuery;
  onQueryChange: (query: Partial<EmployerJobsQuery>) => void;
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

function JobManagementSection({ error, loading = false, onCloseJob, onQueryChange, onRetry, page, query }: JobManagementSectionProps) {
  const [selected, setSelected] = useState<EmployerJobListItem | null>(null);
  const [closeTarget, setCloseTarget] = useState<EmployerJobListItem | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [notice, setNotice] = useState("");
  const closeInProgress = useRef(false);
  const [searchInput, setSearchInput] = useState(query.search ?? "");
  const jobs = page?.data ?? [];
  const meta = page?.meta;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput.trim() !== (query.search ?? "")) onQueryChange({ search: searchInput.trim() || undefined, page: 1 });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [onQueryChange, query.search, searchInput]);

  const previousPage = meta ? getEmployerJobsPageTarget(meta.page, meta.totalPages, "previous") : null;
  const nextPage = meta ? getEmployerJobsPageTarget(meta.page, meta.totalPages, "next") : null;

  async function confirmClose() {
    if (!closeTarget || closeInProgress.current || !getEmployerJobActions(closeTarget.status).includes("close")) return;
    closeInProgress.current = true;
    setClosing(true);
    setCloseError("");
    setNotice("");
    try {
      const refreshed = await onCloseJob(closeTarget.id);
      setNotice(refreshed
        ? `${closeTarget.title} was closed successfully.`
        : `${closeTarget.title} was closed successfully. The list could not be refreshed; the displayed status was updated from the server response.`);
      setCloseTarget(null);
    } catch (error) {
      setCloseError(error instanceof Error ? error.message : "Could not close this job. Try again.");
    } finally {
      closeInProgress.current = false;
      setClosing(false);
    }
  }

  return (
    <section aria-labelledby="job-management-heading" className="space-y-5">
      <PageHeader
        description="Review your job postings and their current approval status."
        eyebrow="Hiring"
        title="Job management"
      />
      <h2 className="sr-only" id="job-management-heading">Job management</h2>
      {notice ? <FeedbackMessage tone="success">{notice}</FeedbackMessage> : null}
      <Card as="div" padding="sm" className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search job titles</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setSearchInput(event.target.value)} placeholder="Search job titles" type="search" value={searchInput} />
        </label>
        <label className="block sm:w-56">
          <span className="sr-only">Filter jobs by status</span>
          <select aria-label="Filter jobs by status" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => onQueryChange({ status: event.target.value ? event.target.value as EmployerJobsQuery["status"] : undefined, page: 1 })} value={query.status ?? ""}>
            <option value="">All statuses</option>
            {EMPLOYER_JOB_STATUSES.map((status) => <option key={status} value={status}>{getEmployerJobStatusLabel(status)}</option>)}
          </select>
        </label>
      </Card>
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
                {getEmployerJobActions(job.status).includes("close") ? <Button aria-label={`Close ${job.title}`} onClick={() => { setCloseTarget(job); setCloseError(""); }} size="sm" variant="ghost">Close job</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      {!loading && !error && page && jobs.length === 0 ? (
        <Card className="py-12 text-center">
          <BriefcaseBusiness className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{query.search || query.status ? "No matching jobs" : "No job postings yet"}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{query.search || query.status ? "Try another search or status filter." : "Your job postings will appear here after they have been created."}</p>
        </Card>
      ) : null}
      {!loading && !error && meta ? (
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span aria-live="polite">{meta.total} job{meta.total === 1 ? "" : "s"} · Page {meta.page} of {Math.max(meta.totalPages, 1)}</span>
          <div className="flex gap-2">
            <Button disabled={previousPage === null} onClick={() => previousPage && onQueryChange({ page: previousPage })} size="sm" variant="secondary">Previous</Button>
            <Button disabled={nextPage === null} onClick={() => nextPage && onQueryChange({ page: nextPage })} size="sm" variant="secondary">Next</Button>
          </div>
        </div>
      ) : null}
      {selected ? <JobDetailDialog job={selected} onClose={() => setSelected(null)} /> : null}
      {closeTarget ? (
        <Modal aria-labelledby="close-job-title" aria-modal="true" className="w-[calc(100%-1.5rem)] max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClose={() => { if (!closing) setCloseTarget(null); }} role="dialog">
          <h2 className="text-xl font-semibold text-slate-950" id="close-job-title">Close this job posting?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-900">{closeTarget.title}</span> will be closed. Applicants will no longer be able to apply. This action is confirmed by the job service.</p>
          {closeError ? <div className="mt-4" role="alert"><FeedbackMessage tone="error">{closeError}</FeedbackMessage></div> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button disabled={closing} onClick={() => setCloseTarget(null)} variant="secondary">Cancel</Button>
            <Button disabled={closing} onClick={() => void confirmClose()}>{closing ? "Closing…" : "Confirm close"}</Button>
          </div>
        </Modal>
      ) : null}
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
