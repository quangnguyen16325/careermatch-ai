import { StatusBadge, type StatusTone } from "../../../components/ui/StatusBadge";
import {
  getCompanyVerificationDescription,
  getCompanyVerificationLabel,
  type CompanyVerificationStatus as VerificationStatus,
} from "../companyApi";

const tones: Record<VerificationStatus, StatusTone> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

type CompanyVerificationStatusProps = {
  status: VerificationStatus;
  compact?: boolean;
};

function CompanyVerificationStatus({
  status,
  compact = false,
}: CompanyVerificationStatusProps) {
  return (
    <div
      aria-label="Company verification status"
      className={`w-full min-w-0 rounded-xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4 sm:p-5"}`}
      role="group"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">
          Verification status
        </span>
        <StatusBadge tone={tones[status]}>
          {getCompanyVerificationLabel(status)}
        </StatusBadge>
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">
        {getCompanyVerificationDescription(status)}
      </p>
    </div>
  );
}

export { CompanyVerificationStatus };
