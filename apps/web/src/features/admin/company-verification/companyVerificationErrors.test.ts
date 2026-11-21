import { describe, expect, it } from "vitest";
import { CompanyVerificationApiError } from "./companyVerificationApi";
import {
  getDecisionErrorMessage,
  getQueueErrorMessage,
} from "./companyVerificationErrors";

describe("company verification error messages", () => {
  it("explains authentication and authorization failures", () => {
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError(
          "Unauthorized",
          401,
          "AUTHENTICATION_REQUIRED",
        ),
      ),
    ).toMatch(/session has expired/i);
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError("Forbidden", 403, "FORBIDDEN"),
      ),
    ).toMatch(/permission/i);
  });

  it("offers a refresh path for stale or missing company decisions", () => {
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError(
          "Status changed",
          400,
          "INVALID_STATE_TRANSITION",
        ),
      ),
    ).toMatch(/status changed.*refresh/i);
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError("Missing", 404, "COMPANY_NOT_FOUND"),
      ),
    ).toMatch(/no longer exists.*refresh/i);
  });

  it("distinguishes a saved decision from a failed queue refresh", () => {
    expect(getQueueErrorMessage(new Error("network error"), true)).toMatch(
      /decision was saved.*could not be refreshed/i,
    );
  });

  it("uses service-safe messages for network and server failures", () => {
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError(
          "Connection lost",
          null,
          "NETWORK_ERROR",
        ),
      ),
    ).toMatch(/refresh the queue/i);
    expect(
      getDecisionErrorMessage(
        new CompanyVerificationApiError("Internal details", 500),
      ),
    ).toMatch(/service is unavailable/i);
  });
});
