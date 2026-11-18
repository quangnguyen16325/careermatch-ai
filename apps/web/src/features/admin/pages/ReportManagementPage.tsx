import { Modal } from "../../../components/ui/Modal";
import { useMemo, useState } from "react";
import { CalendarDays, Flag, Search, ShieldAlert } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AdminActionDialog } from "../components/AdminActionDialog";
import type { AdminReport, ReportStatus } from "../types";

type ReportManagementPageProps = {
  reports: AdminReport[];
  onStatusChange: (report: AdminReport, status: ReportStatus, note: string) => void;
};

function ReportManagementPage({ onStatusChange, reports }: ReportManagementPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReportStatus | "All statuses">("All statuses");
  const [selected, setSelected] = useState<AdminReport | null>(null);

  const filtered = useMemo(() => reports.filter((report) =>
    `${report.reporter} ${report.targetLabel} ${report.reason}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === "All statuses" || report.status === status),
  ), [query, reports, status]);

  function update(report: AdminReport, next: ReportStatus, note: string) {
    onStatusChange(report, next, note);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Review reports from the community and record the action taken on each case." eyebrow="Trust and safety" title="Reports" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Open" value={reports.filter((report) => report.status === "Open").length} />
        <MiniStat label="Reviewing" value={reports.filter((report) => report.status === "Reviewing").length} />
        <MiniStat label="Resolved" value={reports.filter((report) => report.status === "Resolved").length} />
        <MiniStat label="Dismissed" value={reports.filter((report) => report.status === "Dismissed").length} />
      </div>
      <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block min-w-0"><span className="sr-only">Search reports</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search reporter or reported item" type="search" value={query} /></label>
        <label className="block"><span className="sr-only">Filter report status</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatus(event.target.value as ReportStatus | "All statuses")} value={status}>{(["All statuses", "Open", "Reviewing", "Resolved", "Dismissed"] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
      </Card>
      <div><h2 className="font-semibold text-slate-950">Community reports</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} of {reports.length} reports</p></div>
      {filtered.length ? <div className="grid gap-3">{filtered.map((report) => <ReportRow key={report.id} onView={() => setSelected(report)} report={report} />)}</div> : <Card className="py-12 text-center"><Flag className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No reports found</h3><p className="mt-2 text-sm text-slate-600">Try another search or report status.</p></Card>}

      {selected ? <ReportDetailsDialog onClose={() => setSelected(null)} onUpdate={(next, note) => update(selected, next, note)} report={selected} /> : null}
    </div>
  );
}

function ReportRow({ report, onView }: { report: AdminReport; onView: () => void }) {
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><ShieldAlert size={18} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{report.targetLabel}</h3><ReportStatusBadge status={report.status} /></div>
          <p className="mt-1 text-sm text-slate-600">{report.reason} <span aria-hidden="true">·</span> {report.targetType}</p>
          <p className="mt-1 text-xs text-slate-500">Reported by {report.reporter} <span aria-hidden="true">·</span> {report.reporterEmail}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{report.details}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} />{formatDate(report.submittedAt)}</p>
        </div>
      </div>
      <Button className="w-full shrink-0 sm:w-auto" onClick={onView} size="sm" variant="secondary">View report</Button>
    </Card>
  );
}

function ReportDetailsDialog({ report, onClose, onUpdate }: { report: AdminReport; onClose: () => void; onUpdate: (status: ReportStatus, note: string) => void }) {
  const [action, setAction] = useState<ReportStatus | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onClick={onClose}>
      <Modal onClose={onClose} aria-labelledby="report-detail-title" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={report.status} /><span className="text-xs text-slate-500">Submitted {formatDate(report.submittedAt)}</span></div>
        <h2 className="mt-3 text-xl font-semibold text-slate-950" id="report-detail-title">{report.targetLabel}</h2>
        <p className="mt-1 text-sm text-slate-600">{report.targetType} report · {report.reason}</p>
        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><Detail label="Reported by" value={report.reporter} /><Detail label="Contact" value={report.reporterEmail} /><Detail label="Submitted" value={formatDate(report.submittedAt)} /><Detail label="Current status" value={report.status} /></div>
        <div className="mt-5"><h3 className="text-sm font-semibold text-slate-900">Report details</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{report.details}</p></div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">Handling history</h3>
          <ol className="mt-3 space-y-3">{report.history.map((entry, index) => <li className="flex gap-3" key={`${entry.status}-${entry.date}-${index}`}><span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" /><div><p className="text-sm font-medium text-slate-800">{entry.status} <span className="font-normal text-slate-400">· {formatDate(entry.date)}</span></p><p className="mt-0.5 text-xs text-slate-600">{entry.note}</p></div></li>)}</ol>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Close</Button>
          {report.status === "Open" ? <Button onClick={() => setAction("Reviewing")} variant="primary">Mark reviewing</Button> : null}
          {report.status === "Reviewing" ? <><Button onClick={() => setAction("Dismissed")} variant="ghost">Dismiss report</Button><Button onClick={() => setAction("Resolved")} variant="primary">Resolve report</Button></> : null}
        </div>
      </Modal>
      {action ? (
        <AdminActionDialog
          confirmLabel={action === "Reviewing" ? "Start review" : action === "Resolved" ? "Resolve report" : "Dismiss report"}
          description={action === "Reviewing" ? "Record that a moderator has started reviewing this report." : `Close this case as ${action.toLowerCase()} and add a summary to its history.`}
          onCancel={() => setAction(null)}
          onConfirm={(note) => { onUpdate(action, note || "Moderator started review"); setAction(null); }}
          reasonLabel={action === "Reviewing" ? "Review note" : "Resolution note"}
          reasonPlaceholder="Summarize the decision or next step..."
          requireReason={action !== "Reviewing"}
          title={action === "Reviewing" ? "Start report review?" : action === "Resolved" ? "Resolve report?" : "Dismiss report?"}
          tone={action === "Dismissed" ? "danger" : "primary"}
        />
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-800">{value}</p></div>; }
function MiniStat({ label, value }: { label: ReportStatus; value: number }) { return <Card padding="sm"><ReportStatusBadge status={label} /><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p></Card>; }
function ReportStatusBadge({ status }: { status: ReportStatus }) { const tone: StatusTone = status === "Open" ? "warning" : status === "Reviewing" ? "info" : status === "Resolved" ? "success" : "neutral"; return <StatusBadge tone={tone}>{status}</StatusBadge>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export { ReportManagementPage };
