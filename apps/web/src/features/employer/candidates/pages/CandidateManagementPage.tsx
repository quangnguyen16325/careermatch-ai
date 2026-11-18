import { useState } from "react";
import { BriefcaseBusiness, Building2, Sparkles } from "lucide-react";
import { WorkspaceLayout } from "../../../../components/layout/WorkspaceLayout";
import { FeedbackMessage } from "../../components/FeedbackMessage";
import { mockCandidates } from "../mockCandidates";
import { CandidateDetailDialog } from "../CandidateDetailDialog";
import { CandidateManagementDashboard } from "../CandidateManagementDashboard";
import type { CandidateStatus } from "../types";

const transitions: Partial<Record<CandidateStatus, CandidateStatus>> = {
  New: "Reviewing",
  Reviewing: "Shortlisted",
  Shortlisted: "Interview",
  Interview: "Accepted",
};

function CandidateManagementPage() {
  const [candidates, setCandidates] = useState(mockCandidates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) ?? null;

  function updateStatus(candidateId: string, status: CandidateStatus, note: string) {
    setCandidates((current) => current.map((candidate) => {
      if (candidate.id !== candidateId) return candidate;
      const canMoveForward = transitions[candidate.status] === status;
      const canFinishInterview = candidate.status === "Interview" && (status === "Accepted" || status === "Rejected");
      if (!canMoveForward && !canFinishInterview) return candidate;
      const today = new Date().toISOString().slice(0, 10);
      return {
        ...candidate,
        status,
        history: [{ status, date: today, note }, ...candidate.history],
      };
    }));
    setNotice(`Application status updated to ${status}.`);
  }

  function saveNotes(candidateId: string, notes: string) {
    setCandidates((current) => current.map((candidate) => candidate.id === candidateId ? { ...candidate, notes } : candidate));
    setNotice("Private note saved in this preview.");
  }

  return (
    <WorkspaceLayout
      className="space-y-6"
      header={(
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Sparkles size={20} /></span>
            <div>
              <p className="font-semibold tracking-tight text-slate-950">CareerMatch AI</p>
              <p className="text-xs text-slate-500">Employer preview</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
            <Building2 size={16} /> Northstar Labs
          </div>
        </div>
      )}
    >
      {notice ? <FeedbackMessage tone="success">{notice}</FeedbackMessage> : null}
      <div className="mb-7 flex items-center gap-2 text-xs font-medium text-slate-500">
        <BriefcaseBusiness size={14} /> Hiring workspace <span aria-hidden="true">/</span> Applications
      </div>
      <CandidateManagementDashboard candidates={candidates} onSelect={(candidate) => { setSelectedId(candidate.id); setNotice(""); }} />
      {selectedCandidate ? (
        <CandidateDetailDialog
          candidate={selectedCandidate}
          key={selectedCandidate.id}
          onClose={() => setSelectedId(null)}
          onSaveNotes={(notes) => saveNotes(selectedCandidate.id, notes)}
          onStatusChange={(status, note) => updateStatus(selectedCandidate.id, status, note)}
        />
      ) : null}
    </WorkspaceLayout>
  );
}

export { CandidateManagementPage };
