import { describe, expect, it } from "vitest";
import { getActiveNavigationItem, isNavigationItemActive } from "./navigationUtils";
import type { WorkspaceNavigationItem } from "./types";

const employerItems: readonly WorkspaceNavigationItem[] = [
  { id: "company", label: "Company & jobs", href: "/employer.html" },
  { id: "candidates", label: "Candidates", href: "/candidates.html" },
];

describe("isNavigationItemActive", () => {
  it("matches exact paths after stripping query strings, hashes, and trailing slashes", () => {
    expect(isNavigationItemActive("/employer.html/?tab=jobs#open", "/employer.html")).toBe(true);
    expect(isNavigationItemActive("/candidates.html#candidate-1", "/candidates.html/")).toBe(true);
  });

  it("matches nested paths without matching similarly prefixed routes", () => {
    expect(isNavigationItemActive("/workspace/jobs/42", "/workspace/jobs")).toBe(true);
    expect(isNavigationItemActive("/workspace/jobs-archive", "/workspace/jobs")).toBe(false);
  });

  it("normalizes the root path without treating it as an active parent for every route", () => {
    expect(isNavigationItemActive("////", "/")).toBe(true);
    expect(isNavigationItemActive("/employer.html", "/")).toBe(false);
  });
});

describe("getActiveNavigationItem", () => {
  it("selects the matching Employer page from the current pathname", () => {
    expect(getActiveNavigationItem("/candidates.html?status=review#list", employerItems)).toBe(employerItems[1]);
  });

  it("returns no item for an unrelated route", () => {
    expect(getActiveNavigationItem("/admin.html", employerItems)).toBeUndefined();
  });
});
