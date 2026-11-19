import type { AdminReport, ReportStatus, ReportTargetType } from "../types";
import type { ReportAnalytics, ReportDataState, ReportFilterCriteria } from "./types";

const reportStatuses: readonly ReportStatus[] = ["Open", "Reviewing", "Resolved", "Dismissed"];
const reportTargetTypes: readonly ReportTargetType[] = ["Job", "Account"];

function normalizeReportSearchTerm(value: string | null | undefined) {
  return (typeof value === "string" ? value : "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function filterAndSortReports(
  reports: readonly AdminReport[] | null | undefined,
  criteria: ReportFilterCriteria = {},
): AdminReport[] {
  const query = normalizeReportSearchTerm(criteria.query);
  const filtered = (reports ?? []).filter((report) => {
    if (!report || typeof report !== "object") return false;
    const searchableText = [
      report.reporter,
      report.reporterEmail,
      report.targetLabel,
      report.reason,
      report.details,
    ].map((value) => normalizeReportSearchTerm(value)).join(" ");
    return (!query || searchableText.includes(query)) &&
      (!criteria.status || criteria.status === "All statuses" || report.status === criteria.status) &&
      (!criteria.targetType || criteria.targetType === "All types" || report.targetType === criteria.targetType);
  });

  if (!criteria.sortOrder) return filtered;

  return filtered
    .map((report, index) => ({ report, index, submittedAt: parseReportDate(report.submittedAt) }))
    .sort((left, right) => {
      if (left.submittedAt === null && right.submittedAt !== null) return 1;
      if (right.submittedAt === null && left.submittedAt !== null) return -1;
      if (left.submittedAt === null || right.submittedAt === null) return left.index - right.index;
      const difference = criteria.sortOrder === "newest"
        ? right.submittedAt - left.submittedAt
        : left.submittedAt - right.submittedAt;
      return difference || left.index - right.index;
    })
    .map(({ report }) => report);
}

function buildReportAnalytics(reports: readonly AdminReport[] | null | undefined): ReportAnalytics {
  const statusCounts = Object.fromEntries(reportStatuses.map((status) => [status, 0])) as Record<ReportStatus, number>;
  const targetTypeCounts = Object.fromEntries(reportTargetTypes.map((type) => [type, 0])) as Record<ReportTargetType, number>;
  const submissions = new Map<string, number>();
  let totalReports = 0;

  for (const report of reports ?? []) {
    if (!report || !reportStatuses.includes(report.status) || !reportTargetTypes.includes(report.targetType)) continue;
    totalReports += 1;
    statusCounts[report.status] += 1;
    targetTypeCounts[report.targetType] += 1;

    const date = normalizeReportDateKey(report.submittedAt);
    if (date) submissions.set(date, (submissions.get(date) ?? 0) + 1);
  }

  const processedReports = statusCounts.Resolved + statusCounts.Dismissed;

  return {
    totalReports,
    processedReports,
    processedRatePercent: totalReports === 0 ? 0 : Math.round((processedReports / totalReports) * 100),
    statusCounts,
    targetTypeCounts,
    submissionsByDate: [...submissions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, count]) => ({ date, count })),
  };
}

function getReportDataState(
  reports: readonly AdminReport[] | null | undefined,
  options: { loading?: boolean; error?: string | null } = {},
): ReportDataState {
  if (options.loading) return { status: "loading" };
  const error = options.error?.trim();
  if (error) return { status: "error", message: error };
  if (!reports?.length) return { status: "empty" };
  return { status: "success", reports };
}

function parseReportDate(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeReportDateKey(value: string | null | undefined): string | null {
  const date = typeof value === "string" ? value.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return date;
}

export {
  buildReportAnalytics,
  filterAndSortReports,
  getReportDataState,
  normalizeReportSearchTerm,
};
