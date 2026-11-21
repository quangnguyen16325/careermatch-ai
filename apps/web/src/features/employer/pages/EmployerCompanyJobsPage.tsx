import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { EmployerWorkspaceHeader } from "../components/EmployerWorkspaceHeader";
import { JobManagementSection } from "../components/JobManagementSection";
import { mockCompanyProfile } from "../data/mockEmployerData";
import { listEmployerJobs, EmployerJobsApiError } from "../job-management/jobManagementApi";
import type { CompanyProfile } from "../types";
import type { EmployerJobsPage } from "../job-management/types";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(mockCompanyProfile);
  const [jobsPage, setJobsPage] = useState<EmployerJobsPage | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const retryJobs = useCallback(() => {
    setLoadingJobs(true);
    setJobsError("");
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listEmployerJobs({ page: 1, pageSize: 20 }, controller.signal)
      .then((result) => setJobsPage(result))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setJobsError(error instanceof EmployerJobsApiError ? error.message : "Could not load job postings. Try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingJobs(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <WorkspaceLayout
      className="space-y-10 sm:space-y-12"
      header={<EmployerWorkspaceHeader companyName={company?.name || "Your company"} />}
    >
      <div className="grid gap-10 sm:gap-12">
        <CompanyProfileSection initialProfile={company} onSave={setCompany} />
        <div className="border-t border-slate-200 pt-8 sm:pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500"><BriefcaseBusiness size={16} />Job postings</div>
          <JobManagementSection error={jobsError} loading={loadingJobs} onRetry={retryJobs} page={jobsPage} />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
