import type {
  CompanyVerificationDecision,
  CompanyVerificationStatus,
} from "./types";

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

function isLatestQueueRequest(
  requestId: number,
  latestRequestId: number,
  aborted: boolean,
): boolean {
  return !aborted && requestId === latestRequestId;
}

export {
  getAvailableDecisions,
  getDecisionLabel,
  isAllowedTransition,
  isLatestQueueRequest,
};
