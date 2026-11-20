import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { PageHeader } from "../../../components/ui/PageHeader";
import {
  StatusBadge,
  type StatusTone,
} from "../../../components/ui/StatusBadge";
import { AdminNotice } from "../components/AdminNotice";
import {
  CompanyVerificationApiError,
  decideCompanyVerification,
  getCompanyVerificationQueue,
} from "../company-verification/companyVerificationApi";
import { validateCompanyVerificationDecision } from "../company-verification/validation";
import type {
  CompanyVerificationDecision,
  CompanyVerificationQueueItem,
  CompanyVerificationQueueResponse,
  CompanyVerificationStatus,
} from "../company-verification/types";
import { Modal } from "../../../components/ui/Modal";

const pageSize = 20;
type DecisionTarget = {
  company: CompanyVerificationQueueItem;
  status: CompanyVerificationDecision["status"];
};
const statusFilters: {
  value: CompanyVerificationStatus | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

type QueueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; result: CompanyVerificationQueueResponse };

function CompanyVerificationQueuePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CompanyVerificationStatus | "ALL">(
    "PENDING",
  );
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [queue, setQueue] = useState<QueueState>({ status: "loading" });
  const [selectedCompany, setSelectedCompany] =
    useState<CompanyVerificationQueueItem | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget | null>(
    null,
  );
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionFieldError, setDecisionFieldError] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const submittingDecisionRef = useRef(false);
  const [successNotice, setSuccessNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void getCompanyVerificationQueue(
      {
        page,
        pageSize,
        ...(status === "ALL" ? {} : { status }),
        search,
      },
      controller.signal,
    ).then(
      (result) => {
        if (page > 1 && page > result.meta.totalPages) {
          setPage(Math.max(1, result.meta.totalPages));
          setQueue({ status: "loading" });
          return;
        }
        setQueue({ status: "success", result });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setQueue({ status: "error", message: getQueueErrorMessage(error) });
      },
    );

    return () => controller.abort();
  }, [page, retryCount, search, status]);

  function updateSearch(value: string) {
    setQueue({ status: "loading" });
    setSearch(value);
    setPage(1);
  }

  function updateStatus(value: CompanyVerificationStatus | "ALL") {
    setQueue({ status: "loading" });
    setStatus(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setQueue({ status: "loading" });
    setPage(nextPage);
  }

  function retryLoading() {
    setQueue({ status: "loading" });
    setRetryCount((count) => count + 1);
  }

  function startDecision(
    company: CompanyVerificationQueueItem,
    nextStatus: CompanyVerificationDecision["status"],
  ) {
    if (!isAllowedTransition(company.verificationStatus, nextStatus)) return;
    setSuccessNotice("");
    setDecisionTarget({ company, status: nextStatus });
    setDecisionReason("");
    setDecisionError("");
    setDecisionFieldError("");
  }

  async function submitDecision() {
    if (!decisionTarget || submittingDecisionRef.current) return;
    const decision = {
      status: decisionTarget.status,
      ...(decisionReason ? { reason: decisionReason } : {}),
    } satisfies CompanyVerificationDecision;
    const validationError = validateCompanyVerificationDecision(decision);
    if (validationError) {
      setDecisionFieldError(getDecisionValidationMessage(validationError));
      return;
    }

    submittingDecisionRef.current = true;
    setIsSubmittingDecision(true);
    setDecisionError("");
    setDecisionFieldError("");
    try {
      await decideCompanyVerification(decisionTarget.company.id, decision);
      setSuccessNotice(
        `${getDecisionLabel(decisionTarget.status, decisionTarget.company.verificationStatus)} confirmed by the server.`,
      );
      setDecisionTarget(null);
      setDecisionReason("");
      setQueue({ status: "loading" });
      setRetryCount((count) => count + 1);
    } catch (error) {
      setDecisionError(getDecisionErrorMessage(error));
    } finally {
      submittingDecisionRef.current = false;
      setIsSubmittingDecision(false);
    }
  }

  const isFiltered = Boolean(search.trim()) || status !== "ALL";

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review company records submitted for verification. Results come from the Admin Companies API."
        eyebrow="Trust and safety"
        title="Company verification queue"
      />

      {successNotice ? <AdminNotice tone="success">{successNotice}</AdminNotice> : null}

      <Card
        as="div"
        padding="sm"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]"
      >
        <label className="relative block min-w-0">
          <span className="sr-only">Search company name or tax code</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            aria-label="Search company name or tax code"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search name or tax code"
            type="search"
            value={search}
          />
        </label>
        <label className="block">
          <span className="sr-only">Filter company verification status</span>
          <select
            aria-label="Filter company verification status"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            onChange={(event) =>
              updateStatus(
                event.target.value as CompanyVerificationStatus | "ALL",
              )
            }
            value={status}
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </Card>

      {queue.status === "loading" ? (
        <AdminNotice tone="loading">
          Loading company verification requests...
        </AdminNotice>
      ) : queue.status === "error" ? (
        <Card className="space-y-4">
          <AdminNotice tone="error">{queue.message}</AdminNotice>
          <Button
            icon={<RefreshCw aria-hidden="true" size={16} />}
            onClick={retryLoading}
            variant="secondary"
          >
            Retry loading companies
          </Button>
        </Card>
      ) : (
        <QueueResults
          isFiltered={isFiltered}
          onDecision={startDecision}
          onOpenDetails={setSelectedCompany}
          onPageChange={changePage}
          page={page}
          result={queue.result}
        />
      )}
      {selectedCompany ? (
        <CompanyVerificationDetailDialog
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      ) : null}
      {decisionTarget ? (
        <CompanyVerificationDecisionDialog
          busy={isSubmittingDecision}
          company={decisionTarget.company}
          error={decisionError}
          onCancel={() => {
            if (isSubmittingDecision) return;
            setDecisionTarget(null);
            setDecisionReason("");
            setDecisionError("");
            setDecisionFieldError("");
          }}
          onReasonChange={(value) => {
            setDecisionReason(value);
            setDecisionFieldError("");
          }}
          onSubmit={submitDecision}
          reason={decisionReason}
          validationError={decisionFieldError}
          status={decisionTarget.status}
        />
      ) : null}
    </div>
  );
}

