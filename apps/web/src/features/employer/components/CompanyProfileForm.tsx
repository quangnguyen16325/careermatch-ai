import { useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { FeedbackMessage } from "./FeedbackMessage";
import { CompanyVerificationStatus } from "./CompanyVerificationStatus";
import {
  getCompanyApiFailurePresentation,
  hasCompanyProfileChanges,
  toCompanyProfileRequest,
  validateCompanyProfileForm,
  type CompanyApiFailure,
  type CompanyApiProfile,
  type CompanyProfileFieldErrors,
  type CompanyProfileFormValues,
  type CreateCompanyRequest,
  type UpdateCompanyRequest,
} from "../companyApi";

type CompanyProfileFormProps = {
  profile: CompanyApiProfile | null;
  mode: "create" | "update";
  saving?: boolean;
  apiFailure?: CompanyApiFailure | null;
  onCancel: () => void;
  onSave: (
    request: CreateCompanyRequest | UpdateCompanyRequest,
    mode: "create" | "update",
  ) => Promise<boolean>;
};

const emptyValues: CompanyProfileFormValues = {
  name: "",
  description: "",
  website: "",
  location: "",
  taxCode: "",
};

function getFormValues(
  profile: CompanyApiProfile | null,
): CompanyProfileFormValues {
  if (!profile) return emptyValues;
  return {
    name: profile.name,
    description: profile.description ?? "",
    website: profile.website ?? "",
    location: profile.location ?? "",
    taxCode: profile.taxCode ?? "",
  };
}

const fields: {
  name: keyof CompanyProfileFormValues;
  label: string;
  maxLength: number;
  minLength?: number;
}[] = [
  { name: "name", label: "Company name", minLength: 2, maxLength: 255 },
  { name: "website", label: "Website", maxLength: 255 },
  { name: "location", label: "Location", maxLength: 255 },
  { name: "taxCode", label: "Tax code", minLength: 6, maxLength: 50 },
];

function CompanyProfileForm({
  profile,
  mode,
  saving = false,
  apiFailure = null,
  onCancel,
  onSave,
}: CompanyProfileFormProps) {
  const initialValues = getFormValues(profile);
  const [form, setForm] = useState(initialValues);
  const [validationErrors, setValidationErrors] =
    useState<CompanyProfileFieldErrors>({});
  const [dismissedApiFields, setDismissedApiFields] = useState<
    Set<keyof CompanyProfileFormValues>
  >(() => new Set());
  const [dismissedApiValidation, setDismissedApiValidation] = useState(false);
  const isDirty = hasCompanyProfileChanges(form, initialValues);
  const apiFailurePresentation = apiFailure
    ? getCompanyApiFailurePresentation(apiFailure)
    : null;

  function getFieldError(field: keyof CompanyProfileFormValues) {
    return (
      validationErrors[field] ??
      (dismissedApiFields.has(field)
        ? undefined
        : apiFailurePresentation?.fieldErrors[field])
    );
  }

  function updateField(name: keyof CompanyProfileFormValues, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setValidationErrors((current) => ({ ...current, [name]: undefined }));
    setDismissedApiFields((current) => new Set(current).add(name));
    if (apiFailure?.status === 400) setDismissedApiValidation(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCompanyProfileForm(mode, form);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSave(toCompanyProfileRequest(mode, form), mode);
  }

  const inputClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

  return (
    <Card as="div" className="mt-5">
      <form
        aria-busy={saving}
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit}
      >
        {saving ? (
          <FeedbackMessage tone="loading">
            Saving company profile…
          </FeedbackMessage>
        ) : null}
        {apiFailurePresentation && !dismissedApiValidation ? (
          <FeedbackMessage tone="error">
            {apiFailurePresentation.message}
          </FeedbackMessage>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">
              {mode === "create"
                ? "Create company profile"
                : "Edit company profile"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Only fields in the current Company API contract are editable here.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile ? (
              <CompanyVerificationStatus compact status={profile.verificationStatus} />
            ) : null}
            {isDirty ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Unsaved changes
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const required = field.name === "name" && mode === "create";
            const fieldError = getFieldError(field.name);
            return (
              <label
                className="block text-sm font-medium text-slate-700"
                key={field.name}
              >
                {field.label}
                {required ? (
                  <span aria-hidden="true" className="text-rose-600">
                    {" "}
                    *
                  </span>
                ) : null}
                <input
                  aria-describedby={
                    fieldError ? `${field.name}-error` : undefined
                  }
                  aria-invalid={Boolean(fieldError)}
                  autoComplete="off"
                  className={inputClass}
                  disabled={saving}
                  maxLength={field.maxLength}
                  minLength={field.minLength}
                  onChange={(event) =>
                    updateField(field.name, event.target.value)
                  }
                  required={required}
                  type="text"
                  value={form[field.name]}
                />
                {fieldError ? (
                  <span
                    className="mt-1 block text-xs text-rose-700"
                    id={`${field.name}-error`}
                    role="alert"
                  >
                    {fieldError}
                  </span>
                ) : null}
                {field.name === "name" ? (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Required when creating a profile; 2–255 characters.
                  </span>
                ) : field.name === "taxCode" ? (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Optional; if provided, use 6–50 characters.
                  </span>
                ) : null}
              </label>
            );
          })}
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Company description
            {getFieldError("description") ? (
              <span
                className="mt-1 block text-xs text-rose-700"
                id="description-error"
                role="alert"
              >
                {getFieldError("description")}
              </span>
            ) : null}
            <textarea
              aria-describedby={
                getFieldError("description") ? "description-error" : undefined
              }
              aria-invalid={Boolean(getFieldError("description"))}
              className={`${inputClass} min-h-32 resize-y py-3`}
              disabled={saving}
              maxLength={5000}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              value={form.description}
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">
              {form.description.length}/5000 characters
            </span>
          </label>
        </div>

        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          Logo, cover image, contact email, phone, industry, and company size
          are not supported by the current Company API and are not included in
          this form.
        </p>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            onClick={onCancel}
            disabled={saving}
            type="button"
            variant="secondary"
            icon={<X size={16} />}
          >
            Cancel and discard
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={saving}
            type="submit"
            icon={<Save size={16} />}
          >
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create profile"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { CompanyProfileForm };
