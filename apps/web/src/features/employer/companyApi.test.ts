import { describe, expect, it } from "vitest";
import {
  companyVerificationStatuses,
  getCompanyVerificationLabel,
  normalizeCompanyApiFailure,
  toCompanyProfileRequest,
} from "./companyApi";

describe("company API contract helpers", () => {
  it("matches the backend verification statuses", () => {
    expect(companyVerificationStatuses).toEqual([
      "PENDING",
      "VERIFIED",
      "REJECTED",
    ]);
    expect(
      companyVerificationStatuses.map(getCompanyVerificationLabel),
    ).toEqual(["Pending verification", "Verified", "Rejected"]);
  });

  it("preserves structured backend error codes and messages", () => {
    expect(
      normalizeCompanyApiFailure(409, {
        code: "TAX_CODE_EXISTS",
        message: "A company with this tax code is already registered",
      }),
    ).toEqual({
      status: 409,
      code: "TAX_CODE_EXISTS",
      message: "A company with this tax code is already registered",
      details: [],
    });
  });

  it("normalizes validation message arrays without dropping field details", () => {
    expect(
      normalizeCompanyApiFailure(400, {
        statusCode: 400,
        message: [
          "name must be longer than or equal to 2 characters",
          "website must be a string",
        ],
        error: "Bad Request",
      }),
    ).toEqual({
      status: 400,
      message:
        "name must be longer than or equal to 2 characters website must be a string",
      details: [
        "name must be longer than or equal to 2 characters",
        "website must be a string",
      ],
    });
  });

  it("provides a safe fallback for empty or unstructured failures", () => {
    expect(normalizeCompanyApiFailure(503, null)).toEqual({
      status: 503,
      message: "Company request failed.",
      details: [],
    });
  });

  it("creates a request with only fields supported by the create DTO", () => {
    expect(
      toCompanyProfileRequest("create", {
        name: "  CareerMatch Labs  ",
        description: "  Hiring tools  ",
        website: "",
        location: " Hanoi ",
        taxCode: "0123456789",
      }),
    ).toEqual({
      name: "CareerMatch Labs",
      description: "Hiring tools",
      location: "Hanoi",
      taxCode: "0123456789",
    });
  });

  it("uses nullable update fields to clear values and omits a blank optional name", () => {
    expect(
      toCompanyProfileRequest("update", {
        name: " ",
        description: "",
        website: "https://careermatch.example",
        location: "",
        taxCode: "",
      }),
    ).toEqual({
      description: null,
      website: "https://careermatch.example",
      location: null,
      taxCode: null,
    });
  });
});
