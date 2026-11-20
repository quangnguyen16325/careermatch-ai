import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWorkspaceAccessToken } from "../../auth/workspaceSession";
import {
  CompanyVerificationApiError,
  decideCompanyVerification,
  getCompanyVerificationQueue,
} from "./companyVerificationApi";

vi.mock("../../auth/workspaceSession", () => ({
  resolveWorkspaceAccessToken: vi.fn(),
}));

const accessTokenMock = vi.mocked(resolveWorkspaceAccessToken);
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

const queueResponse = {
  data: [
    {
      id: "company-1",
      name: "Example Company",
      description: null,
      website: null,
      location: "Hanoi",
      taxCode: "TAX-1",
      verificationStatus: "PENDING",
      verifiedAt: null,
      createdAt: "2026-11-19T00:00:00.000Z",
      updatedAt: "2026-11-19T00:00:00.000Z",
      _count: { jobs: 2, employers: 1 },
    },
  ],
  meta: { total: 1, page: 2, pageSize: 10, totalPages: 1 },
};

describe("getCompanyVerificationQueue", () => {
  beforeEach(() => {
    accessTokenMock.mockReset();
    accessTokenMock.mockResolvedValue({
      status: "authenticated",
      accessToken: "fresh-access-token",
    });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the API with bearer auth and query, status, and pagination filters", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(queueResponse));

    await expect(
      getCompanyVerificationQueue({
        page: 2,
        pageSize: 10,
        status: "PENDING",
        search: " TAX-1 ",
      }),
    ).resolves.toEqual(queueResponse);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/admin/companies?");
    expect(new URL(url, "http://localhost").searchParams.toString()).toBe(
      "page=2&pageSize=10&status=PENDING&search=TAX-1",
    );
    expect(options.headers).toEqual({
      Authorization: "Bearer fresh-access-token",
    });
  });

  it("supports omitting the optional filters", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      }),
    );

    await getCompanyVerificationQueue({});

    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/admin\/companies$/);
  });

  it("reports unauthenticated and unavailable refresh sessions without calling the companies API", async () => {
    accessTokenMock.mockResolvedValueOnce({ status: "unauthenticated" });
    await expect(getCompanyVerificationQueue({})).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });

    accessTokenMock.mockResolvedValueOnce({ status: "unavailable" });
    await expect(getCompanyVerificationQueue({})).rejects.toMatchObject({
      status: null,
      code: "SESSION_UNAVAILABLE",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves API authorization errors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: "FORBIDDEN", message: "Forbidden" }, 403),
    );

    await expect(getCompanyVerificationQueue({})).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
    });
  });

  it("rejects a successful response that does not match the API contract", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: "incomplete" }], meta: {} }),
    );

    const error = await getCompanyVerificationQueue({}).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(CompanyVerificationApiError);
    expect(error).toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("reports network failures distinctly", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(getCompanyVerificationQueue({})).rejects.toMatchObject({
      status: null,
      code: "NETWORK_ERROR",
    });
  });
});

describe("decideCompanyVerification", () => {
  beforeEach(() => {
    accessTokenMock.mockReset();
    accessTokenMock.mockResolvedValue({
      status: "authenticated",
      accessToken: "fresh-access-token",
    });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PATCHes the confirmed status using the existing bearer session", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "company-1", verificationStatus: "VERIFIED" }),
    );

    await expect(
      decideCompanyVerification("company-1", { status: "VERIFIED" }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/admin/companies/company-1/verify");
    expect(options.method).toBe("PATCH");
    expect(options.headers).toEqual({
      Authorization: "Bearer fresh-access-token",
      "Content-Type": "application/json",
    });
    expect(options.body).toBe(JSON.stringify({ status: "VERIFIED" }));
  });

  it("trims a valid rejection reason and sends it in the backend DTO", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "company-1", verificationStatus: "REJECTED" }),
    );

    await decideCompanyVerification("company-1", {
      status: "REJECTED",
      reason: "  Missing registration  ",
    });

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.body).toBe(
      JSON.stringify({ status: "REJECTED", reason: "Missing registration" }),
    );
  });

  it("does not send a mutation without a company id or valid rejection reason", async () => {
    await expect(
      decideCompanyVerification("  ", { status: "VERIFIED" }),
    ).rejects.toMatchObject({ code: "COMPANY_ID_REQUIRED" });
    await expect(
      decideCompanyVerification("company-1", {
        status: "REJECTED",
        reason: "  too short  ",
      }),
    ).rejects.toMatchObject({ code: "REASON_TOO_SHORT" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(accessTokenMock).not.toHaveBeenCalled();
  });

  it("does not treat an error response as a successful decision", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: "INVALID_STATE_TRANSITION",
          message: "Cannot transition company verification",
        },
        400,
      ),
    );

    await expect(
      decideCompanyVerification("company-1", { status: "VERIFIED" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "INVALID_STATE_TRANSITION",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves forbidden responses from the Admin mutation endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: "FORBIDDEN", message: "Forbidden" }, 403),
    );

    await expect(
      decideCompanyVerification("company-1", { status: "VERIFIED" }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("requires the response to confirm the requested company and status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "company-1", verificationStatus: "PENDING" }),
    );

    await expect(
      decideCompanyVerification("company-1", { status: "VERIFIED" }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("surfaces network failures without automatically retrying", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      decideCompanyVerification("company-1", { status: "VERIFIED" }),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
