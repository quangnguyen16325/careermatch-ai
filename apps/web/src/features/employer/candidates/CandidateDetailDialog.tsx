import { Modal } from "../../../components/ui/Modal";
import { useState } from "react";
import { BriefcaseBusiness, CalendarDays, Check, Download, FileText, GraduationCap, Mail, MapPin, Phone, UserRound, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Avatar } from "./CandidateManagementDashboard";
import type { CandidateApplication, CandidateStatus } from "./types";

type CandidateDetailDialogProps = {
  candidate: CandidateApplication;
  onClose: () => void;
  onStatusChange: (status: CandidateStatus, note: string) => void;
  onSaveNotes: (notes: string) => void;
};

const nextStatus: Partial<Record<CandidateStatus, CandidateStatus>> = {
  New: "Reviewing",
  Reviewing: "Shortlisted",
  Shortlisted: "Interview",
};

function CandidateDetailDialog({ candidate, onClose, onSaveNotes, onStatusChange }: CandidateDetailDialogProps) {
  const [notes, setNotes] = useState(candidate.notes);
  const [notesError, setNotesError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [showResume, setShowResume] = useState(false);

  function moveTo(status: CandidateStatus, note: string) {
    onStatusChange(status, note);
    setNotice(`Application moved to ${status.toLowerCase()}.`);
    setConfirmReject(false);
  }

  function saveNotes() {
    if (!notes.trim()) {
      setNotesError("Add a note before saving.");
      return;
    }
    onSaveNotes(notes.trim());
    setNotesError("");
    setNotice("Private note saved in this preview.");
  }

  const next = nextStatus[candidate.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" onClick={onClose}>
      <Modal onClose={onClose}
        aria-labelledby="candidate-detail-title"
        aria-modal="true"
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-slate-50 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Avatar large name={candidate.name} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-slate-950" id="candidate-detail-title">{candidate.name}</h2>
                <StatusBadge tone={candidate.status === "Rejected" ? "danger" : candidate.status === "Accepted" || candidate.status === "Shortlisted" ? "success" : candidate.status === "Reviewing" ? "warning" : "info"}>{candidate.status}</StatusBadge>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600">{candidate.position}</p>
            </div>
          </div>
          <Button aria-label="Close candidate details" className="-mr-2 -mt-1 shrink-0" onClick={onClose} size="sm" variant="ghost" icon={<X size={18} />} />
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:p-8">
          <div className="space-y-5">
            <Card>
              <SectionTitle icon={<UserRound />} title="About candidate" />
              <p className="mt-4 text-sm leading-6 text-slate-600">{candidate.summary}</p>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                <Info icon={<Mail />} value={candidate.email} href={`mailto:${candidate.email}`} />
                <Info icon={<Phone />} value={candidate.phone} href={`tel:${candidate.phone}`} />
                <Info icon={<MapPin />} value={candidate.location} />
                <Info icon={<CalendarDays />} value={`Applied ${formatDate(candidate.appliedAt)}`} />
                <Info icon={<BriefcaseBusiness />} value={candidate.experienceYears ? `${candidate.experienceYears} years of experience` : "Entry level"} />
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<BriefcaseBusiness />} title="Work experience" />
              <div className="mt-4 space-y-5">
                {candidate.experience.map((item) => (
                  <div className="border-l-2 border-emerald-200 pl-4" key={`${item.company}-${item.role}`}>
                    <h4 className="font-semibold text-slate-900">{item.role}</h4>
                    <p className="mt-0.5 text-sm text-slate-600">{item.company} <span className="text-slate-400">·</span> {item.period}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<GraduationCap />} title="Education" />
              <div className="mt-4 space-y-4">
                {candidate.education.map((item) => (
                  <div key={`${item.school}-${item.degree}`}>
                    <h4 className="font-semibold text-slate-900">{item.degree}</h4>
                    <p className="mt-0.5 text-sm text-slate-600">{item.school} <span className="text-slate-400">·</span> {item.period}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<Check />} title="Skills" />
              <div className="mt-4 flex flex-wrap gap-2">
                {candidate.skills.map((skill) => <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800" key={skill}>{skill}</span>)}
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<FileText />} title="Resume" />
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-rose-600 shadow-sm"><FileText size={20} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{candidate.resumeName}</p>
                    <p className="text-xs text-slate-500">Sample document for this wireframe</p>
                  </div>
                </div>
                <Button className="shrink-0" onClick={() => setShowResume(true)} size="sm" variant="secondary" icon={<Download size={15} />}>Preview resume</Button>
              </div>
            </Card>

            <Card>
              <SectionTitle icon={<FileText />} title="Private notes" />
              <p className="mt-1 text-xs text-slate-500">Only visible to your hiring team.</p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Internal note
                <textarea aria-describedby={notesError ? "candidate-note-error" : undefined} aria-invalid={Boolean(notesError)} className={`mt-1.5 min-h-28 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${notesError ? "border-rose-400" : "border-slate-200"}`} maxLength={1200} onChange={(event) => { setNotes(event.target.value); setNotesError(""); }} placeholder="Add interview feedback, strengths, or follow-up questions..." value={notes} />
              </label>
              {notesError ? <p className="mt-1 text-xs text-rose-700" id="candidate-note-error">{notesError}</p> : null}
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">{notes.length}/1200 characters</span>
                <Button className="w-full sm:w-auto" onClick={saveNotes} size="sm" variant="secondary">Save note</Button>
              </div>
            </Card>
          </div>

          <aside className="space-y-5">
            <Card>
              <h3 className="font-semibold text-slate-950">Application</h3>
              <p className="mt-1 text-sm text-slate-600">{candidate.position}</p>
              <p className="mt-3 text-xs text-slate-500">Applied {formatDate(candidate.appliedAt)}</p>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-semibold text-slate-800">Update status</h4>
                {notice ? <p className="mt-2 text-xs font-medium text-emerald-700" role="status">{notice}</p> : null}
                <div className="mt-3 grid gap-2">
                  {next ? <Button className="w-full" onClick={() => moveTo(next, transitionNote(next))} size="sm">{next === "Reviewing" ? "Start review" : next === "Shortlisted" ? "Shortlist candidate" : "Schedule interview"}</Button> : null}
                  {candidate.status === "Interview" ? (
                    <>
                      <Button className="w-full" onClick={() => moveTo("Accepted", "Candidate accepted") } size="sm">Accept candidate</Button>
                      <Button className="w-full" onClick={() => setConfirmReject(true)} size="sm" variant="danger">Reject candidate</Button>
                    </>
                  ) : null}
                  {!next && candidate.status !== "Interview" ? <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">This application is complete. Its status cannot be changed in this workflow.</p> : null}
                </div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-950">Status history</h3>
              <ol className="mt-4 space-y-4">
                {candidate.history.map((item, index) => (
                  <li className="relative flex gap-3" key={`${item.status}-${item.date}-${index}`}>
                    {index < candidate.history.length - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200" aria-hidden="true" /> : null}
                    <span className="relative mt-1 size-4 shrink-0 rounded-full border-2 border-emerald-500 bg-white" aria-hidden="true" />
                    <div className="min-w-0 pb-1">
                      <p className="text-sm font-semibold text-slate-800">{item.status}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.date)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      </Modal>

      {confirmReject ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
          <Modal onClose={() => setConfirmReject(false)} aria-labelledby="reject-confirm-title" aria-modal="true" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" role="alertdialog">
            <h3 className="text-lg font-semibold text-slate-950" id="reject-confirm-title">Reject this application?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">This will mark {candidate.name}'s application as rejected in this preview.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setConfirmReject(false)} variant="secondary">Keep application</Button>
              <Button onClick={() => moveTo("Rejected", "Application rejected by employer")} variant="danger">Confirm rejection</Button>
            </div>
          </Modal>
        </div>
      ) : null}

      {showResume ? <ResumePreview candidate={candidate} onClose={() => setShowResume(false)} /> : null}
    </div>
  );
}

function ResumePreview({ candidate, onClose }: { candidate: CandidateApplication; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}>
      <Modal onClose={onClose} aria-labelledby="resume-preview-title" aria-modal="true" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-slate-100 p-4 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-950" id="resume-preview-title">Resume preview</h3>
            <p className="truncate text-xs text-slate-500">{candidate.resumeName}</p>
          </div>
          <Button aria-label="Close resume preview" onClick={onClose} size="sm" variant="ghost" icon={<X size={18} />} />
        </div>
        <div className="mt-4 min-h-72 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:min-h-96 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">CareerMatch AI sample resume</p>
          <h4 className="mt-5 text-2xl font-semibold text-slate-950">{candidate.name}</h4>
          <p className="mt-1 text-sm text-slate-500">{candidate.email} · {candidate.location}</p>
          <div className="my-6 h-px bg-slate-200" />
          <p className="text-sm leading-6 text-slate-700">{candidate.summary}</p>
          <p className="mt-6 text-xs leading-5 text-slate-500">This is representative mock content. No candidate document is connected in this frontend preview.</p>
        </div>
      </Modal>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <h3 className="flex items-center gap-2 font-semibold text-slate-950"><span className="text-emerald-700" aria-hidden="true">{icon}</span>{title}</h3>;
}

function Info({ icon, value, href }: { icon: React.ReactNode; value: string; href?: string }) {
  return <p className="flex min-w-0 items-center gap-2 text-slate-600"><span className="shrink-0 text-slate-400" aria-hidden="true">{icon}</span>{href ? <a className="truncate underline decoration-slate-300 underline-offset-2 hover:text-emerald-700" href={href}>{value}</a> : <span className="truncate">{value}</span>}</p>;
}

function transitionNote(status: CandidateStatus) {
  if (status === "Reviewing") return "Recruiter started review";
  if (status === "Shortlisted") return "Candidate shortlisted";
  return "Candidate moved to interview";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export { CandidateDetailDialog };
