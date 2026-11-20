import { useCallback, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { EmployerWorkspaceHeader } from "../components/EmployerWorkspaceHeader";
import { JobManagementSection } from "../components/JobManagementSection";
import { mockJobPostings } from "../data/mockEmployerData";
import type { CompanyProfile, JobPosting, JobStatus } from "../types";
import {
  CompanyApiRequestError,
  createMyCompanyProfile,
  getMyCompanyProfile,
  updateMyCompanyProfile,
} from "../companyApiClient";
import {
  createCompanySaveGuard,
  getCompanyApiFailurePresentation,
  normalizeCompanyApiFailure,
} from "../companyApi";
import type { CompanyApiFailure, CreateCompanyRequest, UpdateCompanyRequest } from "../companyApi";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyLoadError, setCompanyLoadError] = useState("");
  const [companyApiFailure, setCompanyApiFailure] = useState<CompanyApiFailure | null>(null);
  const [companySaving, setCompanySaving] = useState(false);
  const savingRef = useRef(createCompanySaveGuard());
  const [jobs, setJobs] = useState<JobPosting[]>(mockJobPostings);

  const loadCompany = useCallback(async () => {
    setCompanyLoading(true);
    setCompanyLoadError("");
    setCompanyApiFailure(null);
    try {
      setCompany(await getMyCompanyProfile());
    } catch (error) {
      const failure = error instanceof CompanyApiRequestError
        ? error.failure
        : normalizeCompanyApiFailure(0, null);
      setCompanyLoadError(getCompanyApiFailurePresentation(failure).message);
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadCompany());
  }, [loadCompany]);

  async function saveCompany(
    request: CreateCompanyRequest | UpdateCompanyRequest,
    mode: "create" | "update",
  ) {
    if (!savingRef.current.tryStart()) return false;
    setCompanySaving(true);
    setCompanyApiFailure(null);
    try {
      const saved = mode === "create"
        ? await createMyCompanyProfile(request as CreateCompanyRequest)
        : await updateMyCompanyProfile(request as UpdateCompanyRequest);
      if (!saved) return false;
      setCompany(saved);
      if (mode === "create") void loadCompany();
      return true;
    } catch (error) {
      const failure = error instanceof CompanyApiRequestError
        ? error.failure
        : normalizeCompanyApiFailure(0, null);
      setCompanyApiFailure(failure);
      return false;
    } finally {
      savingRef.current.finish();
      setCompanySaving(false);
    }
  }

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
        <CompanyProfileSection
          initialProfile={company}
          loading={companyLoading}
          error={companyLoadError}
          apiFailure={companyApiFailure}
          saving={companySaving}
          onRetry={() => void loadCompany()}
          onSave={saveCompany}
        />
        <div className="border-t border-slate-200 pt-8 sm:pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500"><BriefcaseBusiness size={16} />Job postings</div>
          <JobManagementSection jobs={jobs} onSave={saveJob} onStatusChange={changeJobStatus} />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
