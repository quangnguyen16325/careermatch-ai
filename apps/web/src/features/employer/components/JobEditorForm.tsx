import { useState } from "react";
import { Save, Send, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { EmploymentType, JobPosting, JobStatus } from "../types";
import { FeedbackMessage } from "./FeedbackMessage";

type JobEditorFormProps = {
  job?: JobPosting;
  onCancel: () => void;
  onSave: (job: Omit<JobPosting, "id" | "status">, status: JobStatus) => void;
};

type JobField = keyof Omit<JobPosting, "id" | "status">;

const blankJob: Omit<JobPosting, "id" | "status"> = {
  title: "",
  department: "",
  location: "",
  employmentType: "Full-time",
  salary: "",
  deadline: "",
  description: "",
  requirements: "",
  benefits: "",
};

const requiredFields: { name: JobField; label: string }[] = [
  { name: "title", label: "Job title" },
  { name: "department", label: "Department" },
  { name: "location", label: "Location" },
  { name: "salary", label: "Salary range" },
  { name: "description", label: "Job description" },
  { name: "requirements", label: "Requirements" },
  { name: "deadline", label: "Application deadline" },
];

function JobEditorForm({ job, onCancel, onSave }: JobEditorFormProps) {
  const [form, setForm] = useState<Omit<JobPosting, "id" | "status">>(() => {
    if (!job) return blankJob;
    return {
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      salary: job.salary,
      deadline: job.deadline,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
    };
  });
  const [errors, setErrors] = useState<Partial<Record<JobField, string>>>({});
  const [formError, setFormError] = useState("");

  function updateField<K extends JobField>(name: K, value: Omit<JobPosting, "id" | "status">[K]) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  }

  function save(status: JobStatus) {
    const nextErrors: Partial<Record<JobField, string>> = {};

    if (status === "Published") {
      for (const field of requiredFields) {
        if (!String(form[field.name]).trim()) nextErrors[field.name] = `${field.label} is required to publish.`;
      }
      if (form.deadline && form.deadline < new Date().toISOString().slice(0, 10)) {
        nextErrors.deadline = "Choose a deadline today or later.";
      }
      if (form.description.trim().length < 30) {
        nextErrors.description = "Add at least 30 characters so candidates understand the role.";
      }
    } else if (!form.title.trim()) {
      nextErrors.title = "Add a job title before saving a draft.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setFormError(status === "Published" ? "Review the highlighted fields before publishing." : "A job title is required before saving this draft.");
      return;
    }
    onSave(form, status);
  }

  const inputClass = (name: JobField) =>
    `mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${errors[name] ? "border-rose-400" : "border-slate-200"}`;

  function renderInput(name: JobField, label: string, required = false, type = "text") {
    return (
      <label className="block text-sm font-medium text-slate-700" key={name}>
        {label}{required ? <span className="text-rose-600"> *</span> : null}
        <input
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          className={inputClass(name)}
          onChange={(event) => updateField(name, event.target.value)}
          placeholder={label}
          required={required}
          type={type}
          value={String(form[name])}
        />
        {errors[name] ? <span className="mt-1 block text-xs text-rose-700" id={`${name}-error`}>{errors[name]}</span> : null}
      </label>
    );
  }

  return (
    <Card as="div" className="mt-5">
      <form noValidate onSubmit={(event) => { event.preventDefault(); save("Published"); }}>
        <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-950">{job ? "Edit job posting" : "Create a job posting"}</h3>
          <p className="text-sm text-slate-600">Fields marked with * are needed to publish. Save a draft with just a job title.</p>
        </div>
        {formError ? <div className="mb-5"><FeedbackMessage tone="error">{formError}</FeedbackMessage></div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput("title", "Job title", true)}
          {renderInput("department", "Department", true)}
          {renderInput("location", "Location", true)}
          <label className="block text-sm font-medium text-slate-700">
            Employment type <span className="text-rose-600">*</span>
            <select className={inputClass("employmentType")} onChange={(event) => updateField("employmentType", event.target.value as EmploymentType)} value={form.employmentType}>
              {(["Full-time", "Part-time", "Contract", "Internship"] satisfies EmploymentType[]).map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          {renderInput("salary", "Salary range", true)}
          {renderInput("deadline", "Application deadline", true, "date")}
          {(["description", "requirements", "benefits"] as const).map((name) => {
            const label = name === "description" ? "Job description" : name === "requirements" ? "Requirements" : "Benefits";
            return (
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2" key={name}>
                {label}{name !== "benefits" ? <span className="text-rose-600"> *</span> : null}
                <textarea
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  className={`${inputClass(name)} min-h-28 resize-y py-3`}
                  maxLength={name === "description" ? 5000 : 2500}
                  onChange={(event) => updateField(name, event.target.value)}
                  placeholder={name === "description" ? "Describe the role, team, and impact…" : name === "requirements" ? "List the skills and experience needed…" : "Share compensation, learning, and other benefits…"}
                  value={form[name]}
                />
                {errors[name] ? <span className="mt-1 block text-xs text-rose-700" id={`${name}-error`}>{errors[name]}</span> : null}
              </label>
            );
          })}
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={onCancel} type="button" variant="ghost" icon={<X size={16} />}>Cancel</Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button onClick={() => save("Draft")} type="button" variant="secondary" icon={<Save size={16} />}>Save draft</Button>
            <Button type="submit" icon={<Send size={16} />}>{job ? "Save & publish" : "Publish job"}</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

export { JobEditorForm };
