import { useState, type ReactNode } from "react";
import { Building2, Globe2, MapPin, Pencil } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  StatusBadge,
  type StatusTone,
} from "../../../components/ui/StatusBadge";
import {
  getCompanyApiFailurePresentation,
  type CompanyApiFailure,
  getCompanyVerificationLabel,
  type CompanyApiProfile,
  type CreateCompanyRequest,
  type UpdateCompanyRequest,
} from "../companyApi";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { FeedbackMessage } from "./FeedbackMessage";

type CompanyProfileSectionProps = {
  initialProfile: CompanyApiProfile | null;
  loading?: boolean;
  error?: string;
  apiFailure?: CompanyApiFailure | null;
  onSave: (
    request: CreateCompanyRequest | UpdateCompanyRequest,
    mode: "create" | "update",
  ) => void;
};

function CompanyProfileSection({
  error,
  apiFailure = null,
  initialProfile,
  loading = false,
  onSave,
}: CompanyProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const apiFailurePresentation = apiFailure
    ? getCompanyApiFailurePresentation(apiFailure)
    : null;

  function saveProfile(
    request: CreateCompanyRequest | UpdateCompanyRequest,
    mode: "create" | "update",
  ) {
    onSave(request, mode);
    setEditing(false);
    setNotice(
      "Changes are saved in this local preview only. No Company API request was sent.",
    );
  }

  const statusTone: Record<
    CompanyApiProfile["verificationStatus"],
    StatusTone
  > = {
    PENDING: "warning",
    VERIFIED: "success",
    REJECTED: "danger",
  };

  return (
    <section aria-labelledby="company-profile-heading" className="space-y-5">
      <PageHeader
        actions={
          !editing && initialProfile ? (
            <Button
              onClick={() => {
                setEditing(true);
                setNotice("");
              }}
              variant="secondary"
              icon={<Pencil size={16} />}
            >
              Edit profile
            </Button>
          ) : undefined
        }
        description="Manage the company information supported by the current profile contract."
        eyebrow="Employer workspace"
        title="Company profile"
      />
      <h2 className="sr-only" id="company-profile-heading">
        Company profile details
      </h2>
      {notice ? (
        <FeedbackMessage tone="success">{notice}</FeedbackMessage>
      ) : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}
      {!editing && apiFailurePresentation ? (
        <FeedbackMessage tone="error">
          {apiFailurePresentation.message}
        </FeedbackMessage>
      ) : null}
      {loading ? (
        <FeedbackMessage tone="loading">
          Loading company profile…
        </FeedbackMessage>
      ) : null}
      {!loading && !error && editing ? (
        <CompanyProfileForm
          apiFailure={apiFailure}
          mode={initialProfile ? "update" : "create"}
          onCancel={() => setEditing(false)}
          onSave={saveProfile}
          profile={initialProfile}
        />
      ) : null}
      {!loading && !error && initialProfile && !editing ? (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Building2 aria-hidden="true" size={21} />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-xl font-semibold text-slate-950 sm:text-2xl">
                    {initialProfile.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Company ID: {initialProfile.id}
                  </p>
                </div>
              </div>
              <StatusBadge
                aria-label={`Company verification status: ${getCompanyVerificationLabel(initialProfile.verificationStatus)}`}
                tone={statusTone[initialProfile.verificationStatus]}
              >
                {getCompanyVerificationLabel(initialProfile.verificationStatus)}
              </StatusBadge>
            </div>
            <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <Detail
                icon={<MapPin />}
                label="Location"
                value={initialProfile.location}
              />
              <Detail
                icon={<Globe2 />}
                label="Website"
                value={initialProfile.website}
                href={initialProfile.website}
              />
              <Detail label="Tax code" value={initialProfile.taxCode} />
              <Detail label="Description" value={initialProfile.description} />
            </dl>
          </Card>
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            Logo, cover image, contact email, phone, industry, and company size
            are not supported by the current Company API. They are not shown as
            saved profile data.
          </p>
        </div>
      ) : null}
      {!loading && !error && !initialProfile && !editing ? (
        <Card className="py-12 text-center">
          <Building2
            className="mx-auto size-10 text-slate-400"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">
            No company profile yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Create a preview profile using fields supported by the current
            Company API contract.
          </p>
          <Button
            className="mt-5"
            onClick={() => {
              setEditing(true);
              setNotice("");
            }}
            icon={<Pencil size={16} />}
          >
            Create company profile
          </Button>
        </Card>
      ) : null}
    </section>
  );
}

function Detail({
  icon,
  label,
  value,
  href,
}: {
  icon?: ReactNode;
  label: string;
  value: string | null;
  href?: string | null;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      {icon ? (
        <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-sm text-slate-800">
          {href && value ? (
            <a
              className="underline decoration-slate-300 underline-offset-2 hover:text-emerald-700"
              href={href}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              target={href.startsWith("http") ? "_blank" : undefined}
            >
              {value}
            </a>
          ) : (
            value || "Not provided"
          )}
        </dd>
      </div>
    </div>
  );
}

export { CompanyProfileSection };
