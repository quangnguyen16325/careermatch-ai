import { useMemo, useState } from "react";
import { ArrowDownUp, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search, Users, UserCheck, UserRoundX, UserRoundPlus } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { FeedbackMessage } from "../components/FeedbackMessage";
import type { CandidateApplication, CandidateStatus } from "./types";

const pageSize = 6;
const statusOptions: (CandidateStatus | "All statuses")[] = ["All statuses", "New", "Reviewing", "Shortlisted", "Interview", "Accepted", "Rejected"];

type CandidateManagementDashboardProps = {
  candidates: CandidateApplication[];
  loading?: boolean;
  error?: string;
  onSelect: (candidate: CandidateApplication) => void;
};

function CandidateManagementDashboard({ candidates, error, loading = false, onSelect }: CandidateManagementDashboardProps) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("All positions");
  const [status, setStatus] = useState<CandidateStatus | "All statuses">("All statuses");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const positions = useMemo(() => [...new Set(candidates.map((candidate) => candidate.position))].sort(), [candidates]);
  const filteredCandidates = useMemo(() => candidates
    .filter((candidate) => candidate.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .filter((candidate) => position === "All positions" || candidate.position === position)
    .filter((candidate) => status === "All statuses" || candidate.status === status)
    .sort((a, b) => sortOrder === "newest" ? b.appliedAt.localeCompare(a.appliedAt) : a.appliedAt.localeCompare(b.appliedAt)),
  [candidates, position, query, sortOrder, status]);

  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCandidates = filteredCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateFilter(update: () => void) {
    update();
    setPage(1);
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader
        description="Review applications, keep hiring decisions moving, and share clear feedback with your team."
        eyebrow="Employer workspace / Hiring"
        title="Candidates"
      />
      <section aria-label="Hiring overview" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard icon={<Users />} label="Total applicants" value={candidates.length} tone="slate" />
        <MetricCard icon={<UserRoundPlus />} label="New" value={countStatus(candidates, "New")} tone="sky" />
        <MetricCard icon={<Clock3 />} label="Reviewing" value={countStatus(candidates, "Reviewing")} tone="amber" />
        <MetricCard icon={<UserCheck />} label="Accepted" value={countStatus(candidates, "Accepted")} tone="emerald" />
        <MetricCard icon={<UserRoundX />} label="Rejected" value={countStatus(candidates, "Rejected")} tone="rose" />
      </section>

      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}
      {loading ? <FeedbackMessage tone="loading">Loading candidate applications...</FeedbackMessage> : null}

      {!loading && !error ? (
        <section aria-labelledby="applicant-list-title" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950" id="applicant-list-title">Applicant list</h2>
              <p className="mt-1 text-sm text-slate-600">{filteredCandidates.length} {filteredCandidates.length === 1 ? "candidate" : "candidates"} match your filters.</p>
            </div>
          </div>
          <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_minmax(12rem,.8fr)_minmax(10rem,.7fr)_auto]">
            <label className="relative block min-w-0">
              <span className="sr-only">Search candidates by name</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => updateFilter(() => setQuery(event.target.value))} placeholder="Search candidate name" type="search" value={query} />
            </label>
            <label className="block">
              <span className="sr-only">Filter by job position</span>
              <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => updateFilter(() => setPosition(event.target.value))} value={position}>
                <option>All positions</option>
                {positions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Filter by application status</span>
              <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => updateFilter(() => setStatus(event.target.value as CandidateStatus | "All statuses"))} value={status}>
                {statusOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <Button onClick={() => { setSortOrder((current) => current === "newest" ? "oldest" : "newest"); setPage(1); }} variant="secondary" icon={<ArrowDownUp size={16} />}>
              <span className="sm:hidden xl:inline">{sortOrder === "newest" ? "Newest first" : "Oldest first"}</span>
              <span className="hidden sm:inline xl:hidden">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
            </Button>
          </Card>

          {visibleCandidates.length ? (
            <div className="grid gap-3">
              {visibleCandidates.map((candidate) => <CandidateRow candidate={candidate} key={candidate.id} onSelect={() => onSelect(candidate)} />)}
            </div>
          ) : (
            <Card className="py-12 text-center">
              <Users className="mx-auto size-10 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{candidates.length ? "No applicants match these filters" : "No applicants yet"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{candidates.length ? "Try a different name, position, or status." : "New applications will appear here when candidates apply to your open roles."}</p>
            </Card>
          )}

          {filteredCandidates.length > pageSize ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length}</p>
              <div className="flex items-center gap-2">
                <Button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} size="sm" variant="secondary" icon={<ChevronLeft size={16} />}>Previous</Button>
                <span className="px-2 text-sm tabular-nums text-slate-600">{currentPage} / {pageCount}</span>
                <Button aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} size="sm" variant="secondary" icon={<ChevronRight size={16} />}>Next</Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "slate" | "sky" | "amber" | "emerald" | "rose" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <Card padding="sm" className="min-w-0">
      <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`} aria-hidden="true">{icon}</span>
      <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
    </Card>
  );
}

function CandidateRow({ candidate, onSelect }: { candidate: CandidateApplication; onSelect: () => void }) {
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <Avatar name={candidate.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{candidate.name}</h3>
            <StatusBadge tone={statusTone(candidate.status)}>{candidate.status}</StatusBadge>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">{candidate.position}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{candidate.email}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{candidate.experienceYears ? `${candidate.experienceYears} years experience` : "Entry level"}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays size={13} />Applied {formatDate(candidate.appliedAt)}</span>
          </div>
        </div>
      </div>
      <Button className="w-full sm:w-auto" onClick={onSelect} size="sm" variant="secondary">View candidate</Button>
    </Card>
  );
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-emerald-100 text-emerald-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-amber-100 text-amber-800"];
  const index = [...name].reduce((value, char) => value + char.charCodeAt(0), 0) % colors.length;
  return <span aria-label={`${name} avatar`} className={`grid shrink-0 place-items-center rounded-2xl font-semibold ${large ? "size-16 text-lg" : "size-12 text-sm"} ${colors[index]}`}>{initials}</span>;
}

function countStatus(candidates: CandidateApplication[], status: CandidateStatus) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

function statusTone(status: CandidateStatus): StatusTone {
  switch (status) {
    case "New": return "info";
    case "Reviewing": return "warning";
    case "Shortlisted": return "success";
    case "Interview": return "info";
    case "Accepted": return "success";
    case "Rejected": return "danger";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export { Avatar, CandidateManagementDashboard };
