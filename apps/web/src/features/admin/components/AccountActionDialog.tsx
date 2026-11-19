import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { canPerformAccountAction, validateAccountActionReason } from "../accounts/accountManagement";
import type { AccountAction } from "../accounts/types";
import type { AdminUser } from "../types";

type AccountActionDialogProps = {
  action: AccountAction;
  user: AdminUser;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

function AccountActionDialog({ action, onCancel, onConfirm, user }: AccountActionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const actionLabel = action === "lock" ? "Lock" : "Unlock";

  async function confirm() {
    if (submitting) return;
    if (!canPerformAccountAction(user.status, action)) {
      setError(`This account is already ${user.status.toLowerCase()}. Refresh the list before trying again.`);
      return;
    }

    const validation = validateAccountActionReason(reason);
    if (!validation.valid) {
      setError("Enter a reason to continue.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onConfirm(validation.value);
    } catch {
      setError("The demo action could not be applied. The account list was not updated.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      aria-labelledby="account-action-title"
      aria-modal="true"
      className="w-[calc(100%-2rem)] max-h-[92dvh] max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6 [&::backdrop]:bg-slate-950/50"
      onClose={() => { if (!submitting) onCancel(); }}
      role="alertdialog"
    >
      <h2 className="text-lg font-semibold text-slate-950" id="account-action-title">{actionLabel} account?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {actionLabel} access for <span className="font-semibold text-slate-800">{user.name}</span> ({user.email})?
      </p>
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Demo only: this updates the local preview and does not change a real account.
      </p>
      <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="account-action-reason">
        Reason<span aria-hidden="true" className="text-rose-600"> *</span>
        <textarea
          aria-describedby={error ? "account-action-error" : "account-action-help"}
          aria-invalid={Boolean(error)}
          autoFocus
          className={`mt-1.5 min-h-24 w-full resize-y rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${error ? "border-rose-400" : "border-slate-200"}`}
          disabled={submitting}
          id="account-action-reason"
          maxLength={500}
          onChange={(event) => { setReason(event.target.value); setError(""); }}
          placeholder="Add a reason for this demo action"
          value={reason}
        />
        {error ? <span className="mt-1 block text-xs text-rose-700" id="account-action-error" role="alert">{error}</span> : null}
        <span className="sr-only" id="account-action-help">A reason is required.</span>
      </label>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={submitting} onClick={onCancel} variant="secondary">Cancel</Button>
        <Button disabled={submitting} onClick={() => void confirm()} variant={action === "lock" ? "danger" : "primary"}>
          {submitting ? "Applying…" : `${actionLabel} account`}
        </Button>
      </div>
    </Modal>
  );
}

export { AccountActionDialog };
