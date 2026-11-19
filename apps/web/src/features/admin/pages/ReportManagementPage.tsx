import { Modal } from "../../../components/ui/Modal";
import { useMemo, useState } from "react";
import { CalendarDays, Flag, Search, ShieldAlert, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AdminActionDialog } from "../components/AdminActionDialog";
import { filterAndSortReports, getReportDataState } from "../reports/reportAnalytics";
import type { ReportFilterCriteria, ReportSortOrder } from "../reports/types";
import type { AdminReport, ReportStatus, ReportTargetType } from "../types";

type ReportManagementPageProps = {
  reports: AdminReport[];
  onStatusChange: (report: AdminReport, status: ReportStatus, note: string) => void;
};

function ReportManagementPage({ onStatusChange, reports }: ReportManagementPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ReportStatus | "All statuses">("All statuses");
  const [targetType, setTargetType] = useState<ReportTargetType | "All types">("All types");
  const [sortOrder, setSortOrder] = useState<ReportSortOrder>("newest");
  const [selected, setSelected] = useState<AdminReport | null>(null);

  const filtered = useMemo(() => filterAndSortReports(reports, { query, status, targetType, sortOrder } satisfies ReportFilterCriteria), [query, reports, sortOrder, status, targetType]);
  const dataState = getReportDataState(reports);
  const hasFilters = Boolean(query.trim()) || status !== "All statuses" || targetType !== "All types";

  function resetFilters() {
    setQuery("");
    setStatus("All statuses");
    setTargetType("All types");
    setSortOrder("newest");
  }

  function update(report: AdminReport, next: ReportStatus, note: string) {
    onStatusChange(report, next, note);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Review community reports. This workspace currently displays local preview data." eyebrow="Trust and safety · Preview data" title="Reports" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Open" value={reports.filter((report) => report.status === "Open").length} />
        <MiniStat label="Reviewing" value={reports.filter((report) => report.status === "Reviewing").length} />
        <MiniStat label="Resolved" value={reports.filter((report) => report.status === "Resolved").length} />
        <MiniStat label="Dismissed" value={reports.filter((report) => report.status === "Dismissed").length} />
      </div>
      <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(9rem,0.55fr))_auto]">
        <label className="relative block min-w-0"><span className="sr-only">Search reports</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" type="search" value={query} /></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Status</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatus(event.target.value as ReportStatus | "All statuses")} value={status}>{(["All statuses", "Open", "Reviewing", "Resolved", "Dismissed"] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Report type</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setTargetType(event.target.value as ReportTargetType | "All types")} value={targetType}>{(["All types", "Job", "Account"] as const).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Sort by date</span><select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setSortOrder(event.target.value as ReportSortOrder)} value={sortOrder}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        <div className="flex items-end"><Button className="w-full sm:w-auto" disabled={!hasFilters && sortOrder === "newest"} icon={<X size={16} aria-hidden="true" />} onClick={resetFilters} variant="secondary">Reset filters</Button></div>
      </Card>
      <div aria-live="polite" role="status"><h2 className="font-semibold text-slate-950">Community reports</h2><p className="mt-1 text-sm text-slate-500">Showing {filtered.length} of {reports.length} reports</p></div>
      {dataState.status === "empty" ? <EmptyReports /> : filtered.length ? <ReportResults onView={setSelected} reports={filtered} /> : <Card className="py-12 text-center"><Flag className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No matching reports</h3><p className="mt-2 text-sm text-slate-600">Adjust or reset the search and filters to see reports.</p><Button className="mt-4" disabled={!hasFilters && sortOrder === "newest"} onClick={resetFilters} variant="secondary">Reset filters</Button></Card>}

      {selected ? <ReportDetailsDialog onClose={() => setSelected(null)} onUpdate={(next, note) => update(selected, next, note)} report={selected} /> : null}
    </div>
  );
}

function ReportResults({ reports, onView }: { reports: AdminReport[]; onView: (report: AdminReport) => void }) {
  return <>
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Report</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Reported item</th><th className="px-4 py-3 font-semibold">Reporter</th><th className="px-4 py-3 font-semibold">Submitted</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{reports.map((report) => <tr key={report.id} className="align-top"><td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">{report.id}</td><td className="px-4 py-4">{report.targetType}</td><td className="max-w-64 px-4 py-4"><p className="font-medium text-slate-900">{report.targetLabel}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{report.reason}</p></td><td className="px-4 py-4"><p className="font-medium text-slate-800">{report.reporter}</p><p className="mt-1 text-xs text-slate-500">{report.reporterEmail}</p></td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(report.submittedAt)}</td><td className="px-4 py-4"><ReportStatusBadge status={report.status} /></td><td className="px-4 py-4 text-right"><Button aria-label={`View report ${report.id}`} onClick={() => onView(report)} size="sm" variant="secondary">View details</Button></td></tr>)}</tbody>
      </table>
    </div>
    <div className="grid gap-3 lg:hidden">{reports.map((report) => <ReportRow key={report.id} onView={() => onView(report)} report={report} />)}</div>
  </>;
}

function EmptyReports() {
  return <Card className="py-12 text-center"><Flag className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No reports to review</h3><p className="mt-2 text-sm text-slate-600">There are no reports in the available preview data.</p></Card>;
}

function ReportRow({ report, onView }: { report: AdminReport; onView: () => void }) {
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><ShieldAlert size={18} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{report.id}</span><ReportStatusBadge status={report.status} /></div>
          <h3 className="mt-1 font-semibold text-slate-950">{report.targetLabel}</h3>
          <p className="mt-1 text-sm text-slate-600">{report.reason} <span aria-hidden="true">·</span> {report.targetType}</p>
          <p className="mt-1 text-xs text-slate-500">Reported by {report.reporter} <span aria-hidden="true">·</span> {report.reporterEmail}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{report.details}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400"><CalendarDays size={13} />{formatDate(report.submittedAt)}</p>
        </div>
      </div>
      <Button aria-label={`View report ${report.id}`} className="w-full shrink-0 sm:w-auto" onClick={onView} size="sm" variant="secondary">View report</Button>
    </Card>
  );
}

function ReportDetailsDialog({ report, onClose, onUpdate }: { report: AdminReport; onClose: () => void; onUpdate: (status: ReportStatus, note: string) => void }) {
  const [action, setAction] = useState<ReportStatus | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onClick={onClose}>
      <Modal onClose={onClose} aria-labelledby="report-detail-title" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex flex-wrap items-center gap-2"><ReportStatusBadge status={report.status} /><span className="text-xs text-slate-500">Report {report.id} · Submitted {formatDate(report.submittedAt)}</span></div>
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
