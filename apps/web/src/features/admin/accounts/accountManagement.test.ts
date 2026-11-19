import { describe, expect, it } from "vitest";
import type { AdminUser } from "../types";
import {
  canPerformAccountAction,
  filterAccounts,
  getAccountOperationErrorMessage,
  normalizeAccountOperationError,
  normalizeAccountSearchKeyword,
  validateAccountActionReason,
} from "./accountManagement";

const accounts: AdminUser[] = [
  { id: "account-1", name: "Avery Nguyen", email: "avery@example.test", role: "Employer", status: "Active", registeredAt: "2026-11-01", location: "Hanoi" },
  { id: "account-2", name: "Jordan Tran", email: "jordan@example.test", role: "Student", status: "Suspended", registeredAt: "2026-11-02", location: "Da Nang" },
];

describe("normalizeAccountSearchKeyword and filterAccounts", () => {
  it("returns every matching role/status account for an empty keyword", () => {
    expect(filterAccounts(accounts, { keyword: "  ", role: "All roles", status: "All statuses" })).toEqual(accounts);
  });

  it("searches name and email without case sensitivity and normalizes whitespace", () => {
    expect(normalizeAccountSearchKeyword("  AVERY   NGUYEN ")).toBe("avery nguyen");
    expect(filterAccounts(accounts, { keyword: "AVERY@EXAMPLE.TEST" })).toEqual([accounts[0]]);
  });

  it("returns no accounts when the keyword does not match", () => {
    expect(filterAccounts(accounts, { keyword: "missing account" })).toEqual([]);
  });

  it("applies optional role and status criteria along with the keyword", () => {
    expect(filterAccounts(accounts, { keyword: "example.test", role: "Employer", status: "Active" })).toEqual([accounts[0]]);
  });
});

describe("validateAccountActionReason", () => {
  it.each(["", "   ", "\n\t "])("rejects a blank reason %j", (reason) => {
    expect(validateAccountActionReason(reason)).toEqual({ valid: false, error: "required" });
  });

  it("accepts a non-empty reason and returns its trimmed value", () => {
    expect(validateAccountActionReason("  Repeated policy violations  ")).toEqual({
      valid: true,
      value: "Repeated policy violations",
    });
  });
});

describe("canPerformAccountAction", () => {
  it("allows locking active accounts but not accounts already locked", () => {
    expect(canPerformAccountAction("Active", "lock")).toBe(true);
    expect(canPerformAccountAction("Suspended", "lock")).toBe(false);
    expect(canPerformAccountAction("Pending", "lock")).toBe(false);
  });

  it("allows unlocking suspended accounts but not active accounts", () => {
    expect(canPerformAccountAction("Suspended", "unlock")).toBe(true);
    expect(canPerformAccountAction("Active", "unlock")).toBe(false);
    expect(canPerformAccountAction("Pending", "unlock")).toBe(false);
  });
});

describe("normalizeAccountOperationError", () => {
  it.each([
    [{ status: 401 }, "unauthenticated"],
    [{ code: "FORBIDDEN" }, "forbidden"],
    [{ status: 400 }, "invalid_request"],
    [{ code: "ACCOUNT_NOT_FOUND" }, "not_found"],
    [{ status: 503 }, "unavailable"],
    [new TypeError("Network request failed"), "unavailable"],
    [{ status: 418 }, "unknown"],
  ] as const)("maps %j to a stable frontend error", (error, kind) => {
    expect(normalizeAccountOperationError(error)).toEqual({ kind });
  });

  it("provides user-facing text for authorization failures", () => {
    expect(getAccountOperationErrorMessage("forbidden")).toContain("do not have permission");
  });
});
