import { afterEach, describe, expect, it, vi } from "vitest";
import { closeEmployerJob, listEmployerJobs } from "./jobManagementApi";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const job = {
  id: "job-1",
  title: "Engineer",
  description: "Build software",
  status: "PUBLISHED",
  location: "HCMC",
  workMode: "HYBRID",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  publishedAt: "2026-01-02T00:00:00.000Z",
  category: { id: "category-1", name: "Engineering" },
  skills: [{ skillId: "skill-1", required: true, weight: 1, skill: { id: "skill-1", name: "React" } }],
  _count: { applications: 3 },
};

afterEach(() => vi.unstubAllGlobals());

describe("listEmployerJobs", () => {
  it("refreshes the employer session and sends supported query parameters", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ data: [job], meta: { total: 1, page: 2, pageSize: 10, totalPages: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listEmployerJobs({ page: 2, pageSize: 10, search: "  engineer ", status: "PUBLISHED" })).resolves.toMatchObject({ data: [job] });
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/auth\/refresh$/), expect.objectContaining({ credentials: "include", method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/jobs\/my\?page=2&pageSize=10&search=engineer&status=PUBLISHED$/), expect.objectContaining({ headers: { Authorization: "Bearer access" } }));
  });

  it("rejects malformed pagination metadata rather than rendering invalid data", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ data: [job], meta: { page: "one" } })));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "The job service returned invalid job data." });
  });

  it("rejects malformed skill relations in a list response", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ data: [{ ...job, skills: [{}] }], meta: { total: 1, page: 1, pageSize: 20, totalPages: 1 } })));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "The job service returned invalid job data." });
  });

  it("reports authorization errors without exposing backend details", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ message: "sensitive internal details" }, 403)));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "You do not have permission to view these jobs.", status: 403 });
  });

  it("surfaces expired sessions and network failures as safe messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ code: "INVALID_REFRESH_TOKEN" }, 401)));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "Your session has expired. Please sign in again." });

    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockRejectedValueOnce(new TypeError("network unreachable")));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "Could not connect to the job service." });
  });
});

describe("closeEmployerJob", () => {
  it("uses the employer close endpoint and returns the server-confirmed job", async () => {
    const closedJob = { ...job, status: "CLOSED" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response(closedJob));
    vi.stubGlobal("fetch", fetchMock);

    await expect(closeEmployerJob("job-1")).resolves.toMatchObject({ id: "job-1", status: "CLOSED" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/jobs\/job-1\/close$/), expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer access" } }));
  });

  it("rejects an empty ID without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(closeEmployerJob("  ")).rejects.toMatchObject({ message: "A job ID is required before closing a posting." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report success when the backend rejects a stale close action", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ code: "INVALID_STATE_TRANSITION" }, 400)));
    await expect(closeEmployerJob("job-1")).rejects.toMatchObject({ status: 400, message: "This job can no longer be closed. Reload the list and check its current status." });
  });

  it("rejects a successful HTTP response when the returned job is not closed", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response(job)));
    await expect(closeEmployerJob("job-1")).rejects.toMatchObject({ message: "The job service returned an invalid close result." });
  });
});
