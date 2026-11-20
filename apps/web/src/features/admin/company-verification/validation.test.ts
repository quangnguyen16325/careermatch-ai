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
    expect(
      validateCompanyVerificationDecision({
        status: "REJECTED",
        reason: "x".repeat(1000),
      }),
    ).toBeNull();
  });
});
