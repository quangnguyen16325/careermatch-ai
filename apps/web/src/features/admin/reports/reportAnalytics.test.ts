import { describe, expect, it } from "vitest";
import type { AdminReport } from "../types";
import {
  buildReportAnalytics,
  filterAndSortReports,
  getReportDataState,
  normalizeReportSearchTerm,
} from "./reportAnalytics";

const reports: AdminReport[] = [
  { id: "report-1", reporter: "Minh Tran", reporterEmail: "minh@example.test", targetType: "Job", targetLabel: "Frontend Engineer", reason: "Misleading pay", details: "The compensation differs from the listing.", submittedAt: "2026-11-17", status: "Open", history: [{ status: "Open", date: "2026-11-17", note: "Submitted" }] },
  { id: "report-2", reporter: "Linh Nguyen", reporterEmail: "linh@example.test", targetType: "Account", targetLabel: "Northstar Labs", reason: "Impersonation", details: "The company may be using another brand.", submittedAt: "2026-11-15", status: "Reviewing", history: [{ status: "Reviewing", date: "2026-11-16", note: "Review started" }] },
  { id: "report-3", reporter: "An Pham", reporterEmail: "an@example.test", targetType: "Job", targetLabel: "Product Designer", reason: "Incorrect location", details: "The address is out of date.", submittedAt: "2026-11-17", status: "Resolved", history: [{ status: "Resolved", date: "2026-11-18", note: "Corrected" }] },
];

describe("normalizeReportSearchTerm and filterAndSortReports", () => {
  it("normalizes case, Unicode, and whitespace", () => {
    expect(normalizeReportSearchTerm("  ＦＲＯＮＴＥＮＤ   Engineer ")).toBe("frontend engineer");
  });

  it("searches reporter, email, target, reason, and details", () => {
    expect(filterAndSortReports(reports, { query: "MINH" })).toEqual([reports[0]]);
    expect(filterAndSortReports(reports, { query: "linh@example.test" })).toEqual([reports[1]]);
    expect(filterAndSortReports(reports, { query: "out of date" })).toEqual([reports[2]]);
  });

  it("filters by status and target type", () => {
    expect(filterAndSortReports(reports, { status: "Reviewing" })).toEqual([reports[1]]);
    expect(filterAndSortReports(reports, { targetType: "Job" })).toEqual([reports[0], reports[2]]);
    expect(filterAndSortReports(reports, { status: "Open", targetType: "Account" })).toEqual([]);
  });

  it("combines search, status, target type, and sort criteria", () => {
    expect(filterAndSortReports(reports, {
      query: " engineer ",
      status: "Open",
      targetType: "Job",
      sortOrder: "oldest",
    })).toEqual([reports[0]]);
    expect(filterAndSortReports(reports, {
      query: "northstar",
      status: "Reviewing",
      targetType: "Job",
    })).toEqual([]);
  });

  it("returns empty results for missing reports or unmatched criteria", () => {
    expect(filterAndSortReports(undefined)).toEqual([]);
    expect(filterAndSortReports(null, { query: "no match" })).toEqual([]);
  });

  it("skips malformed null rows instead of throwing", () => {
    expect(filterAndSortReports([null as unknown as AdminReport, reports[0]])).toEqual([reports[0]]);
  });

  it("sorts in either date direction without mutating source order and keeps invalid dates last", () => {
    const withInvalidDate = [
      reports[0],
      { ...reports[1], submittedAt: "invalid" },
      { ...reports[2], submittedAt: "2026-11-19" },
    ];
    expect(filterAndSortReports(withInvalidDate, { sortOrder: "newest" })).toEqual([withInvalidDate[2], withInvalidDate[0], withInvalidDate[1]]);
    expect(filterAndSortReports(withInvalidDate, { sortOrder: "oldest" })).toEqual([withInvalidDate[0], withInvalidDate[2], withInvalidDate[1]]);
    expect(withInvalidDate[0]).toBe(reports[0]);
  });
});

describe("buildReportAnalytics", () => {
  it("summarizes report totals, statuses, target types, and daily submissions", () => {
    expect(buildReportAnalytics(reports)).toEqual({
      totalReports: 3,
      processedReports: 1,
      processedRatePercent: 33,
      statusCounts: { Open: 1, Reviewing: 1, Resolved: 1, Dismissed: 0 },
      targetTypeCounts: { Job: 2, Account: 1 },
      submissionsByDate: [
        { date: "2026-11-15", count: 1 },
        { date: "2026-11-17", count: 2 },
      ],
    });
  });

  it("returns zeroed metrics for missing data and ignores malformed dates", () => {
    expect(buildReportAnalytics(undefined)).toEqual({
      totalReports: 0,
      processedReports: 0,
      processedRatePercent: 0,
      statusCounts: { Open: 0, Reviewing: 0, Resolved: 0, Dismissed: 0 },
      targetTypeCounts: { Job: 0, Account: 0 },
      submissionsByDate: [],
    });
    expect(buildReportAnalytics([{ ...reports[0], submittedAt: "2026-02-30" }]).submissionsByDate).toEqual([]);
  });

  it("ignores malformed rows and unsupported statuses or target types in metrics", () => {
    const unsupported = { ...reports[0], status: "Pending" as AdminReport["status"] };
    const unsupportedTarget = { ...reports[1], targetType: "Candidate" as AdminReport["targetType"] };
    const analytics = buildReportAnalytics([null as unknown as AdminReport, unsupported, unsupportedTarget, reports[0]]);

    expect(analytics.totalReports).toBe(1);
    expect(analytics.statusCounts.Open).toBe(1);
    expect(analytics.targetTypeCounts.Job).toBe(1);
  });
});

describe("getReportDataState", () => {
  it("represents loading, success, empty, and error states", () => {
    expect(getReportDataState(undefined, { loading: true })).toEqual({ status: "loading" });
    expect(getReportDataState(reports)).toEqual({ status: "success", reports });
    expect(getReportDataState([])).toEqual({ status: "empty" });
    expect(getReportDataState(reports, { error: "Service unavailable" })).toEqual({ status: "error", message: "Service unavailable" });
  });

  it("ignores blank error messages when data is available", () => {
    expect(getReportDataState(reports, { error: "  " })).toEqual({ status: "success", reports });
  });
});
