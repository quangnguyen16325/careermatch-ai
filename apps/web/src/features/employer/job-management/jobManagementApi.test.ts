import { afterEach, describe, expect, it, vi } from "vitest";
import { listEmployerJobs } from "./jobManagementApi";

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

  it("reports authorization errors without exposing backend details", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ accessToken: "access", tokenType: "Bearer" }))
      .mockResolvedValueOnce(response({ message: "sensitive internal details" }, 403)));
    await expect(listEmployerJobs()).rejects.toMatchObject({ message: "You do not have permission to view these jobs.", status: 403 });
  });
});
