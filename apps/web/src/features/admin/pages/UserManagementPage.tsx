import { Modal } from "../../../components/ui/Modal";
import { useMemo, useState } from "react";
import { MapPin, RotateCcw, Search, Users } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import { AccountActionDialog } from "../components/AccountActionDialog";
import { canPerformAccountAction, filterAccounts } from "../accounts/accountManagement";
import type { AccountAction } from "../accounts/types";
import type { AccountStatus, AdminRole, AdminUser } from "../types";

type UserManagementPageProps = {
  users: AdminUser[];
  onStatusChange: (user: AdminUser, status: AccountStatus, reason: string) => void | Promise<void>;
};

function UserManagementPage({ onStatusChange, users }: UserManagementPageProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AdminRole | "All roles">("All roles");
  const [status, setStatus] = useState<AccountStatus | "All statuses">("All statuses");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [action, setAction] = useState<AccountAction | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const filtered = useMemo(
    () => filterAccounts(users, { keyword: query, role, status }),
    [query, role, status, users],
  );
  const hasFilters = Boolean(query.trim()) || role !== "All roles" || status !== "All statuses";

  function resetFilters() {
    setQuery("");
    setRole("All roles");
    setStatus("All statuses");
    setAnnouncement(`Filters cleared. Showing all ${users.length} ${users.length === 1 ? "account" : "accounts"}.`);
  }

  async function changeStatus(user: AdminUser, selectedAction: AccountAction, reason: string) {
    const currentUser = users.find((account) => account.id === user.id);
    if (!currentUser || !canPerformAccountAction(currentUser.status, selectedAction)) {
      throw new Error("The account status changed before the action could be applied.");
    }
    const nextStatus: AccountStatus = selectedAction === "lock" ? "Suspended" : "Active";
    await onStatusChange(currentUser, nextStatus, reason);
    setActionUser(null);
    setAction(null);
    setSelectedUser(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Search accounts, review access, and keep platform membership in good standing." eyebrow="Platform access" title="User management" />
      <Card as="div" padding="sm" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <label className="relative block min-w-0 md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search by name or email</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input aria-label="Search accounts by name or email" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => { setQuery(event.target.value); setAnnouncement(""); }} placeholder="Search name or email" type="search" value={query} />
        </label>
        <label className="block">
          <span className="sr-only">Filter by role</span>
          <select aria-label="Filter accounts by role" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => { setRole(event.target.value as AdminRole | "All roles"); setAnnouncement(""); }} value={role}>
            {(["All roles", "Student", "Employer", "Admin"] as const).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Filter by account status</span>
          <select aria-label="Filter accounts by status" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" onChange={(event) => { setStatus(event.target.value as AccountStatus | "All statuses"); setAnnouncement(""); }} value={status}>
            {(["All statuses", "Active", "Pending", "Suspended"] as const).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="flex justify-end md:col-span-2 xl:col-span-1">
          <Button aria-label="Reset account search and filters" className="w-full md:w-auto" icon={<RotateCcw aria-hidden="true" size={16} />} onClick={resetFilters} variant="secondary">
            Reset filters
          </Button>
        </div>
      </Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">Accounts</h2>
          <p aria-live="polite" className="mt-1 text-sm text-slate-500">Showing {filtered.length} of {users.length} {users.length === 1 ? "account" : "accounts"}</p>
        </div>
      </div>
      {announcement ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{announcement}</p> : null}
      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((user) => <UserRow key={user.id} onAction={() => { if (user.status === "Active") { setAction("lock"); setActionUser(user); } else if (user.status === "Suspended") { setAction("unlock"); setActionUser(user); } }} onSelect={() => setSelectedUser(user)} user={user} />)}
        </div>
      ) : (
        <Card className="py-12 text-center">
          <Users className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{users.length ? "No matching accounts" : "No accounts available"}</h3>
          <p className="mt-2 text-sm text-slate-600">{users.length ? "Try changing the search text or account filters." : "There are no accounts to display."}</p>
          {users.length > 0 && hasFilters ? <Button className="mt-4" onClick={resetFilters} variant="secondary">Reset filters</Button> : null}
        </Card>
      )}
      {selectedUser ? <UserDetailsDialog onClose={() => setSelectedUser(null)} user={selectedUser} /> : null}
      {actionUser && action ? (
        <AccountActionDialog
          action={action}
          onCancel={() => { setActionUser(null); setAction(null); }}
          onConfirm={(reason) => changeStatus(actionUser, action, reason)}
          user={actionUser}
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
            <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} />{user.location}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 sm:flex-none" onClick={onSelect} size="sm" variant="secondary">View details</Button>
        <Button aria-label={user.status === "Pending" ? `No lock action available for pending account ${user.name}` : `${user.status === "Active" ? "Lock" : "Unlock"} account ${user.name}`} className="flex-1 sm:flex-none" disabled={user.status === "Pending"} onClick={onAction} size="sm" variant={user.status === "Active" ? "danger" : "secondary"}>
          {user.status === "Active" ? "Lock" : user.status === "Suspended" ? "Unlock" : "Pending"}
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
