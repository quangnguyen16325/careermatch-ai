import { describe, expect, it } from "vitest";
import { canAccessWorkspace } from "./roleAccess";

describe("canAccessWorkspace", () => {
  it("allows an employer into the employer workspace", () => {
    expect(canAccessWorkspace("EMPLOYER", "employer")).toBe(true);
  });

  it("allows an admin into the admin workspace", () => {
    expect(canAccessWorkspace("ADMIN", "admin")).toBe(true);
  });

  it.each([
    ["EMPLOYER", "admin"],
    ["ADMIN", "employer"],
    ["STUDENT", "employer"],
    ["UNKNOWN", "admin"],
  ] as const)("denies role %s from the %s workspace", (role, requiredRole) => {
    expect(canAccessWorkspace(role, requiredRole)).toBe(false);
  });

  it("denies missing roles", () => {
    expect(canAccessWorkspace(undefined, "admin")).toBe(false);
  });
});
