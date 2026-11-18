import { Modal } from "../../../components/ui/Modal";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ClipboardCheck, MapPin, Search } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AdminActionDialog } from "../components/AdminActionDialog";
import type { ModerationJob, ModerationStatus } from "../types";

type JobModerationPageProps = {
  jobs: ModerationJob[];
  onStatusChange: (job: ModerationJob, status: ModerationStatus, reason?: string) => void;
};

type ActionKind = "approve" | "reject" | "flag";

function JobModerationPage({ jobs, onStatusChange }: JobModerationPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ModerationStatus | "All statuses">("All statuses");
  const [selected, setSelected] = useState<ModerationJob | null>(null);
  const [action, setAction] = useState<{ job: ModerationJob; kind: ActionKind } | null>(null);

  const filtered = useMemo(() => jobs.filter((job) =>
    `${job.title} ${job.company}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === "All statuses" || job.status === status),
  ), [jobs, query, status]);

  function changeStatus(job: ModerationJob, kind: ActionKind, reason = "") {
    const nextStatus: ModerationStatus = kind === "approve" ? "Approved" : kind === "reject" ? "Rejected" : "Flagged";
    onStatusChange(job, nextStatus, reason);
    setAction(null);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Check job content, confirm it meets platform standards, and handle flagged listings consistently." eyebrow="Trust and safety" title="Job moderation" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Pending review" value={jobs.filter((job) => job.status === "Pending").length} tone="warning" />
        <MiniStat label="Flagged" value={jobs.filter((job) => job.status === "Flagged").length} tone="danger" />
        <MiniStat label="Approved" value={jobs.filter((job) => job.status === "Approved").length} tone="success" />
        <MiniStat label="Rejected" value={jobs.filter((job) => job.status === "Rejected").length} tone="neutral" />
      </div>
      <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block min-w-0"><span className="sr-only">Search job or company</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search job or company" type="search" value={query} /></label>
        <label className="block"><span className="sr-only">Filter moderation status</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatus(event.target.value as ModerationStatus | "All statuses")} value={status}>{(["All statuses", "Pending", "Approved", "Rejected", "Flagged"] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
      </Card>
      <div><h2 className="font-semibold text-slate-950">Job listings</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} of {jobs.length} listings</p></div>
      {filtered.length ? <div className="grid gap-3">{filtered.map((job) => <ModerationJobRow job={job} key={job.id} onReview={() => setSelected(job)} />)}</div> : <Card className="py-12 text-center"><ClipboardCheck className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No job listings found</h3><p className="mt-2 text-sm text-slate-600">Try changing the search or moderation status filter.</p></Card>}

      {selected ? <JobReviewDialog job={selected} onClose={() => setSelected(null)} onAction={(kind) => { setSelected(null); setAction({ job: selected, kind }); }} /> : null}
      {action ? (
        <AdminActionDialog
          confirmLabel={action.kind === "approve" ? "Approve job" : action.kind === "reject" ? "Reject job" : "Flag listing"}
          description={action.kind === "approve" ? `Approve ${action.job.title} at ${action.job.company} for publication.` : action.kind === "reject" ? `Reject ${action.job.title}. Provide a clear reason for the employer.` : `Flag ${action.job.title} for follow-up. Record the concern for the moderation history.`}
          onCancel={() => setAction(null)}
          onConfirm={(reason) => changeStatus(action.job, action.kind, reason)}
          reasonLabel={action.kind === "reject" ? "Rejection reason" : "Flag reason"}
          reasonPlaceholder={action.kind === "reject" ? "Explain which listing requirement was not met..." : "Describe the content that needs further review..."}
          requireReason={action.kind !== "approve"}
          title={action.kind === "approve" ? "Approve this listing?" : action.kind === "reject" ? "Reject this listing?" : "Flag this listing?"}
          tone={action.kind === "approve" ? "primary" : "danger"}
        />
      ) : null}
    </div>
  );
}

function ModerationJobRow({ job, onReview }: { job: ModerationJob; onReview: () => void }) {
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{job.title}</h3><JobStatusBadge status={job.status} /></div>
        <p className="mt-1 text-sm text-slate-600">{job.company} <span aria-hidden="true">·</span> {job.employmentType} <span aria-hidden="true">·</span> {job.salary}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><MapPin size={13} />{job.location}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays size={13} />Submitted {formatDate(job.submittedAt)}</span>
          <span>Posted by {job.employer}</span>
        </div>
        {job.moderationReason ? <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{job.moderationReason}</p> : null}
      </div>
      <Button className="w-full shrink-0 sm:w-auto" onClick={onReview} size="sm" variant="secondary">Review listing</Button>
    </Card>
  );
}

function JobReviewDialog({ job, onAction, onClose }: { job: ModerationJob; onAction: (kind: ActionKind) => void; onClose: () => void }) {
  const canModerate = job.status === "Pending" || job.status === "Flagged";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onClick={onClose}>
      <Modal onClose={onClose} aria-labelledby="job-review-title" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex flex-wrap items-center gap-2"><JobStatusBadge status={job.status} /><span className="text-xs text-slate-500">Submitted {formatDate(job.submittedAt)}</span></div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950" id="job-review-title">{job.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{job.company} <span aria-hidden="true">·</span> Posted by {job.employer}</p>
        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <Detail label="Location" value={job.location} /><Detail label="Employment type" value={job.employmentType} /><Detail label="Salary" value={job.salary} /><Detail label="Application deadline" value={formatDate(job.deadline)} />
        </div>
        <ContentBlock title="Job description" text={job.description} />
        <ContentBlock title="Requirements" text={job.requirements} />
        {job.moderationReason ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Previous moderation note: {job.moderationReason}</p> : null}
        <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Close</Button>
          {canModerate ? <>
            <Button onClick={() => onAction("flag")} variant="ghost">Flag listing</Button>
            <Button onClick={() => onAction("reject")} variant="danger">Reject</Button>
            <Button onClick={() => onAction("approve")}>Approve</Button>
          </> : null}
        </div>
      </Modal>
    </div>
  );
}

function ContentBlock({ title, text }: { title: string; text: string }) { return <div className="mt-5"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{text}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-800">{value}</p></div>; }
function MiniStat({ label, value, tone }: { label: string; value: number; tone: "warning" | "danger" | "success" | "neutral" }) { return <Card padding="sm"><StatusBadge tone={tone}>{label}</StatusBadge><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p></Card>; }
function JobStatusBadge({ status }: { status: ModerationStatus }) { const tone: StatusTone = status === "Approved" ? "success" : status === "Pending" ? "warning" : status === "Rejected" ? "neutral" : "danger"; return <StatusBadge tone={tone}>{status}</StatusBadge>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export { JobModerationPage };
