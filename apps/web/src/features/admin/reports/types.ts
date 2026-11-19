import type { AdminReport, ReportStatus, ReportTargetType } from "../types";

export type ReportSortOrder = "newest" | "oldest";

export type ReportFilterCriteria = {
  query?: string;
  status?: ReportStatus | "All statuses";
  targetType?: ReportTargetType | "All types";
  sortOrder?: ReportSortOrder;
};

export type ReportAnalytics = {
  totalReports: number;
  processedReports: number;
  processedRatePercent: number;
  statusCounts: Record<ReportStatus, number>;
  targetTypeCounts: Record<ReportTargetType, number>;
  submissionsByDate: Array<{ date: string; count: number }>;
};

export type ReportDataState =
  | { status: "loading" }
  | { status: "success"; reports: readonly AdminReport[] }
  | { status: "empty" }
  | { status: "error"; message: string };
