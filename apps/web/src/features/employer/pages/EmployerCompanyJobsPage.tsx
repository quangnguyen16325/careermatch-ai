import { useState } from "react";
import { Building2, BriefcaseBusiness, Sparkles } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
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
            <Building2 size={16} /> {company?.name ?? "Your company"}
          </div>
        </div>
      )}
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
