import { useCallback, useEffect, useRef, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { WorkspaceLayout } from "../../../components/layout/WorkspaceLayout";
import { CompanyProfileSection } from "../components/CompanyProfileSection";
import { EmployerWorkspaceHeader } from "../components/EmployerWorkspaceHeader";
import { JobManagementSection } from "../components/JobManagementSection";
import { mockCompanyProfile } from "../data/mockEmployerData";
import type { CompanyProfile, JobPosting } from "../types";
import {
  createJobDraft,
  getEmployerJob,
  listEmployerJobs,
  mapEmployerJob,
  updateJobDraft,
} from "../job-editor/jobApi";
import type { CreateJobDraftInput, UpdateJobInput } from "../job-editor/types";
import { createRequestVersion } from "../job-editor/requestVersion";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(
    mockCompanyProfile,
  );
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const listRequests = useRef(createRequestVersion());
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  const refreshJobs = useCallback(
    async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
      const requestVersion = listRequests.current.next();
      if (showLoading) setLoading(true);
      setError("");
      try {
        const page = await listEmployerJobs();
        if (
          !mountedRef.current ||
          !listRequests.current.isCurrent(requestVersion)
        )
          return false;
        setJobs(page.data.map(mapEmployerJob));
        return true;
      } catch (loadError) {
        if (
          mountedRef.current &&
          listRequests.current.isCurrent(requestVersion)
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load jobs.",
          );
        }
        return false;
      } finally {
        if (
          mountedRef.current &&
          listRequests.current.isCurrent(requestVersion)
        )
          setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    const requests = listRequests.current;
    const requestVersion = requests.next();
    void listEmployerJobs()
      .then((page) => {
        if (mountedRef.current && requests.isCurrent(requestVersion)) {
          setJobs(page.data.map(mapEmployerJob));
        }
      })
      .catch((loadError: unknown) => {
        if (mountedRef.current && requests.isCurrent(requestVersion)) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load jobs.",
          );
        }
      })
      .finally(() => {
        if (mountedRef.current && requests.isCurrent(requestVersion))
          setLoading(false);
      });
    return () => {
      mountedRef.current = false;
      requests.invalidate();
    };
  }, []);

  async function saveDraft(
    draft: CreateJobDraftInput | UpdateJobInput,
    existingJob?: JobPosting,
  ) {
    if (savingRef.current)
      throw new Error("A job save is already in progress.");
    savingRef.current = true;
    // A list request started before the mutation must not overwrite its result.
    listRequests.current.invalidate();

    try {
      const saved = existingJob
        ? await updateJobDraft(existingJob.id, draft as UpdateJobInput)
        : await createJobDraft(draft as CreateJobDraftInput);
      const mapped = mapEmployerJob(saved);
      if (!mountedRef.current) {
        return "Job draft saved successfully. The page closed before the job list could be refreshed.";
      }
      setJobs((current) => {
        const existing = current.some((job) => job.id === mapped.id);
        return existing
          ? current.map((job) => (job.id === mapped.id ? mapped : job))
          : [mapped, ...current];
      });

      const refreshed = await refreshJobs({ showLoading: false });
      return refreshed
        ? "Job draft saved successfully."
        : "Job draft saved successfully, but the job list could not be refreshed. Retry loading jobs before making another change.";
    } finally {
      savingRef.current = false;
    }
  }

  async function loadJobForEdit(job: JobPosting) {
    return mapEmployerJob(await getEmployerJob(job.id));
  }

  return (
    <WorkspaceLayout
      className="space-y-10 sm:space-y-12"
      header={
        <EmployerWorkspaceHeader
          companyName={company?.name || "Your company"}
        />
      }
    >
      <div className="grid gap-10 sm:gap-12">
        <CompanyProfileSection initialProfile={company} onSave={setCompany} />
        <div className="border-t border-slate-200 pt-8 sm:pt-10">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
            <BriefcaseBusiness size={16} />
            Job postings
          </div>
          <JobManagementSection
            error={error}
            jobs={jobs}
            loading={loading}
            onLoadJob={loadJobForEdit}
            onRetry={() => {
              void refreshJobs();
            }}
            onSubmitDraft={saveDraft}
          />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
