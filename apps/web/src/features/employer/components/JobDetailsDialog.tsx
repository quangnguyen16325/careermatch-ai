import { Modal } from "../../../components/ui/Modal";
import { CalendarDays, MapPin, Pencil, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { JobPosting } from "../types";

type JobDetailsDialogProps = {
  job: JobPosting;
  expired: boolean;
  onClose: () => void;
  onEdit: (job: JobPosting) => void;
};

function JobDetailsDialog({ job, expired, onClose, onEdit }: JobDetailsDialogProps) {
  const status = expired ? "Expired" : job.status;
  const tone = status === "Published" ? "success" : status === "Expired" ? "warning" : status === "Closed" ? "neutral" : "info";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" onClick={onClose}>
      <Modal onClose={onClose}
        aria-labelledby="job-details-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <StatusBadge tone={tone}>{status}</StatusBadge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950" id="job-details-title">{job.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{job.department} · {job.employmentType}</p>
            {job.workMode ? (
              <p className="mt-1 text-sm text-slate-600">
                Work mode: {{ ONSITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" }[job.workMode]}
              </p>
            ) : null}
          </div>
          <Button aria-label="Close job details" className="-mr-2 -mt-2" onClick={onClose} size="sm" variant="ghost" icon={<X size={18} />} />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          {job.location ? <span className="inline-flex items-center gap-2"><MapPin size={16} />{job.location}</span> : null}
          {job.deadline ? <span className="inline-flex items-center gap-2"><CalendarDays size={16} />Apply by {formatDate(job.deadline)}</span> : null}
        </div>
        {job.salary ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Salary: {job.salary}</p> : null}
        <DetailBlock title="About the role" text={job.description} />
        {job.requirements ? <DetailBlock title="Requirements" text={job.requirements} /> : null}
        {job.benefits ? <DetailBlock title="Benefits" text={job.benefits} /> : null}
        {job.requiredSkills?.length ? (
          <DetailBlock
            title="Required skills"
            text={job.requiredSkills.map((skill) => `${skill.name}${skill.required ? " (required)" : " (optional)"}`).join(", ")}
          />
        ) : null}
        <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Close</Button>
          {job.status === "Draft" || job.status === "Rejected" ? (
            <Button onClick={() => onEdit(job)} icon={<Pencil size={16} />}>Edit job</Button>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function DetailBlock({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{text || "Not provided."}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export { JobDetailsDialog };