function QueueResults({
  isFiltered,
  onDecision,
  onOpenDetails,
  onPageChange,
  page,
  result,
}: {
  isFiltered: boolean;
  onDecision: (
    company: CompanyVerificationQueueItem,
    status: CompanyVerificationDecision["status"],
  ) => void;
  onOpenDetails: (company: CompanyVerificationQueueItem) => void;
  onPageChange: (page: number) => void;
  page: number;
  result: CompanyVerificationQueueResponse;
}) {
  const { data, meta } = result;

  return (
    <>
      <div>
        <h2 className="font-semibold text-slate-950">Company records</h2>
        <p aria-live="polite" className="mt-1 text-sm text-slate-500">
          {meta.total} {meta.total === 1 ? "company" : "companies"} found
        </p>
      </div>

      {data.length === 0 ? (
        <Card className="py-12 text-center">
          <Building2
            aria-hidden="true"
            className="mx-auto size-10 text-slate-400"
          />
          <h3 className="mt-4 text-lg font-semibold text-slate-950">
            {isFiltered
              ? "No companies match these filters"
              : "No company records yet"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {isFiltered
              ? "Try a different search term or verification status."
              : "Company verification requests will appear here when submitted."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.map((company) => (
            <CompanyQueueCard
              company={company}
              key={company.id}
              onDecision={(nextStatus) => onDecision(company, nextStatus)}
              onOpenDetails={() => onOpenDetails(company)}
            />
          ))}
        </div>
      )}

      {meta.totalPages > 1 ? (
        <nav
          aria-label="Company queue pagination"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-slate-600">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={page <= 1}
              icon={<ChevronLeft aria-hidden="true" size={16} />}
              onClick={() => onPageChange(page - 1)}
              size="sm"
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={page >= meta.totalPages}
              icon={<ChevronRight aria-hidden="true" size={16} />}
              onClick={() => onPageChange(page + 1)}
              size="sm"
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </>
  );
}

function CompanyQueueCard({
  company,
  onDecision,
  onOpenDetails,
}: {
  company: CompanyVerificationQueueResponse["data"][number];
  onDecision: (status: CompanyVerificationDecision["status"]) => void;
  onOpenDetails: () => void;
}) {
  const tone = getStatusTone(company.verificationStatus);
  const availableDecisions = getAvailableDecisions(company.verificationStatus);

  return (
    <Card as="article" className="min-w-0">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Building2 aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-semibold text-slate-950">
                {company.name}
              </h3>
              <StatusBadge tone={tone}>
                {company.verificationStatus}
              </StatusBadge>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Tax code</dt>
                <dd className="mt-0.5 break-all font-medium text-slate-800">
                  {company.taxCode || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Location</dt>
                <dd className="mt-0.5 break-words font-medium text-slate-800">
                  {company.location || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Employer accounts</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {company._count.employers}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Jobs</dt>
                <dd className="mt-0.5 font-medium text-slate-800">
                  {company._count.jobs}
                </dd>
              </div>
            </dl>
            {company.description ? (
              <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                {company.description}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              Created {formatDate(company.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 self-end sm:self-start">
          <Button onClick={onOpenDetails} size="sm" variant="secondary">
            View details
          </Button>
          {availableDecisions.map((decision) => (
            <Button
              key={decision}
              onClick={() => onDecision(decision)}
              size="sm"
              variant={decision === "REJECTED" ? "danger" : "primary"}
            >
              {getDecisionLabel(decision, company.verificationStatus)}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CompanyVerificationDecisionDialog({
  busy,
  company,
  error,
  onCancel,
  onReasonChange,
  onSubmit,
  reason,
  status,
  validationError,
}: {
  busy: boolean;
  company: CompanyVerificationQueueItem;
  error: string;
  onCancel: () => void;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  reason: string;
  status: CompanyVerificationDecision["status"];
  validationError: string;
}) {
  const actionLabel = getDecisionLabel(status, company.verificationStatus);
  const requiresReason = status === "REJECTED";

  return (
    <Modal
      aria-labelledby="company-verification-decision-title"
      aria-modal="true"
      className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
      onClose={onCancel}
      role="alertdialog"
    >
      <h2
        className="text-lg font-semibold text-slate-950"
        id="company-verification-decision-title"
      >
        Confirm {actionLabel.toLowerCase()}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {actionLabel} <strong>{company.name}</strong>? Its status will change
        from {company.verificationStatus} to {status}.
      </p>
      {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
      {requiresReason ? (
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Reason <span aria-hidden="true" className="text-rose-700">*</span>
          <textarea
            aria-describedby={validationError ? "company-decision-reason-error" : undefined}
            aria-invalid={Boolean(validationError)}
            className={`mt-1.5 min-h-28 w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 ${validationError ? "border-rose-500" : "border-slate-200"}`}
            disabled={busy}
            maxLength={1000}
            onChange={(event) => onReasonChange(event.target.value)}
            value={reason}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Enter at least 10 characters after trimming (maximum 1000).
          </span>
          {validationError ? (
            <span
              className="mt-1 block text-xs text-rose-800"
              id="company-decision-reason-error"
              role="alert"
            >
              {validationError}
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={busy} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={onSubmit}
          variant={status === "REJECTED" ? "danger" : "primary"}
        >
          {busy ? "Submitting..." : `Confirm ${actionLabel}`}
        </Button>
      </div>
    </Modal>
  );
}

function CompanyVerificationDetailDialog({
  company,
  onClose,
}: {
  company: CompanyVerificationQueueItem;
  onClose: () => void;
}) {
  return (
    <Modal
      aria-labelledby="company-verification-detail-title"
      aria-modal="true"
      className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Building2 aria-hidden="true" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="break-words text-xl font-semibold text-slate-950"
              id="company-verification-detail-title"
            >
              {company.name}
            </h2>
            <StatusBadge tone={getStatusTone(company.verificationStatus)}>
              {company.verificationStatus}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Company verification details
          </p>
        </div>
        <button
          aria-label={`Close details for ${company.name}`}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {company.description ? (
        <section className="mt-6">
          <h3 className="text-sm font-semibold text-slate-800">
            Company description
          </h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
            {company.description}
          </p>
        </section>
      ) : null}

      <dl className="mt-6 grid gap-x-6 gap-y-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <DetailField label="Tax code" value={company.taxCode} />
        <DetailField label="Location" value={company.location} />
        <DetailField label="Website" value={company.website} />
        <DetailField label="Created" value={formatDate(company.createdAt)} />
        <DetailField
          label="Employer accounts"
          value={String(company._count.employers)}
        />
        <DetailField label="Jobs" value={String(company._count.jobs)} />
      </dl>

      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
        <Button onClick={onClose} variant="secondary">
          Close details
        </Button>
      </div>
    </Modal>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const hasValue = value !== null && value.trim().length > 0;

  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-medium text-slate-800">
        {hasValue ? value : "Not provided"}
      </dd>
    </div>
  );
}

function getStatusTone(status: CompanyVerificationStatus): StatusTone {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING") return "warning";
  return "danger";
}

function getQueueErrorMessage(error: unknown): string {
  if (!(error instanceof CompanyVerificationApiError)) {
    return "Could not load company verification requests. Check your connection and retry.";
  }
  if (error.status === 401)
    return "Your session has expired. Sign in again, then retry.";
  if (error.status === 403)
    return "Your account does not have permission to view this queue.";
  if (error.status === null)
    return `${error.message} Check your connection and retry.`;
  if (error.status >= 500)
    return "The company verification service is unavailable. Retry in a moment.";
  return error.message;
}

function getAvailableDecisions(
  currentStatus: CompanyVerificationStatus,
): CompanyVerificationDecision["status"][] {
  if (currentStatus === "PENDING") return ["VERIFIED", "REJECTED"];
  if (currentStatus === "VERIFIED") return ["REJECTED"];
  return ["VERIFIED"];
}

function isAllowedTransition(
  currentStatus: CompanyVerificationStatus,
  nextStatus: CompanyVerificationDecision["status"],
): boolean {
  return getAvailableDecisions(currentStatus).includes(nextStatus);
}

function getDecisionLabel(
  nextStatus: CompanyVerificationDecision["status"],
  currentStatus: CompanyVerificationStatus,
): string {
  if (currentStatus === "VERIFIED" && nextStatus === "REJECTED")
    return "Revoke verification";
  if (currentStatus === "REJECTED" && nextStatus === "VERIFIED")
    return "Verify again";
  return nextStatus === "VERIFIED" ? "Approve" : "Reject";
}

function getDecisionValidationMessage(
  error: "reason-required" | "reason-too-short" | "reason-too-long",
): string {
  if (error === "reason-required") return "Enter a reason before rejecting.";
  if (error === "reason-too-short")
    return "The reason must contain at least 10 characters after trimming.";
  return "The reason must be no longer than 1000 characters.";
}

function getDecisionErrorMessage(error: unknown): string {
  if (!(error instanceof CompanyVerificationApiError))
    return "The decision could not be confirmed. Refresh the queue before retrying.";
  if (error.code === "INVALID_STATE_TRANSITION")
    return "This company’s status changed or this action is no longer allowed. Refresh the queue and review it again.";
  if (error.code === "COMPANY_NOT_FOUND")
    return "This company no longer exists. Refresh the queue.";
  if (error.status === 401)
    return "Your session has expired. Sign in again before retrying.";
  if (error.status === 403)
    return "Your account does not have permission to decide company verification.";
  if (error.status === null)
    return `${error.message} No successful response was received; retry manually.`;
  if (error.status >= 500)
    return "The company verification service is unavailable. Retry in a moment.";
  return error.message;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export { CompanyVerificationDetailDialog, CompanyVerificationQueuePage };
