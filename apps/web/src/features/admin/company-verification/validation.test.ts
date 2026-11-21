import { describe, expect, it } from "vitest";
import { validateCompanyVerificationDecision } from "./validation";

describe("validateCompanyVerificationDecision", () => {
  it("allows approval without a reason", () => {
    expect(
      validateCompanyVerificationDecision({ status: "VERIFIED" }),
    ).toBeNull();
  });

  it("requires a rejection reason of at least ten non-whitespace characters", () => {
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "   ",
      }),
    ).toBe("reason-required");
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "  too short  ",
      }),
    ).toBe("reason-too-short");
  });

  it("accepts a trimmed rejection reason that meets the minimum", () => {
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "  Missing registration  ",
      }),
    ).toBeNull();
  });

  it("enforces the DTO maximum after trimming", () => {
    expect(
      validateCompanyVerificationDecision({
        status: "VERIFIED",
        reason: "x".repeat(1001),
      }),
    ).toBe("reason-too-long");
  });

  it("accepts the exact minimum and rejects a nine-character trimmed reason", () => {
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "123456789",
      }),
    ).toBe("reason-too-short");
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "  1234567890  ",
      }),
    ).toBeNull();
  });

  it("allows a 1000-character reason and rejects 1001 characters", () => {
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "x".repeat(1000),
      }),
    ).toBeNull();
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "x".repeat(1001),
      }),
    ).toBe("reason-too-long");
  });
});
