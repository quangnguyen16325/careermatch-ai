import { Activity, ArrowRight, BriefcaseBusiness, Building2, CircleAlert, ClipboardCheck, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { buildReportAnalytics, getReportDataState } from "../reports/reportAnalytics";
import type { ReportDataState } from "../reports/types";
import type { AdminActivity, AdminEmployer, AdminReport, AdminSection, AdminUser, ModerationJob } from "../types";

type AdminDashboardProps = {
  users: AdminUser[];
  employers: AdminEmployer[];
  jobs: ModerationJob[];
  reports: AdminReport[];
  reportDataState?: ReportDataState;
  activities: AdminActivity[];
  onNavigate: (section: AdminSection) => void;
};

function AdminDashboard({ activities, employers, jobs, onNavigate, reportDataState, reports, users }: AdminDashboardProps) {
  const pendingJobs = jobs.filter((job) => job.status === "Pending").length;
  const reportedJobs = reports.filter((report) => report && report.targetType === "Job" && report.status !== "Resolved" && report.status !== "Dismissed").length;
  const pendingEmployers = employers.filter((employer) => employer.status === "Pending").length;
  const students = users.filter((user) => user.role === "Student").length;
  const adminUsers = users.filter((user) => user.role === "Admin").length;
  const recentUsers = [...users].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 4);

  return (
    <div className="space-y-7 sm:space-y-8">
      <PageHeader
        description="A quick view of platform activity, onboarding, and content that needs attention."
        eyebrow="Platform operations"
        title="Admin dashboard"
      />

      <section aria-label="Platform statistics" className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        <Metric icon={<Users />} label="Total users" value={users.length} note={`${users.filter((user) => user.status === "Active").length} active`} tone="slate" onClick={() => onNavigate("Users")} />
        <Metric icon={<Building2 />} label="Employers" value={employers.length} note={`${pendingEmployers} awaiting verification`} tone="violet" onClick={() => onNavigate("Employers")} />
        <Metric icon={<Users />} label="Candidates" value={students} note={`${users.filter((user) => user.role === "Student" && user.status === "Active").length} active`} tone="sky" onClick={() => onNavigate("Users")} />
        <Metric icon={<BriefcaseBusiness />} label="Total jobs" value={jobs.length} note={`${jobs.filter((job) => job.status === "Approved").length} approved`} tone="emerald" onClick={() => onNavigate("Job moderation")} />
        <Metric icon={<ClipboardCheck />} label="Pending approvals" value={pendingJobs} note="Jobs awaiting review" tone="amber" onClick={() => onNavigate("Job moderation")} />
        <Metric icon={<CircleAlert />} label="Reported jobs" value={reportedJobs} note="Open or under review" tone="rose" onClick={() => onNavigate("Reports")} />
      </section>

      <ReportAnalyticsPanel dataState={reportDataState ?? getReportDataState(reports)} onNavigate={onNavigate} />

      <div className="grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><ClipboardCheck className="text-emerald-700" size={18} /><h2 className="font-semibold text-slate-950">Job approval overview</h2></div>
              <p className="mt-1 text-sm text-slate-500">Moderation queue at a glance</p>
            </div>
            <button className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950" onClick={() => onNavigate("Job moderation")} type="button">Review queue <ArrowRight size={15} /></button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusCount label="Pending" count={pendingJobs} tone="warning" />
            <StatusCount label="Approved" count={jobs.filter((job) => job.status === "Approved").length} tone="success" />
            <StatusCount label="Flagged" count={jobs.filter((job) => job.status === "Flagged").length} tone="danger" />
            <StatusCount label="Rejected" count={jobs.filter((job) => job.status === "Rejected").length} tone="neutral" />
          </div>
          {jobs.filter((job) => job.status === "Pending" || job.status === "Flagged").slice(0, 3).map((job) => (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between" key={job.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{job.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{job.company} <span aria-hidden="true">·</span> Submitted {formatDate(job.submittedAt)}</p>
              </div>
              <StatusBadge tone={job.status === "Flagged" ? "danger" : "warning"}>{job.status}</StatusBadge>
            </div>
          ))}
          {!pendingJobs && !jobs.some((job) => job.status === "Flagged") ? <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">All job listings are up to date.</p> : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><Activity className="text-emerald-700" size={18} /><h2 className="font-semibold text-slate-950">Recent activity</h2></div>
              <p className="mt-1 text-sm text-slate-500">Latest platform events</p>
            </div>
          </div>
          <ol className="mt-5 space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <li className="flex items-start gap-3" key={activity.id}>
                <span className={`mt-1 size-2.5 shrink-0 rounded-full ${activity.tone === "rose" ? "bg-rose-500" : activity.tone === "amber" ? "bg-amber-500" : activity.tone === "sky" ? "bg-sky-500" : "bg-emerald-500"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{activity.detail}</p>
                </div>
                <time className="shrink-0 text-xs text-slate-400" dateTime={activity.date}>{formatDate(activity.date)}</time>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">Recent registrations</h2>
            <p className="mt-1 text-sm text-slate-500">Latest accounts added to the platform</p>
          </div>
          <button className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950" onClick={() => onNavigate("Users")} type="button">All users <ArrowRight size={15} /></button>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {recentUsers.map((user) => (
            <div className="flex flex-wrap items-center gap-3 py-3" key={user.id}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">{initials(user.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <StatusBadge tone={user.role === "Employer" ? "info" : user.role === "Admin" ? "neutral" : "success"}>{user.role}</StatusBadge>
              <time className="w-full text-xs text-slate-400 sm:w-auto" dateTime={user.registeredAt}>Joined {formatDate(user.registeredAt)}</time>
            </div>
          ))}
        </div>
      </Card>
      <span className="sr-only">{adminUsers} administrator accounts</span>
    </div>
  );
}

function ReportAnalyticsPanel({ dataState, onNavigate }: { dataState: ReportDataState; onNavigate: (section: AdminSection) => void }) {
  if (dataState.status === "loading") {
    return <Card aria-live="polite" aria-busy="true"><h2 className="font-semibold text-slate-950" id="report-analytics-title">Report analytics</h2><p className="mt-3 text-sm text-slate-600" role="status">Loading report analytics...</p></Card>;
  }
  if (dataState.status === "error") {
    return <Card aria-labelledby="report-analytics-title"><h2 className="font-semibold text-slate-950" id="report-analytics-title">Report analytics</h2><p className="mt-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">Report analytics could not be loaded: {dataState.message}</p></Card>;
  }
  if (dataState.status === "empty") {
    return <Card aria-labelledby="report-analytics-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950" id="report-analytics-title">Report analytics</h2><p className="mt-1 text-sm text-slate-500">Summary of community reports</p></div><PreviewLabel /></div><p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No report data is currently available for these metrics.</p><button className="mt-4 text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" onClick={() => onNavigate("Reports")} type="button">Open report triage <ArrowRight aria-hidden="true" className="ml-1 inline" size={15} /></button></Card>;
  }

  const analytics = buildReportAnalytics(dataState.reports);
  const metrics = [
    { label: "Total reports", value: analytics.totalReports, detail: "All available reports" },
    { label: "Open", value: analytics.statusCounts.Open, detail: "Awaiting review" },
    { label: "Reviewing", value: analytics.statusCounts.Reviewing, detail: "Under review" },
    { label: "Resolved", value: analytics.statusCounts.Resolved, detail: "Decision recorded" },
    { label: "Dismissed", value: analytics.statusCounts.Dismissed, detail: "Closed without action" },
    { label: "Processed rate", value: `${analytics.processedRatePercent}%`, detail: `${analytics.processedReports} of ${analytics.totalReports} closed` },
  ];
  const statuses = [
    { label: "Open", count: analytics.statusCounts.Open, tone: "bg-amber-500" },
    { label: "Reviewing", count: analytics.statusCounts.Reviewing, tone: "bg-sky-500" },
    { label: "Resolved", count: analytics.statusCounts.Resolved, tone: "bg-emerald-600" },
    { label: "Dismissed", count: analytics.statusCounts.Dismissed, tone: "bg-slate-500" },
  ];
  const targets = [
    { label: "Job reports", count: analytics.targetTypeCounts.Job },
    { label: "Account reports", count: analytics.targetTypeCounts.Account },
  ];

  return (
    <section aria-labelledby="report-analytics-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-semibold text-slate-950" id="report-analytics-title">Report analytics</h2><p className="mt-1 text-sm text-slate-500">Live summary from the current local preview list</p></div>
        <div className="flex items-center gap-3"><PreviewLabel /><button className="text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600" onClick={() => onNavigate("Reports")} type="button">Open report triage <ArrowRight aria-hidden="true" className="ml-1 inline" size={15} /></button></div>
      </div>
      <div aria-label="Report metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => <Card as="article" key={metric.label} padding="sm"><p className="text-xs font-semibold text-slate-600 sm:text-sm">{metric.label}</p><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-label="Report status distribution">
          <h3 className="font-semibold text-slate-950">Status distribution</h3>
          <p className="mt-1 text-sm text-slate-500">Report count by current handling status</p>
          <div className="mt-5 space-y-4">{statuses.map(({ count, label, tone }) => <DistributionBar count={count} key={label} label={label} max={analytics.totalReports} tone={tone} />)}</div>
        </Card>
        <Card aria-label="Report target distribution">
          <h3 className="font-semibold text-slate-950">Reported item types</h3>
          <p className="mt-1 text-sm text-slate-500">Distribution by reported item</p>
          <div className="mt-5 space-y-4">{targets.map(({ count, label }) => <DistributionBar count={count} key={label} label={label} max={analytics.totalReports} tone={label === "Job reports" ? "bg-violet-600" : "bg-cyan-600"} />)}</div>
        </Card>
      </div>
    </section>
  );
}

function DistributionBar({ count, label, max, tone }: { count: number; label: string; max: number; tone: string }) {
  const percent = max > 0 ? Math.round((count / max) * 100) : 0;
  return <div>
    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{label}</span><span className="tabular-nums text-slate-600">{count} <span className="text-slate-400">({percent}%)</span></span></div>
    <div aria-label={`${label}: ${count} of ${max} reports (${percent}%)`} aria-valuemax={max} aria-valuemin={0} aria-valuenow={count} className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar"><div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} /></div>
  </div>;
}

function PreviewLabel() {
  return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Preview data</span>;
}

function Metric({ icon, label, value, note, tone, onClick }: { icon: React.ReactNode; label: string; value: number; note: string; tone: "slate" | "violet" | "sky" | "emerald" | "amber" | "rose"; onClick: () => void }) {
  const toneClasses = {
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <button className="rounded-2xl text-left outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20" onClick={onClick} type="button">
      <Card as="div" padding="sm" className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <span className={`grid size-9 place-items-center rounded-xl ${toneClasses[tone]}`} aria-hidden="true">{icon}</span>
        <p className="mt-4 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 sm:text-xs">{note}</p>
      </Card>
    </button>
  );
}

function StatusCount({ label, count, tone }: { label: string; count: number; tone: "warning" | "success" | "danger" | "neutral" }) {
  return <div className="rounded-xl bg-slate-50 p-3"><StatusBadge tone={tone}>{label}</StatusBadge><p className="mt-3 text-xl font-semibold tabular-nums text-slate-950">{count}</p></div>;
}

function initials(value: string) { return value.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function formatDate(value: string) { if (typeof value !== "string") return "Date unavailable"; const timestamp = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value); return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(timestamp) : "Date unavailable"; }

export { AdminDashboard };
