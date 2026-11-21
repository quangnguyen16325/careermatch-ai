import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createJobDraft,
  getEmployerJob,
  JobApiError,
  listEmployerJobs,
  mapEmployerJob,
  updateJobDraft,
} from "./jobApi";

const job = {
  id: "b0000000-0000-4000-8000-000000000001",
  title: "Frontend Engineer",
  description: "Build product experiences.",
  location: null,
  workMode: "REMOTE" as const,
  categoryId: null,
  category: null,
  status: "DRAFT" as const,
  skills: [],
};

function stubAuthenticatedResponses(finalResponse: Response) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ accessToken: "fresh-access-token", tokenType: "Bearer" }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(finalResponse);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("job API client", () => {
  it("loads employer jobs from the paginated endpoint with a refreshed bearer token", async () => {
    const fetchMock = stubAuthenticatedResponses(
      new Response(
        JSON.stringify({ data: [job], meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 } }),
        { status: 200 },
      ),
    );

    await expect(listEmployerJobs()).resolves.toMatchObject({ data: [job] });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/auth\/refresh$/),
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/jobs\/my\?page=1&pageSize=100$/),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer fresh-access-token" }),
      }),
    );
  });

  it("creates a draft with the validated create payload", async () => {
    const fetchMock = stubAuthenticatedResponses(
      new Response(JSON.stringify(job), { status: 201 }),
    );
    const payload = {
      title: job.title,
      description: job.description,
      skills: [{ skillId: "a0000000-0000-4000-8000-000000000001", required: true, weight: 1 }],
    };

    await expect(createJobDraft(payload)).resolves.toMatchObject({ id: job.id });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/jobs$/),
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  it("maps persisted job skills back into the editor selection", () => {
    const skillId = "a0000000-0000-4000-8000-000000000001";
    const mapped = mapEmployerJob({
      ...job,
      categoryId: "c0000000-0000-4000-8000-000000000001",
      category: { id: "c0000000-0000-4000-8000-000000000001", name: "Engineering" },
      skills: [
        {
          skillId,
          required: false,
          weight: 2.5,
          skill: { id: skillId, name: "React", normalizedName: "react" },
        },
      ],
    });

    expect(mapped).toMatchObject({
      categoryId: "c0000000-0000-4000-8000-000000000001",
      department: "Engineering",
      requiredSkills: [
        { id: skillId, name: "React", required: false, weight: 2.5 },
      ],
    });
  });

  it("reads job details and updates that job with PATCH rather than creating another", async () => {
    stubAuthenticatedResponses(
      new Response(JSON.stringify(job), { status: 200 }),
    );
    await expect(getEmployerJob(job.id)).resolves.toMatchObject({ id: job.id });

    const patchMock = stubAuthenticatedResponses(
      new Response(JSON.stringify({ ...job, title: "Updated title" }), { status: 200 }),
    );
    const skills = [
      { skillId: "a0000000-0000-4000-8000-000000000001", required: false, weight: 2.5 },
    ];
    await expect(updateJobDraft(job.id, { title: "Updated title", skills })).resolves.toMatchObject({
      title: "Updated title",
    });
    expect(patchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(new RegExp(`/jobs/${job.id}$`)),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "Updated title", skills }),
      }),
    );
  });

  it("surfaces authorization failures and rejects missing job IDs", async () => {
    stubAuthenticatedResponses(
      new Response(JSON.stringify({ code: "FORBIDDEN", message: "Forbidden" }), { status: 403 }),
    );
    await expect(getEmployerJob(job.id)).rejects.toMatchObject({
      name: "JobApiError",
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(updateJobDraft("", {})).rejects.toBeInstanceOf(JobApiError);
  });

  it("reports an expired session when token refresh is unauthorized", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listEmployerJobs()).rejects.toMatchObject({
      name: "JobApiError",
      status: 401,
      message: "Your session has expired. Sign in again.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
