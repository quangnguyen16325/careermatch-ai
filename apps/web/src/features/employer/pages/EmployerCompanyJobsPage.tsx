import { useCallback, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { EmployerWorkspaceHeader } from "../components/EmployerWorkspaceHeader";
import { JobManagementSection } from "../components/JobManagementSection";
import { mockCompanyProfile } from "../data/mockEmployerData";
import { closeEmployerJob, listEmployerJobs, EmployerJobsApiError } from "../job-management/jobManagementApi";
import type { CompanyProfile } from "../types";
import type { EmployerJobsPage, EmployerJobsQuery } from "../job-management/types";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(mockCompanyProfile);
  const [jobsPage, setJobsPage] = useState<EmployerJobsPage | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState<EmployerJobsQuery>({ page: 1, pageSize: 20 });
  const requestVersion = useRef(0);

  const retryJobs = useCallback(() => {
    setLoadingJobs(true);
    setJobsError("");
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++requestVersion.current;
    let pageAdjusted = false;
    void listEmployerJobs(query, controller.signal)
      .then((result) => {
        if (version !== requestVersion.current) return;
        const lastPage = Math.max(result.meta.totalPages, 1);
        if (result.meta.page > lastPage) {
          pageAdjusted = true;
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setJobsPage(result);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (version === requestVersion.current) setJobsError(error instanceof EmployerJobsApiError ? error.message : "Could not load job postings. Try again.");
      })
      .finally(() => {
        if (version === requestVersion.current && !pageAdjusted) setLoadingJobs(false);
      });
    return () => controller.abort();
  }, [query, reloadKey]);

  const updateQuery = useCallback((change: Partial<EmployerJobsQuery>) => {
    setLoadingJobs(true);
    setJobsError("");
    setQuery((current) => ({ ...current, ...change }));
  }, []);

  const closeJob = useCallback(async (jobId: string) => {
    const updatedJob = await closeEmployerJob(jobId);
    setJobsPage((current) => current ? {
      ...current,
      data: current.data.map((job) => job.id === jobId ? updatedJob : job),
    } : current);
    setLoadingJobs(true);
    setJobsError("");
    try {
      const refreshed = await listEmployerJobs(query);
      setJobsPage(refreshed);
      return true;
    } catch {
      return false;
    } finally {
      setLoadingJobs(false);
    }
  }, [query]);

  return (
    <WorkspaceLayout
      className="space-y-10 sm:space-y-12"
      header={<EmployerWorkspaceHeader companyName={company?.name || "Your company"} />}
    >
      <div className="grid gap-10 sm:gap-12">
        <CompanyProfileSection initialProfile={company} onSave={setCompany} />
        <div className="border-t border-slate-200 pt-8 sm:pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500"><BriefcaseBusiness size={16} />Job postings</div>
          <JobManagementSection error={jobsError} loading={loadingJobs} onCloseJob={closeJob} onQueryChange={updateQuery} onRetry={retryJobs} page={jobsPage} query={query} />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
