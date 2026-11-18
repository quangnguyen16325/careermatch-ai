import { Modal } from "../../../components/ui/Modal";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AdminActionDialog } from "../components/AdminActionDialog";
import type { AccountStatus, AdminRole, AdminUser } from "../types";

type UserManagementPageProps = {
  users: AdminUser[];
  onStatusChange: (user: AdminUser, status: AccountStatus) => void;
};

function UserManagementPage({ onStatusChange, users }: UserManagementPageProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AdminRole | "All roles">("All roles");
  const [status, setStatus] = useState<AccountStatus | "All statuses">("All statuses");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (role === "All roles" || user.role === role) &&
    (status === "All statuses" || user.status === status),
  ), [query, role, status, users]);

  function changeStatus(user: AdminUser, nextStatus: AccountStatus) {
    onStatusChange(user, nextStatus);
    setActionUser(null);
    setSelectedUser(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Search accounts, review access, and keep platform membership in good standing." eyebrow="Platform access" title="User management" />
      <Card as="div" padding="sm" className="grid gap-3 sm:grid-cols-3">
        <label className="relative block min-w-0 sm:col-span-1">
          <span className="sr-only">Search by name or email</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" type="search" value={query} />
        </label>
        <label className="block">
          <span className="sr-only">Filter by role</span>
          <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setRole(event.target.value as AdminRole | "All roles")} value={role}>
            {(["All roles", "Student", "Employer", "Admin"] as const).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Filter by account status</span>
          <select className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => setStatus(event.target.value as AccountStatus | "All statuses")} value={status}>
            {(["All statuses", "Active", "Pending", "Suspended"] as const).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold text-slate-950">Accounts</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} of {users.length} users</p></div>
      </div>
      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((user) => <UserRow key={user.id} onAction={() => user.status === "Active" ? setActionUser(user) : changeStatus(user, "Active")} onSelect={() => setSelectedUser(user)} user={user} />)}
        </div>
      ) : (
        <Card className="py-12 text-center"><Users className="mx-auto size-10 text-slate-400" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No accounts found</h3><p className="mt-2 text-sm text-slate-600">Try changing the search text or account filters.</p></Card>
      )}
      {selectedUser ? <UserDetailsDialog onClose={() => setSelectedUser(null)} user={selectedUser} /> : null}
      {actionUser ? (
        <AdminActionDialog
          confirmLabel="Suspend account"
          description={`Suspending ${actionUser.name} removes account access until an administrator reactivates it.`}
          onCancel={() => setActionUser(null)}
          onConfirm={() => changeStatus(actionUser, "Suspended")}
          title="Suspend this account?"
        />
      ) : null}
    </div>
  );
}

function UserRow({ user, onAction, onSelect }: { user: AdminUser; onAction: () => void; onSelect: () => void }) {
  const tone: StatusTone = user.status === "Active" ? "success" : user.status === "Pending" ? "warning" : "danger";
  return (
    <Card as="article" padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">{initials(user.name)}</span>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-950">{user.name}</h3>
          <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <StatusBadge tone={user.role === "Employer" ? "info" : user.role === "Admin" ? "neutral" : "success"}>{user.role}</StatusBadge>
            <StatusBadge tone={tone}>{user.status}</StatusBadge>
            <span>Joined {formatDate(user.registeredAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 sm:flex-none" onClick={onSelect} size="sm" variant="secondary">View details</Button>
        <Button className="flex-1 sm:flex-none" onClick={onAction} size="sm" variant={user.status === "Active" ? "danger" : "secondary"}>
          {user.status === "Active" ? "Suspend" : user.status === "Suspended" ? "Unlock" : "Activate"}
        </Button>
      </div>
    </Card>
  );
}

function UserDetailsDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const tone: StatusTone = user.status === "Active" ? "success" : user.status === "Pending" ? "warning" : "danger";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onClick={onClose}>
      <Modal onClose={onClose} aria-labelledby="user-detail-title" aria-modal="true" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()} role="dialog">
        <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-lg font-semibold text-slate-700">{initials(user.name)}</span>
        <h2 className="mt-4 text-xl font-semibold text-slate-950" id="user-detail-title">{user.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 text-sm">
          <div><dt className="text-xs text-slate-500">Role</dt><dd className="mt-1 font-medium text-slate-800">{user.role}</dd></div>
          <div><dt className="text-xs text-slate-500">Account status</dt><dd className="mt-1"><StatusBadge tone={tone}>{user.status}</StatusBadge></dd></div>
          <div><dt className="text-xs text-slate-500">Registered</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(user.registeredAt)}</dd></div>
          <div><dt className="text-xs text-slate-500">Location</dt><dd className="mt-1 font-medium text-slate-800">{user.location}</dd></div>
        </dl>
        <Button className="mt-5 w-full" onClick={onClose} variant="secondary">Close details</Button>
      </Modal>
    </div>
  );
}

function initials(value: string) { return value.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export { UserManagementPage };
