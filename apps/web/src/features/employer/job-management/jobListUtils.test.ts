import { describe, expect, it } from "vitest";
import {
  canConfirmEmployerJobClose,
  getEmployerJobActions,
  getEmployerJobStatusLabel,
  getEmployerJobsPageTarget,
  isCurrentEmployerJobsQuery,
  normalizeEmployerJobsQuery,
} from "./jobListUtils";

describe("employer job list helpers", () => {
  it("maps every backend status to a human-readable label", () => {
    expect(getEmployerJobStatusLabel("PENDING_APPROVAL")).toBe(
      "Pending approval",
    );
    expect(getEmployerJobActions("DRAFT")).toEqual([
      "edit",
      "submit",
      "delete",
    ]);
    expect(getEmployerJobActions("PENDING_APPROVAL")).toEqual(["withdraw"]);
    expect(getEmployerJobActions("REJECTED")).toEqual(["edit"]);
  });

  it("exposes only the backend-authorized action matrix for each status", () => {
    expect(getEmployerJobActions("DRAFT")).toEqual([
      "edit",
      "submit",
      "delete",
    ]);
    expect(getEmployerJobActions("PENDING_APPROVAL")).toEqual(["withdraw"]);
    expect(getEmployerJobActions("PUBLISHED")).toEqual(["close"]);
    expect(getEmployerJobActions("REJECTED")).toEqual(["edit"]);
    expect(getEmployerJobActions("CLOSED")).toEqual([]);
  });

  it("allows closing only published jobs", () => {
    expect(getEmployerJobActions("PUBLISHED")).toContain("close");
    expect(getEmployerJobActions("DRAFT")).not.toContain("close");
    expect(getEmployerJobActions("CLOSED")).toEqual([]);
  });

  it("normalizes pagination and optional query values to the API contract", () => {
    expect(
      normalizeEmployerJobsQuery({
        page: -1,
        pageSize: 500,
        search: "  designer ",
        status: "DRAFT",
      }),
    ).toEqual({
      page: 1,
      pageSize: 100,
      search: "designer",
      status: "DRAFT",
    });
    expect(
      normalizeEmployerJobsQuery({ search: "   ", status: "UNKNOWN" as never }),
    ).toEqual({
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

  it("blocks close confirmation for unavailable states and while submitting", () => {
    expect(canConfirmEmployerJobClose("PUBLISHED", false)).toBe(true);
    expect(canConfirmEmployerJobClose("PUBLISHED", true)).toBe(false);
    expect(canConfirmEmployerJobClose("CLOSED", false)).toBe(false);
  });

  it("compares normalized queries so stale results can be ignored", () => {
    expect(
      isCurrentEmployerJobsQuery(
        { page: 1, search: " engineer " },
        { page: 1, search: "engineer" },
      ),
    ).toBe(true);
    expect(
      isCurrentEmployerJobsQuery(
        { page: 1, status: "DRAFT" },
        { page: 2, status: "DRAFT" },
      ),
    ).toBe(false);
  });
});
