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
        JSON.stringify({
          accessToken: "fresh-access-token",
          tokenType: "Bearer",
        }),
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
        JSON.stringify({
          data: [job],
          meta: { total: 1, page: 1, pageSize: 100, totalPages: 1 },
        }),
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
        headers: expect.objectContaining({
          Authorization: "Bearer fresh-access-token",
        }),
      }),
    );
  });

  it("loads each page when the employer job list spans multiple pages", async () => {
    const secondJob = { ...job, id: "b0000000-0000-4000-8000-000000000002" };
    const page = (data: (typeof job)[], pageNumber: number) =>
      new Response(
        JSON.stringify({
          data,
          meta: { total: 101, page: pageNumber, pageSize: 100, totalPages: 2 },
        }),
        { status: 200 },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ accessToken: "token", tokenType: "Bearer" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(page([job], 1))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ accessToken: "token", tokenType: "Bearer" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(page([secondJob], 2));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listEmployerJobs()).resolves.toMatchObject({
      data: [job, secondJob],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/jobs\/my\?page=1&pageSize=100$/),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(/\/jobs\/my\?page=2&pageSize=100$/),
      expect.any(Object),
    );
  });

  it("rejects a list response with malformed pagination metadata", async () => {
    stubAuthenticatedResponses(
      new Response(
        JSON.stringify({ data: [job], meta: { totalPages: "many" } }),
        { status: 200 },
      ),
    );

    await expect(listEmployerJobs()).rejects.toMatchObject({
      name: "JobApiError",
      message: "The job service returned invalid job data.",
    });
  });

  it("creates a draft with the validated create payload", async () => {
    const fetchMock = stubAuthenticatedResponses(
      new Response(JSON.stringify(job), { status: 201 }),
    );
    const payload = {
      title: job.title,
      description: job.description,
      skills: [
        {
          skillId: "a0000000-0000-4000-8000-000000000001",
          required: true,
          weight: 1,
        },
      ],
    };

    await expect(createJobDraft(payload)).resolves.toMatchObject({
      id: job.id,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/jobs$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("maps persisted job skills back into the editor selection", () => {
    const skillId = "a0000000-0000-4000-8000-000000000001";
    const mapped = mapEmployerJob({
      ...job,
      categoryId: "c0000000-0000-4000-8000-000000000001",
      category: {
        id: "c0000000-0000-4000-8000-000000000001",
        name: "Engineering",
      },
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
      new Response(JSON.stringify({ ...job, title: "Updated title" }), {
        status: 200,
      }),
    );
    const skills = [
      {
        skillId: "a0000000-0000-4000-8000-000000000001",
        required: false,
        weight: 2.5,
      },
    ];
    await expect(
      updateJobDraft(job.id, { title: "Updated title", skills }),
    ).resolves.toMatchObject({
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
      new Response(
        JSON.stringify({ code: "FORBIDDEN", message: "Forbidden" }),
        { status: 403 },
      ),
    );
    await expect(getEmployerJob(job.id)).rejects.toMatchObject({
      name: "JobApiError",
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(updateJobDraft("", {})).rejects.toBeInstanceOf(JobApiError);
  });

  it.each([
    [400, "Some job details are invalid. Review the form and try again."],
    [401, "Your session has expired. Sign in again."],
    [403, "You do not have permission to manage this job."],
    [404, "This job could not be found or is no longer available."],
    [503, "The job service is temporarily unavailable. Try again."],
  ])("maps HTTP %i to a safe, actionable message", async (status, message) => {
    stubAuthenticatedResponses(
      new Response(JSON.stringify({ message: ["internal detail"] }), {
        status,
      }),
    );

    await expect(
      createJobDraft({
        title: "Frontend",
        description: "Build useful experiences.",
      }),
    ).rejects.toMatchObject({ status, message });
  });

  it("does not expose raw server messages for unexpected failures", async () => {
    stubAuthenticatedResponses(
      new Response(
        JSON.stringify({ message: "sensitive internal stack detail" }),
        { status: 409 },
      ),
    );

    await expect(
      createJobDraft({
        title: "Frontend",
        description: "Build useful experiences.",
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "The job could not be saved. Try again.",
    });
  });

  it("explains when the backend says a job status no longer permits editing", async () => {
    stubAuthenticatedResponses(
      new Response(
        JSON.stringify({ code: "CANNOT_EDIT_JOB", message: "internal detail" }),
        { status: 400 },
      ),
    );

    await expect(
      updateJobDraft(job.id, { title: "Updated title" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "CANNOT_EDIT_JOB",
      message:
        "This job's status changed and it can no longer be edited. Reload the job list and try again.",
    });
  });

  it("reports a connection failure without leaking request details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "fresh-access-token",
            tokenType: "Bearer",
          }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(new Error("network internals"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createJobDraft({
        title: "Frontend",
        description: "Build useful experiences.",
      }),
    ).rejects.toMatchObject({
      name: "JobApiError",
      message: "Could not connect to the job service.",
    });
  });

  it("rejects malformed mutation responses instead of treating them as saved jobs", async () => {
    stubAuthenticatedResponses(
      new Response(JSON.stringify({ id: job.id, title: job.title }), {
        status: 201,
      }),
    );

    await expect(
      createJobDraft({
        title: "Frontend",
        description: "Build useful experiences.",
      }),
    ).rejects.toMatchObject({
      name: "JobApiError",
      message: "The job service returned invalid job data.",
    });
  });

  it("reports an expired session when token refresh is unauthorized", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listEmployerJobs()).rejects.toMatchObject({
      name: "JobApiError",
      status: 401,
      message: "Your session has expired. Sign in again.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
