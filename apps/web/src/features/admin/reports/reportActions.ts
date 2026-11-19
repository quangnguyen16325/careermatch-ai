import type { AdminReport, ReportStatus } from "../types";

type ReportActionResult =
  | { ok: true; report: AdminReport; reports: AdminReport[] }
  | { ok: false; code: "not-found" | "invalid-transition" | "reason-required"; message: string };

function canTransitionReportStatus(current: ReportStatus, next: ReportStatus): boolean {
  return (current === "Open" && next === "Reviewing") ||
    (current === "Reviewing" && (next === "Resolved" || next === "Dismissed"));
}

function applyReportStatusAction(
  reports: readonly AdminReport[] | null | undefined,
  reportId: string,
  nextStatus: ReportStatus,
  note: string,
  handledAt = new Date().toISOString().slice(0, 10),
): ReportActionResult {
  const currentReports = reports ?? [];
  const currentReport = currentReports.find((report) => report.id === reportId);
  if (!currentReport) {
    return { ok: false, code: "not-found", message: `Report ${reportId} is no longer available.` };
  }

  if (!canTransitionReportStatus(currentReport.status, nextStatus)) {
    return {
      ok: false,
      code: "invalid-transition",
      message: `A report in ${currentReport.status} status cannot be changed to ${nextStatus}.`,
    };
  }

  const cleanedNote = note.trim();
  if (nextStatus !== "Reviewing" && cleanedNote.length < 10) {
    return { ok: false, code: "reason-required", message: "Add at least 10 characters explaining this decision." };
  }

  const updatedReport: AdminReport = {
    ...currentReport,
    status: nextStatus,
    history: [
      {
        status: nextStatus,
        date: handledAt,
        note: `Status changed from ${currentReport.status} to ${nextStatus}.${cleanedNote ? ` ${cleanedNote}` : ""}`,
      },
      ...currentReport.history,
    ],
  };

  return {
    ok: true,
    report: updatedReport,
    reports: currentReports.map((report) => report.id === reportId ? updatedReport : report),
  };
}

export { applyReportStatusAction, canTransitionReportStatus };
export type { ReportActionResult };
