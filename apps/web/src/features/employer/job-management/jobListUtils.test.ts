import { describe, expect, it } from "vitest";
import {
  getEmployerJobActions,
  getEmployerJobStatusLabel,
  getEmployerJobsPageTarget,
  normalizeEmployerJobsQuery,
} from "./jobListUtils";

describe("employer job list helpers", () => {
  it("maps every backend status to a human-readable label", () => {
    expect(getEmployerJobStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
  });

  it("allows closing only published jobs", () => {
    expect(getEmployerJobActions("PUBLISHED")).toContain("close");
    expect(getEmployerJobActions("DRAFT")).not.toContain("close");
    expect(getEmployerJobActions("CLOSED")).toEqual([]);
  });

  it("normalizes pagination and optional query values to the API contract", () => {
    expect(normalizeEmployerJobsQuery({ page: -1, pageSize: 500, search: "  designer ", status: "DRAFT" })).toEqual({
      page: 1,
      pageSize: 100,
      search: "designer",
      status: "DRAFT",
    });
    expect(normalizeEmployerJobsQuery({ search: "   ", status: "UNKNOWN" as never })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("does not navigate outside the available page range", () => {
    expect(getEmployerJobsPageTarget(1, 3, "previous")).toBeNull();
    expect(getEmployerJobsPageTarget(3, 3, "next")).toBeNull();
    expect(getEmployerJobsPageTarget(2, 3, "next")).toBe(3);
    expect(getEmployerJobsPageTarget(2, 3, "previous")).toBe(1);
  });
});
