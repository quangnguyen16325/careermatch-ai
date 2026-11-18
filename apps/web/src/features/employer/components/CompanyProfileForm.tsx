import { useState, type FormEvent } from "react";
import { Save, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import type { CompanyProfile } from "../types";

type CompanyProfileFormProps = {
  profile: CompanyProfile;
  onCancel: () => void;
  onSave: (profile: CompanyProfile) => void;
};

type ProfileField = keyof CompanyProfile;

const fields: { name: ProfileField; label: string; type?: string; required?: boolean }[] = [
  { name: "name", label: "Company name", required: true },
  { name: "website", label: "Website", type: "url" },
  { name: "contactEmail", label: "Contact email", type: "email", required: true },
  { name: "phone", label: "Phone number", type: "tel" },
  { name: "address", label: "Office address", required: true },
  { name: "industry", label: "Industry", required: true },
  { name: "size", label: "Company size", required: true },
];

function CompanyProfileForm({ profile, onCancel, onSave }: CompanyProfileFormProps) {
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});

  function updateField(name: ProfileField, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Partial<Record<ProfileField, string>> = {};
    for (const field of fields) {
      const value = form[field.name].trim();
      if (field.required && !value) nextErrors[field.name] = `${field.label} is required.`;
    }
    if (
      form.website.trim() &&
      !/^https?:\/\/.+\..+/.test(form.website.trim())
    ) {
      nextErrors.website = "Enter a valid website URL, including https://.";
    }
    if (
      form.contactEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())
    ) {
      nextErrors.contactEmail = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave({ ...form, description: form.description.trim() });
    }
  }

  const inputClass = (name: ProfileField) =>
    `mt-1.5 min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${errors[name] ? "border-rose-400" : "border-slate-200"}`;

  return (
    <Card as="div" className="mt-5">
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label className="block text-sm font-medium text-slate-700" key={field.name}>
              {field.label}{field.required ? <span className="text-rose-600"> *</span> : null}
              <input
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                className={inputClass(field.name)}
                onChange={(event) => updateField(field.name, event.target.value)}
                placeholder={field.label}
                required={field.required}
                type={field.type ?? "text"}
                value={form[field.name]}
              />
              {errors[field.name] ? (
                <span className="mt-1 block text-xs text-rose-700" id={`${field.name}-error`}>
                  {errors[field.name]}
                </span>
              ) : null}
            </label>
          ))}
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Company description
            <textarea
              className={`${inputClass("description")} min-h-28 resize-y py-3`}
              maxLength={600}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Tell candidates what your company does and what makes it a great place to work."
              value={form.description}
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">
              {form.description.length}/600 characters
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700">
              Logo image URL
              <input className={inputClass("logoUrl")} onChange={(event) => updateField("logoUrl", event.target.value)} placeholder="https://example.com/logo.png" type="url" value={form.logoUrl} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Cover image URL
              <input className={inputClass("coverUrl")} onChange={(event) => updateField("coverUrl", event.target.value)} placeholder="https://example.com/cover.jpg" type="url" value={form.coverUrl} />
            </label>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} type="button" variant="secondary" icon={<X size={16} />}>
            Cancel
          </Button>
          <Button type="submit" icon={<Save size={16} />}>
            Save company profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { CompanyProfileForm };
