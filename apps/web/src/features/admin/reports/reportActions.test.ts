import { describe, expect, it } from "vitest";
import type { AdminReport } from "../types";
import { buildReportAnalytics } from "./reportAnalytics";
import { applyReportStatusAction, canTransitionReportStatus } from "./reportActions";

const report: AdminReport = {
  id: "report-601",
  reporter: "Minh Tran",
  reporterEmail: "minh@example.test",
  targetType: "Job",
  targetLabel: "Frontend Engineer",
  reason: "Misleading pay",
  details: "The compensation differs from the listing.",
  submittedAt: "2026-11-17",
  status: "Open",
  history: [{ status: "Open", date: "2026-11-17", note: "Report submitted" }],
};

describe("report action transitions", () => {
  it("allows only the existing workflow transitions", () => {
    expect(canTransitionReportStatus("Open", "Reviewing")).toBe(true);
    expect(canTransitionReportStatus("Reviewing", "Resolved")).toBe(true);
    expect(canTransitionReportStatus("Reviewing", "Dismissed")).toBe(true);
    expect(canTransitionReportStatus("Open", "Resolved")).toBe(false);
    expect(canTransitionReportStatus("Resolved", "Reviewing")).toBe(false);
  });

  it("updates a valid report and prepends a history entry with before/after states", () => {
    const result = applyReportStatusAction([report], report.id, "Reviewing", "Check the listing", "2026-11-19");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.report.status).toBe("Reviewing");
    expect(result.report.history).toEqual([
      { status: "Reviewing", date: "2026-11-19", note: "Status changed from Open to Reviewing. Check the listing" },
      report.history[0],
    ]);
    expect(result.report).toMatchObject({ id: report.id, reporter: report.reporter, details: report.details, targetLabel: report.targetLabel });
    expect(report.status).toBe("Open");
  });

  it("rejects a missing report without changing the supplied list", () => {
    const reports = [report];
    const result = applyReportStatusAction(reports, "missing-report", "Reviewing", "", "2026-11-19");
    expect(result).toMatchObject({ ok: false, code: "not-found" });
    expect(reports).toEqual([report]);
  });

  it("rejects invalid transitions and short resolution reasons without changing report data", () => {
    const reviewing = { ...report, status: "Reviewing" as const };
    const invalid = applyReportStatusAction([report], report.id, "Resolved", "A complete reason", "2026-11-19");
    const missingReason = applyReportStatusAction([reviewing], report.id, "Dismissed", "  too short  ", "2026-11-19");

    expect(invalid).toMatchObject({ ok: false, code: "invalid-transition" });
    expect(missingReason).toMatchObject({ ok: false, code: "reason-required" });
    expect(report.status).toBe("Open");
    expect(reviewing.history).toEqual(report.history);
  });

  it("preserves unrelated reports when one report is updated", () => {
    const other = { ...report, id: "report-602", status: "Reviewing" as const };
    const result = applyReportStatusAction([report, other], report.id, "Reviewing", "Investigating", "2026-11-19");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reports[1]).toBe(other);
    expect(result.reports).toHaveLength(2);
  });

  it("recomputes dashboard metrics from the updated preview reports", () => {
    const before = buildReportAnalytics([report]);
    const reviewing = applyReportStatusAction([report], report.id, "Reviewing", "Investigating", "2026-11-19");
    expect(reviewing.ok).toBe(true);
    if (!reviewing.ok) return;

    const resolved = applyReportStatusAction(reviewing.reports, report.id, "Resolved", "Confirmed listing issue", "2026-11-20");
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(before.statusCounts.Open).toBe(1);
    expect(buildReportAnalytics(reviewing.reports).statusCounts.Reviewing).toBe(1);
    expect(buildReportAnalytics(resolved.reports)).toMatchObject({
      totalReports: 1,
      processedReports: 1,
      processedRatePercent: 100,
      statusCounts: { Open: 0, Reviewing: 0, Resolved: 1, Dismissed: 0 },
    });
  });
});
