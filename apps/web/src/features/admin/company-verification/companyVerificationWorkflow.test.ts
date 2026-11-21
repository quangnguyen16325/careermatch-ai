import { describe, expect, it } from "vitest";
import {
  getAvailableDecisions,
  getDecisionLabel,
  isAllowedTransition,
  isLatestQueueRequest,
} from "./companyVerificationWorkflow";

describe("company verification workflow", () => {
  it("offers approve and reject for pending companies", () => {
    expect(getAvailableDecisions("PENDING")).toEqual(["VERIFIED", "REJECTED"]);
    expect(isAllowedTransition("PENDING", "VERIFIED")).toBe(true);
    expect(isAllowedTransition("PENDING", "REJECTED")).toBe(true);
    expect(getDecisionLabel("VERIFIED", "PENDING")).toBe("Approve");
    expect(getDecisionLabel("REJECTED", "PENDING")).toBe("Reject");
  });

  it("only offers revocation for verified companies", () => {
    expect(getAvailableDecisions("VERIFIED")).toEqual(["REJECTED"]);
    expect(isAllowedTransition("VERIFIED", "REJECTED")).toBe(true);
    expect(isAllowedTransition("VERIFIED", "VERIFIED")).toBe(false);
    expect(getDecisionLabel("REJECTED", "VERIFIED")).toBe(
      "Revoke verification",
    );
  });

  it("only offers re-verification for rejected companies", () => {
    expect(getAvailableDecisions("REJECTED")).toEqual(["VERIFIED"]);
    expect(isAllowedTransition("REJECTED", "VERIFIED")).toBe(true);
    expect(isAllowedTransition("REJECTED", "REJECTED")).toBe(false);
    expect(getDecisionLabel("VERIFIED", "REJECTED")).toBe("Verify again");
  });

  it("ignores older and aborted queue requests", () => {
    expect(isLatestQueueRequest(1, 2, false)).toBe(false);
    expect(isLatestQueueRequest(2, 2, false)).toBe(true);
    expect(isLatestQueueRequest(2, 2, true)).toBe(false);
  });
});
