import { useEffect, useState } from "react";
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
import type {
  CreateJobDraftInput,
  UpdateJobInput,
} from "../job-editor/types";

function EmployerCompanyJobsPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(mockCompanyProfile);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshJobs() {
    try {
      const page = await listEmployerJobs();
      setJobs(page.data.map(mapEmployerJob));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void listEmployerJobs()
      .then((page) => {
        if (active) setJobs(page.data.map(mapEmployerJob));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load jobs.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function saveDraft(
    draft: CreateJobDraftInput | UpdateJobInput,
    existingJob?: JobPosting,
  ) {
    const saved = existingJob
      ? await updateJobDraft(existingJob.id, draft as UpdateJobInput)
      : await createJobDraft(draft as CreateJobDraftInput);
    const mapped = mapEmployerJob(saved);
    setJobs((current) => {
      const existing = current.some((job) => job.id === mapped.id);
      return existing
        ? current.map((job) => (job.id === mapped.id ? mapped : job))
        : [mapped, ...current];
    });

    try {
      const page = await listEmployerJobs();
      setJobs(page.data.map(mapEmployerJob));
      setError("");
      return "Job draft saved successfully.";
    } catch {
      return "Job draft saved successfully, but the job list could not be refreshed.";
    }
  }

  async function loadJobForEdit(job: JobPosting) {
    return mapEmployerJob(await getEmployerJob(job.id));
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
          <JobManagementSection
            error={error}
            jobs={jobs}
            loading={loading}
            onLoadJob={loadJobForEdit}
            onRetry={() => { setError(""); setLoading(true); void refreshJobs(); }}
            onSubmitDraft={saveDraft}
          />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

export { EmployerCompanyJobsPage };
