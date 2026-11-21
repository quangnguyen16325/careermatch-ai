import { useRef, useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { JobPosting } from "../types";
import {
  JOB_WORK_MODES,
  type CareerCategoryOption,
  type CreateJobDraftInput,
  type JobDraftFieldErrors,
  type JobWorkMode,
} from "../job-editor/types";
import { prepareJobDraftSubmission } from "../job-editor/validation";

type JobEditorFormProps = {
  job?: JobPosting;
  categories?: CareerCategoryOption[];
  onCancel: () => void;
  onSubmitDraft?: (draft: CreateJobDraftInput) => void;
};

const EMPTY_DRAFT: CreateJobDraftInput = {
  title: "",
  description: "",
  skills: [],
};

const WORK_MODE_LABELS: Record<JobWorkMode, string> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

function JobEditorForm({
  categories = [],
  job,
  onCancel,
  onSubmitDraft,
}: JobEditorFormProps) {
  const [form, setForm] = useState<CreateJobDraftInput>(() =>
    job
      ? {
          title: job.title,
          description: job.description,
          location: job.location || undefined,
          skills: [],
        }
      : EMPTY_DRAFT,
  );
  const [errors, setErrors] = useState<JobDraftFieldErrors>({});
  const [submitNotice, setSubmitNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function updateField<K extends keyof CreateJobDraftInput>(
    name: K,
    value: CreateJobDraftInput[K],
  ) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitNotice("");
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submission = prepareJobDraftSubmission(form);
    setErrors(submission.valid ? {} : submission.errors);
    setSubmitNotice("");

    if (!submission.valid) {
      formRef.current
        ?.querySelector<HTMLElement>("[aria-invalid='true']")
        ?.focus();
      return;
    }

    onSubmitDraft?.(submission.payload);
    setSubmitNotice(
      onSubmitDraft
        ? "Draft passed validation and was sent to the submission handler. No server save is confirmed."
        : "Draft passed validation, but has not been saved. API integration is coming in a later step.",
    );
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
              className={inputClass(false)}
              maxLength={255}
              onChange={(event) => updateField("location", event.target.value)}
              value={form.location ?? ""}
            />
          </label>

          <label className="block min-w-0 text-sm font-medium text-slate-700">
            Work mode{" "}
            <span className="font-normal text-slate-500">(optional)</span>
            <select
              className={inputClass(false)}
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

          <fieldset className="min-w-0 rounded-xl border border-slate-200 p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold text-slate-800">
              Required skills{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </legend>
            <div
              aria-label="Required skills selector"
              className="rounded-lg bg-slate-50 p-4"
              role="group"
            >
              <p className="text-sm font-medium text-slate-700">
                Skill selection is not connected yet.
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The skill catalog selector will be added in the next step. No
                skills are included in this draft yet.
              </p>
            </div>
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

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            icon={<X size={16} />}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button icon={<Save size={16} />} type="submit">
            Save draft
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { JobEditorForm };
export type { JobEditorFormProps };
