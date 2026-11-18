import { useMemo, useState } from "react";
import { Building2, Globe2, Mail, Search, Users } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AdminActionDialog } from "../components/AdminActionDialog";
import type { AdminEmployer, VerificationStatus } from "../types";

type EmployerManagementPageProps = {
  employers: AdminEmployer[];
  onStatusChange: (employer: AdminEmployer, status: VerificationStatus, reason?: string) => void;
};

function EmployerManagementPage({ employers, onStatusChange }: EmployerManagementPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VerificationStatus | "All statuses">("All statuses");
  const [selected, setSelected] = useState<AdminEmployer | null>(null);
  const [action, setAction] = useState<{ employer: AdminEmployer; kind: "verify" | "reject" } | null>(null);

  const filtered = useMemo(() => employers.filter((employer) =>
    `${employer.company} ${employer.contactName} ${employer.email}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === "All statuses" || employer.status === status),
  ), [employers, query, status]);

  function updateStatus(employer: AdminEmployer, next: VerificationStatus, reason = "") {
    onStatusChange(employer, next, reason);
    setAction(null);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Review company information and verify employers before they publish opportunities." eyebrow="Trust and safety" title="Employer verification" />
      <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
        <label className="relative block min-w-0">
          <span className="sr-only">Search employers</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search company or contact" type="search" value={query} />
        </label>
        <label className="block"><span className="sr-only">Filter verification status</span>
          <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatus(event.target.value as VerificationStatus | "All statuses")} value={status}>
            {(["All statuses", "Pending", "Verified", "Rejected"] as const).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </Card>
      <div><h2 className="font-semibold text-slate-950">Company profiles</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} of {employers.length} employers</p></div>
      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((employer) => <EmployerRow employer={employer} key={employer.id} onReview={() => setSelected(employer)} onVerify={() => setAction({ employer, kind: "verify" })} onReject={() => setAction({ employer, kind: "reject" })} />)}
        </div>
      ) : (
        <Card className="py-12 text-center"><Building2 className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No employer profiles found</h3><p className="mt-2 text-sm text-slate-600">Try another company name or verification status.</p></Card>
      )}
      {selected ? <EmployerDetailsDialog employer={selected} onClose={() => setSelected(null)} onReject={() => { setSelected(null); setAction({ employer: selected, kind: "reject" }); }} onVerify={() => { setSelected(null); setAction({ employer: selected, kind: "verify" }); }} /> : null}
      {action ? (
        <AdminActionDialog
          confirmLabel={action.kind === "verify" ? "Verify employer" : "Reject verification"}
          description={action.kind === "verify" ? `Confirm that ${action.employer.company} has supplied enough information to verify this company.` : `Reject ${action.employer.company}'s verification request. Add a reason that can guide their next step.`}
          onCancel={() => setAction(null)}
          onConfirm={(reason) => updateStatus(action.employer, action.kind === "verify" ? "Verified" : "Rejected", reason)}
          reasonLabel="Verification decision reason"
          reasonPlaceholder="Explain what information is missing or could not be verified..."
          requireReason={action.kind === "reject"}
          title={action.kind === "verify" ? "Verify this employer?" : "Reject this verification?"}
          tone={action.kind === "verify" ? "primary" : "danger"}
        />
      ) : null}
    </div>
  );
}

function EmployerRow({ employer, onReview, onVerify, onReject }: { employer: AdminEmployer; onReview: () => void; onVerify: () => void; onReject: () => void }) {
  const tone: StatusTone = employer.status === "Verified" ? "success" : employer.status === "Pending" ? "warning" : "danger";
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-50 text-emerald-800">
          {employer.logoUrl ? <img alt={`${employer.company} logo`} className="size-full object-cover" src={employer.logoUrl} /> : <CompanyInitials name={employer.company} />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{employer.company}</h3><StatusBadge tone={tone}>{employer.status}</StatusBadge></div>
          <p className="mt-1 text-sm text-slate-600">{employer.industry} <span aria-hidden="true">·</span> {employer.size}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{employer.contactName} <span aria-hidden="true">·</span> {employer.email}</p>
          <p className="mt-1 text-xs text-slate-400">Registered {formatDate(employer.registeredAt)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="flex-1 sm:flex-none" onClick={onReview} size="sm" variant="secondary">View profile</Button>
        {employer.status === "Pending" ? <>
          <Button className="flex-1 sm:flex-none" onClick={onVerify} size="sm">Verify</Button>
          <Button className="flex-1 sm:flex-none" onClick={onReject} size="sm" variant="danger">Reject</Button>
        </> : null}
      </div>
    </Card>
  );
}

function EmployerDetailsDialog({ employer, onClose, onReject, onVerify }: { employer: AdminEmployer; onClose: () => void; onReject: () => void; onVerify: () => void }) {
  const tone: StatusTone = employer.status === "Verified" ? "success" : employer.status === "Pending" ? "warning" : "danger";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onClick={onClose}>
      <section aria-labelledby="employer-detail-title" aria-modal="true" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-50 text-emerald-800">{employer.logoUrl ? <img alt={`${employer.company} logo`} className="size-full object-cover" src={employer.logoUrl} /> : <CompanyInitials name={employer.company} />}</span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold text-slate-950" id="employer-detail-title">{employer.company}</h2><StatusBadge tone={tone}>{employer.status}</StatusBadge></div><p className="mt-1 text-sm text-slate-600">{employer.industry} · {employer.size}</p></div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">{employer.description}</p>
        {employer.verificationNote ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Previous verification note: {employer.verificationNote}</p> : null}
        <dl className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <Detail icon={<Users />} label="Company contact" value={employer.contactName} />
          <Detail icon={<Mail />} label="Contact email" value={employer.email} href={`mailto:${employer.email}`} />
          <Detail icon={<Globe2 />} label="Website" value={employer.website} href={employer.website} />
          <Detail icon={<Building2 />} label="Registered" value={formatDate(employer.registeredAt)} />
        </dl>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Close</Button>
          {employer.status === "Pending" ? <>
            <Button onClick={onReject} variant="danger">Reject</Button>
            <Button onClick={onVerify}>Verify employer</Button>
          </> : null}
        </div>
      </section>
    </div>
  );
}

function Detail({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return <div className="flex min-w-0 gap-2"><span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">{icon}</span><div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{href ? <a className="underline decoration-slate-300 underline-offset-2 hover:text-emerald-700" href={href} rel={href.startsWith("http") ? "noreferrer" : undefined} target={href.startsWith("http") ? "_blank" : undefined}>{value}</a> : value}</dd></div></div>;
}

function CompanyInitials({ name }: { name: string }) { return <span className="text-sm font-bold">{name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export { EmployerManagementPage };
