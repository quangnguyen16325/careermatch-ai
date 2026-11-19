import { Modal } from "../../../components/ui/Modal";
import { useRef, useState } from "react";
import { Button, type ButtonVariant } from "../../../components/ui/Button";

type AdminActionDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: ButtonVariant;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  feedbackMessage?: string;
  processingLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

function AdminActionDialog({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  reasonLabel = "Reason",
  reasonPlaceholder = "Add a clear reason for this decision...",
  feedbackMessage,
  processingLabel = "Processing...",
  requireReason = false,
  title,
  tone = "danger",
}: AdminActionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  async function confirm() {
    if (processingRef.current) return;
    if (requireReason && reason.trim().length < 10) {
      setError("Enter at least 10 characters so the decision is clear.");
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch {
      setError("The action could not be completed. Your preview data was not updated.");
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" onClick={(event) => event.stopPropagation()}>
      <Modal onClose={onCancel} aria-labelledby="admin-action-title" aria-modal="true" aria-busy={isProcessing} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" role="alertdialog">
        <h2 className="text-lg font-semibold text-slate-950" id="admin-action-title">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {feedbackMessage ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{feedbackMessage}</p> : null}
        {requireReason ? (
          <label className="mt-4 block text-sm font-medium text-slate-700">
            {reasonLabel}<span className="text-rose-600"> *</span>
            <textarea aria-describedby={error ? "action-reason-error" : undefined} aria-invalid={Boolean(error)} className={`mt-1.5 min-h-24 w-full resize-y rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${error ? "border-rose-400" : "border-slate-200"}`} maxLength={500} onChange={(event) => { setReason(event.target.value); setError(""); }} placeholder={reasonPlaceholder} value={reason} />
            {error ? <span className="mt-1 block text-xs text-rose-700" id="action-reason-error">{error}</span> : null}
          </label>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isProcessing} onClick={onCancel} variant="secondary">Cancel</Button>
          <Button aria-live="polite" disabled={isProcessing} onClick={confirm} variant={tone}>{isProcessing ? processingLabel : confirmLabel}</Button>
        </div>
      </Modal>
    </div>
  );
}

export { AdminActionDialog };
