import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWorkspaceAccessToken } from "../../auth/workspaceSession";
import {
  CompanyVerificationApiError,
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
