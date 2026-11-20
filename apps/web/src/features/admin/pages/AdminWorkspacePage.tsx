import { useState, type ReactNode } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminNotice } from "../components/AdminNotice";
import { mockAdminActivities, mockAdminEmployers, mockAdminReports, mockAdminUsers, mockModerationJobs } from "../data/mockAdminData";
import { AdminDashboard } from "./AdminDashboard";
import { CompanyVerificationQueuePage } from "./CompanyVerificationQueuePage";
import { EmployerManagementPage } from "./EmployerManagementPage";
import { JobModerationPage } from "./JobModerationPage";
import { ReportManagementPage } from "./ReportManagementPage";
import { UserManagementPage } from "./UserManagementPage";
import type { AccountStatus, AdminActivity, AdminEmployer, AdminReport, AdminSection, AdminUser, ModerationJob, ModerationStatus, ReportStatus, VerificationStatus } from "../types";

type AdminWorkspacePageProps = {
  loading?: boolean;
  loadError?: string;
};

function AdminWorkspacePage({ loadError, loading = false }: AdminWorkspacePageProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("Dashboard");
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [employers, setEmployers] = useState<AdminEmployer[]>(mockAdminEmployers);
  const [jobs, setJobs] = useState<ModerationJob[]>(mockModerationJobs);
  const [reports, setReports] = useState<AdminReport[]>(mockAdminReports);
  const [activities, setActivities] = useState<AdminActivity[]>(mockAdminActivities);
  const [notice, setNotice] = useState("");

  function addActivity(title: string, detail: string, tone: AdminActivity["tone"]) {
    const date = new Date().toISOString().slice(0, 10);
    setActivities((current) => [{ id: `activity-${Date.now()}`, title, detail, date, tone }, ...current]);
  }

  function updateUserStatus(user: AdminUser, status: AccountStatus) {
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, status } : item));
    setNotice(`${user.name}'s account is now ${status.toLowerCase()}.`);
    addActivity(`Account ${status.toLowerCase()}`, user.name, status === "Suspended" ? "rose" : "emerald");
  }

  function updateEmployerStatus(employer: AdminEmployer, status: VerificationStatus, reason = "") {
    setEmployers((current) => current.map((item) => item.id === employer.id ? { ...item, status, verificationNote: status === "Rejected" ? reason : undefined } : item));
    setNotice(`${employer.company} verification ${status.toLowerCase()}.`);
    addActivity(`Employer ${status.toLowerCase()}`, employer.company, status === "Verified" ? "emerald" : "amber");
  }

  function updateJobStatus(job: ModerationJob, status: ModerationStatus, reason = "") {
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status, moderationReason: reason || item.moderationReason } : item));
    setNotice(`${job.title} is now ${status.toLowerCase()}.`);
    addActivity(`Job ${status.toLowerCase()}`, `${job.title} - ${job.company}`, status === "Approved" ? "emerald" : status === "Pending" ? "amber" : "rose");
  }

  function updateReportStatus(report: AdminReport, status: ReportStatus, note: string) {
    setReports((current) => current.map((item) => item.id === report.id ? {
      ...item,
      status,
      history: [{ status, date: new Date().toISOString().slice(0, 10), note }, ...item.history],
    } : item));
    setNotice(`Report for ${report.targetLabel} marked ${status.toLowerCase()}.`);
    addActivity(`Report ${status.toLowerCase()}`, report.targetLabel, status === "Resolved" ? "emerald" : status === "Dismissed" ? "rose" : "amber");
  }

  let section: ReactNode;
  switch (activeSection) {
    case "Users":
      section = <UserManagementPage onStatusChange={updateUserStatus} users={users} />;
      break;
    case "Employers":
      section = <EmployerManagementPage employers={employers} onStatusChange={updateEmployerStatus} />;
      break;
    case "Company verification":
      section = <CompanyVerificationQueuePage />;
      break;
    case "Job moderation":
      section = <JobModerationPage jobs={jobs} onStatusChange={updateJobStatus} />;
      break;
    case "Reports":
      section = <ReportManagementPage onStatusChange={updateReportStatus} reports={reports} />;
      break;
    default:
      section = <AdminDashboard activities={activities} employers={employers} jobs={jobs} onNavigate={setActiveSection} reports={reports} users={users} />;
  }

  return (
    <AdminLayout activeSection={activeSection} onNavigate={(next) => { setActiveSection(next); setNotice(""); }}>
      {notice ? <div className="mb-5"><AdminNotice tone="success">{notice}</AdminNotice></div> : null}
      {loadError ? <AdminNotice tone="error">{loadError}</AdminNotice> : loading ? <AdminNotice tone="loading">Loading administration data...</AdminNotice> : section}
    </AdminLayout>
  );
}

export { AdminWorkspacePage };
