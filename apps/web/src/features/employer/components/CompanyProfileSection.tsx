import { useState, type ReactNode } from "react";
import { Building2, Globe2, Mail, MapPin, Pencil, Phone, Users } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { CompanyProfile } from "../types";
import { emptyCompanyProfile } from "../data/mockEmployerData";
import { CompanyProfileForm } from "./CompanyProfileForm";
import { FeedbackMessage } from "./FeedbackMessage";

type CompanyProfileSectionProps = {
  initialProfile: CompanyProfile | null;
  loading?: boolean;
  error?: string;
  onSave: (profile: CompanyProfile) => void;
};

function CompanyProfileSection({
  error,
  initialProfile,
  loading = false,
  onSave,
}: CompanyProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  function saveProfile(profile: CompanyProfile) {
    onSave(profile);
    setEditing(false);
    setNotice("Company profile saved in this preview.");
  }

  return (
    <section aria-labelledby="company-profile-heading" className="space-y-5">
      <PageHeader
        actions={initialProfile && !editing ? (
          <Button onClick={() => { setEditing(true); setNotice(""); }} variant="secondary" icon={<Pencil size={16} />}>
            Edit profile
          </Button>
        ) : undefined}
        description="Keep your company information up to date so candidates know who they will be working with."
        eyebrow="Employer workspace"
        title="Company profile"
      />
      <h2 className="sr-only" id="company-profile-heading">Company profile details</h2>
      {notice ? <FeedbackMessage tone="success">{notice}</FeedbackMessage> : null}
      {error ? <FeedbackMessage tone="error">{error}</FeedbackMessage> : null}
      {loading ? <FeedbackMessage tone="loading">Loading company profile…</FeedbackMessage> : null}
      {!loading && !error && editing ? (
        <CompanyProfileForm profile={initialProfile ?? emptyCompanyProfile} onCancel={() => setEditing(false)} onSave={saveProfile} />
      ) : null}
      {!loading && !error && !editing && initialProfile ? (
        <div className="space-y-5">
          <Card as="div" padding="sm" className="overflow-hidden !p-0">
            <div className="relative h-32 bg-gradient-to-r from-emerald-100 via-teal-50 to-sky-100 sm:h-44">
              {initialProfile.coverUrl ? (
                <img alt="Company cover" className="size-full object-cover" src={initialProfile.coverUrl} />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(16,185,129,.28),transparent_34%),radial-gradient(circle_at_18%_8%,rgba(14,165,233,.2),transparent_29%)]" />
              )}
              <div className="absolute -bottom-8 left-5 grid size-16 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-emerald-400 text-slate-950 shadow-sm sm:left-8 sm:size-20">
                {initialProfile.logoUrl ? (
                  <img alt={`${initialProfile.name} logo`} className="size-full object-cover" src={initialProfile.logoUrl} />
                ) : <Building2 className="size-8" aria-hidden="true" />}
              </div>
            </div>
            <div className="flex flex-col gap-4 px-5 pb-5 pt-12 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pb-7 sm:pt-12">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-slate-950 sm:text-2xl">{initialProfile.name}</h3>
                  <StatusBadge tone="warning">Verification pending</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-slate-600">{initialProfile.industry} <span aria-hidden="true">·</span> {initialProfile.size}</p>
              </div>
            </div>
          </Card>
          <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
            <Card>
              <h3 className="text-base font-semibold text-slate-950">About us</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{initialProfile.description || "Add a short introduction to help candidates get to know your team."}</p>
            </Card>
            <Card>
              <h3 className="text-base font-semibold text-slate-950">Company details</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <Detail icon={<MapPin />} label="Location" value={initialProfile.address} />
                <Detail icon={<Globe2 />} label="Website" value={initialProfile.website} href={initialProfile.website} />
                <Detail icon={<Mail />} label="Contact email" value={initialProfile.contactEmail} href={`mailto:${initialProfile.contactEmail}`} />
                <Detail icon={<Phone />} label="Phone" value={initialProfile.phone} />
                <Detail icon={<Users />} label="Company size" value={initialProfile.size} />
              </dl>
            </Card>
          </div>
        </div>
      ) : null}
      {!loading && !error && !initialProfile ? (
        <Card className="py-12 text-center">
          <Building2 className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">Add your company profile</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Share a few details about your organization to help candidates make an informed decision.</p>
          <Button className="mt-5" onClick={() => setEditing(true)} icon={<Pencil size={16} />}>Create profile</Button>
        </Card>
      ) : null}
    </section>
  );
}

function Detail({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-slate-800">{href ? <a className="underline decoration-slate-300 underline-offset-2 hover:text-emerald-700" href={href} rel={href.startsWith("http") ? "noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>{value}</a> : value}</dd>
      </div>
    </div>
  );
}

export { CompanyProfileSection };
