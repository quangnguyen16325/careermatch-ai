import { useEffect, useRef, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { JobPosting } from "../types";
import { RequiredSkillSelector } from "./RequiredSkillSelector";
import {
  JOB_WORK_MODES,
  type CareerCategoryOption,
  type CreateJobDraftInput,
  type JobDraftFieldErrors,
  type UpdateJobInput,
  type JobWorkMode,
} from "../job-editor/types";
import { prepareJobDraftSubmission } from "../job-editor/validation";
import { addSkillSelection } from "../job-editor/skillSelection";
import type { SelectedJobSkill } from "../job-editor/skillSelection";

type JobEditorFormProps = {
  job?: JobPosting;
  initialSkills?: SelectedJobSkill[];
  categories?: CareerCategoryOption[];
  onCancel: () => void;
  onSubmitDraft?: (
    draft: CreateJobDraftInput | UpdateJobInput,
  ) => Promise<void>;
};

const WORK_MODE_LABELS: Record<JobWorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

function JobEditorForm({
  categories = [],
  job,
  initialSkills = [],
  onCancel,
  onSubmitDraft,
}: JobEditorFormProps) {
  const [form, setForm] = useState<CreateJobDraftInput>(() => ({
    title: job?.title ?? "",
    description: job?.description ?? "",
    location: job?.location || undefined,
    workMode: job?.workMode ?? undefined,
    categoryId: job?.categoryId ?? undefined,
    skills: initialSkills.map(({ id, required, weight }) => ({
      skillId: id,
      required,
      weight,
    })),
  }));
  const [selectedSkills, setSelectedSkills] = useState<SelectedJobSkill[]>(() =>
    initialSkills.reduce(
      (skills, skill) => addSkillSelection(skills, skill),
      [] as SelectedJobSkill[],
    ),
  );
  const [errors, setErrors] = useState<JobDraftFieldErrors>({});
  const [submitNotice, setSubmitNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateField<K extends keyof CreateJobDraftInput>(
    name: K,
    value: CreateJobDraftInput[K],
  ) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitNotice("");
    setSubmitError("");
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const submission = prepareJobDraftSubmission(form);
    setErrors(submission.valid ? {} : submission.errors);
    setSubmitNotice("");
    setSubmitError("");

    if (!submission.valid) {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus();
      return;
    }

    if (!onSubmitDraft) {
      setSubmitError("Job saving is unavailable. Please try again later.");
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    try {
      const payload: CreateJobDraftInput | UpdateJobInput = job
        ? {
            ...submission.payload,
            location: submission.payload.location ?? null,
            workMode: submission.payload.workMode ?? null,
            categoryId: submission.payload.categoryId ?? null,
          }
        : submission.payload;
      await onSubmitDraft(payload);
      if (mountedRef.current) setSubmitNotice("Job draft saved successfully.");
    } catch (error) {
      if (mountedRef.current) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : "The job draft could not be saved. Please try again.",
        );
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  const inputClass = (hasError: boolean) =>
    `mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/15 ${hasError ? "border-rose-500" : "border-slate-200"}`;

  function renderError(field: keyof JobDraftFieldErrors) {
    return errors[field] ? (
      <span className="mt-1 block text-sm text-rose-700" id={`${field}-error`}>
        {errors[field]}
      </span>
    ) : null;
  }

  return (
    <Card as="div" className="mt-5">
      <form noValidate onSubmit={submitDraft} ref={formRef}>
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-950">
            {job ? "Edit job draft" : "Create a job draft"}
          </h3>
          <p className="text-sm leading-6 text-slate-600">
            Title and description are required to create a draft. Other fields
            are optional.
          </p>
        </div>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Job title{" "}
            <span aria-hidden="true" className="text-rose-700">
              *
            </span>
            <input
              aria-describedby={errors.title ? "title-error" : undefined}
              aria-invalid={Boolean(errors.title)}
              className={inputClass(Boolean(errors.title))}
              disabled={saving}
              maxLength={255}
              onChange={(event) => updateField("title", event.target.value)}
              required
              value={form.title}
            />
            {renderError("title")}
            <span className="mt-1 block text-xs font-normal text-slate-500">
              3–255 characters
            </span>
          </label>

          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Location{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <input
              aria-describedby={errors.location ? "location-error" : undefined}
              aria-invalid={Boolean(errors.location)}
              className={inputClass(Boolean(errors.location))}
              disabled={saving}
              maxLength={255}
              onChange={(event) => updateField("location", event.target.value)}
              value={form.location ?? ""}
            />
            {renderError("location")}
          </label>

          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Work mode{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <select
              aria-describedby={errors.workMode ? "workMode-error" : undefined}
              aria-invalid={Boolean(errors.workMode)}
              className={inputClass(Boolean(errors.workMode))}
              disabled={saving}
              onChange={(event) =>
                updateField(
                  "workMode",
                  event.target.value
                    ? (event.target.value as JobWorkMode)
                    : undefined,
                )
              }
              value={form.workMode ?? ""}
            >
              <option value="">Choose a work mode</option>
              {JOB_WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {WORK_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
            {renderError("workMode")}
          </label>

          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Career category{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <select
              aria-describedby={
                errors.categoryId ? "categoryId-error" : "category-help"
              }
              aria-invalid={Boolean(errors.categoryId)}
              className={inputClass(Boolean(errors.categoryId))}
              disabled={saving}
              onChange={(event) =>
                updateField("categoryId", event.target.value || undefined)
              }
              value={form.categoryId ?? ""}
            >
              <option value="">No category selected</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {renderError("categoryId")}
            {categories.length === 0 ? (
              <span
                className="mt-1 block text-xs font-normal text-slate-500"
                id="category-help"
              >
                Category choices will appear when the catalog is connected.
              </span>
            ) : null}
          </label>

          <label className="block min-w-0 text-sm font-medium text-slate-700 sm:col-span-2">
            Job description{" "}
            <span aria-hidden="true" className="text-rose-700">
              *
            </span>
            <textarea
              aria-describedby={
                errors.description ? "description-error" : "description-help"
              }
              aria-invalid={Boolean(errors.description)}
              className={`${inputClass(Boolean(errors.description))} min-h-36 resize-y py-3`}
              disabled={saving}
              maxLength={10000}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              required
              value={form.description}
            />
            {renderError("description")}
            <span
              className="mt-1 block text-xs font-normal text-slate-500"
              id="description-help"
            >
              10–10,000 characters
            </span>
          </label>

          <fieldset
            aria-describedby={errors.skills ? "skills-error" : undefined}
            aria-invalid={Boolean(errors.skills)}
            className="min-w-0 rounded-xl border border-slate-200 p-4 sm:col-span-2"
            tabIndex={errors.skills ? -1 : undefined}
          >
            <legend className="px-1 text-sm font-semibold text-slate-800">
              Required skills{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </legend>
            <RequiredSkillSelector
              disabled={saving}
              onChange={(skills) => {
                setSelectedSkills(skills);
                updateField(
                  "skills",
                  skills.map(({ id, required, weight }) => ({
                    skillId: id,
                    required,
                    weight,
                  })),
                );
              }}
              selectedSkills={selectedSkills}
            />
            {renderError("skills")}
          </fieldset>
        </div>

        {submitNotice ? (
          <p
            className="mt-5 rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-900"
            role="status"
          >
            {submitNotice}
          </p>
        ) : null}
        {submitError ? (
          <p
            className="mt-5 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            icon={<X size={16} />}
            onClick={onCancel}
            disabled={saving}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={saving} icon={<Save size={16} />} type="submit">
            {saving ? "Saving..." : "Save draft"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { JobEditorForm };
export type { JobEditorFormProps };
