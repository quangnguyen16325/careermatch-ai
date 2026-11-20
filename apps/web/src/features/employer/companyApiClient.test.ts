import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMyCompanyProfile,
  getMyCompanyProfile,
  updateMyCompanyProfile,
} from "./companyApiClient";
import type { CompanyApiProfile } from "./companyApi";

const authFetch = vi.fn();
const companyFetch = vi.fn();

const profile: CompanyApiProfile = {
  id: "company-1",
  name: "CareerMatch Labs",
  description: null,
  website: null,
  location: null,
  taxCode: null,
  verificationStatus: "PENDING",
  verifiedAt: null,
  createdAt: "2026-11-20T00:00:00.000Z",
  updatedAt: "2026-11-20T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function authenticate(role = "EMPLOYER") {
  authFetch
    .mockResolvedValueOnce(jsonResponse({ accessToken: "token", tokenType: "Bearer" }))
    .mockResolvedValueOnce(jsonResponse({ id: "employer-1", role }));
}

describe("Company Profile API client", () => {
  beforeEach(() => {
    authFetch.mockReset();
    companyFetch.mockReset();
    vi.stubGlobal("fetch", authFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("loads the current employer profile with the refreshed bearer token", async () => {
    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse(profile));

    await expect(getMyCompanyProfile(companyFetch)).resolves.toEqual(profile);
    expect(authFetch).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/auth\/refresh$/), expect.objectContaining({ credentials: "include" }));
    expect(companyFetch).toHaveBeenCalledWith(expect.stringMatching(/\/companies\/my$/), expect.objectContaining({
      method: "GET",
      headers: { Authorization: "Bearer token" },
      cache: "no-store",
    }));
  });

  it("treats only the documented COMPANY_NOT_FOUND response as a missing profile", async () => {
    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse({ code: "COMPANY_NOT_FOUND", message: "No company" }, 404));
    await expect(getMyCompanyProfile(companyFetch)).resolves.toBeNull();

    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse({ code: "EMPLOYER_PROFILE_NOT_FOUND" }, 404));
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 404, code: "EMPLOYER_PROFILE_NOT_FOUND" } });
  });

  it("creates a company through POST /companies and uses only DTO fields", async () => {
    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse(profile, 201));
    const payload = { name: "CareerMatch Labs", website: "careermatch.example" };

    await expect(createMyCompanyProfile(payload, companyFetch)).resolves.toEqual(profile);
    const [, request] = companyFetch.mock.calls[0] as [string, RequestInit];
    expect(companyFetch.mock.calls[0]?.[0]).toMatch(/\/companies$/);
    expect(JSON.parse(String(request.body))).toEqual(payload);
    expect(JSON.stringify(request.body)).not.toContain("verificationStatus");
  });

  it("updates the current company through PATCH /companies/my and preserves nullable fields", async () => {
    authenticate();
    const updated = { ...profile, description: "Updated" };
    companyFetch.mockResolvedValueOnce(jsonResponse(updated));
    const payload = { description: "Updated", website: null };

    await expect(updateMyCompanyProfile(payload, companyFetch)).resolves.toEqual(updated);
    const [url, request] = companyFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/companies\/my$/);
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(String(request.body))).toEqual(payload);
  });

  it("fails closed for non-employer roles without calling the company API", async () => {
    authenticate("ADMIN");
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 403 } });
    expect(companyFetch).not.toHaveBeenCalled();
  });

  it("propagates unauthenticated and forbidden session results before company requests", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ code: "AUTHENTICATION_REQUIRED" }, 401));
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 401 } });

    authFetch
      .mockResolvedValueOnce(jsonResponse({ accessToken: "token", tokenType: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ code: "FORBIDDEN" }, 403));
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 403 } });
    expect(companyFetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 422, 500])("preserves API status %s without treating the write as successful", async (status) => {
    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse({ code: status === 409 ? "TAX_CODE_EXISTS" : "REQUEST_FAILED", message: "Request failed" }, status));
    await expect(createMyCompanyProfile({ name: "CareerMatch" }, companyFetch)).rejects.toMatchObject({ failure: { status } });
    expect(companyFetch).toHaveBeenCalledTimes(1);
  });

  it("normalizes network errors and malformed successful payloads as failures", async () => {
    authenticate();
    companyFetch.mockRejectedValueOnce(new TypeError("offline"));
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 0 } });

    authenticate();
    companyFetch.mockResolvedValueOnce(jsonResponse({ id: "company-1" }));
    await expect(getMyCompanyProfile(companyFetch)).rejects.toMatchObject({ failure: { status: 502, code: "INVALID_COMPANY_RESPONSE" } });
  });
});
