import { Activity, ArrowRight, BriefcaseBusiness, Building2, CircleAlert, ClipboardCheck, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { AdminActivity, AdminEmployer, AdminReport, AdminSection, AdminUser, ModerationJob } from "../types";

type AdminDashboardProps = {
  users: AdminUser[];
  employers: AdminEmployer[];
  jobs: ModerationJob[];
  reports: AdminReport[];
  activities: AdminActivity[];
  onNavigate: (section: AdminSection) => void;
};

function AdminDashboard({ activities, employers, jobs, onNavigate, reports, users }: AdminDashboardProps) {
  const pendingJobs = jobs.filter((job) => job.status === "Pending").length;
  const reportedJobs = reports.filter((report) => report.targetType === "Job" && report.status !== "Resolved" && report.status !== "Dismissed").length;
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
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export { AdminDashboard };
