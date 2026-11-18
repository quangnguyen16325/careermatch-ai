import { useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { EmployerWorkspaceHeader } from "../components/EmployerWorkspaceHeader";
import { JobManagementSection } from "../components/JobManagementSection";
import { mockCompanyProfile, mockJobPostings } from "../data/mockEmployerData";
import type { CompanyProfile, JobPosting, JobStatus } from "../types";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(mockCompanyProfile);
  const [jobs, setJobs] = useState<JobPosting[]>(mockJobPostings);

  function saveJob(values: Omit<JobPosting, "id" | "status">, status: JobStatus, id?: string) {
    setJobs((current) => id
      ? current.map((job) => job.id === id ? { ...values, id, status } : job)
      : [{ ...values, id: `job-${Date.now()}`, status }, ...current]);
  }

  function changeJobStatus(job: JobPosting, status: JobStatus) {
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status } : item));
  }

  return (
    <WorkspaceLayout
      className="space-y-10 sm:space-y-12"
      header={<EmployerWorkspaceHeader companyName={company?.name || "Your company"} />}
    >
      <div className="grid gap-10 sm:gap-12">
        <CompanyProfileSection initialProfile={company} onSave={setCompany} />
        <div className="border-t border-slate-200 pt-8 sm:pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500"><BriefcaseBusiness size={16} />Job postings</div>
          <JobManagementSection jobs={jobs} onSave={saveJob} onStatusChange={changeJobStatus} />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
