export type AdminSection = "Dashboard" | "Users" | "Employers" | "Job moderation" | "Reports";

export type AdminRole = "Student" | "Employer" | "Admin";
export type AccountStatus = "Active" | "Suspended" | "Pending";
export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type ModerationStatus = "Pending" | "Approved" | "Rejected" | "Flagged";
export type ReportStatus = "Open" | "Reviewing" | "Resolved" | "Dismissed";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  registeredAt: string;
  status: AccountStatus;
  location: string;
};

export type AdminEmployer = {
  id: string;
  company: string;
  contactName: string;
  email: string;
  website: string;
  logoUrl: string;
  industry: string;
  size: string;
  registeredAt: string;
  status: VerificationStatus;
  verificationNote?: string;
  description: string;
};

export type ModerationJob = {
  id: string;
  title: string;
  company: string;
  employer: string;
  submittedAt: string;
  deadline: string;
  status: ModerationStatus;
  location: string;
  employmentType: string;
  salary: string;
  description: string;
  requirements: string;
  moderationReason: string;
};

export type ReportHistoryEntry = {
  status: ReportStatus;
  date: string;
  note: string;
};

export type AdminReport = {
  id: string;
  reporter: string;
  reporterEmail: string;
  targetType: "Job" | "Account";
  targetLabel: string;
  reason: string;
  details: string;
  submittedAt: string;
  status: ReportStatus;
  history: ReportHistoryEntry[];
};

export type AdminActivity = {
  id: string;
  title: string;
  detail: string;
  date: string;
  tone: "emerald" | "sky" | "amber" | "rose";
};
