import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSkillCatalog, SkillCatalogApiError } from "./skillCatalogApi";

const skill = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "React",
  normalizedName: "react",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchSkillCatalog", () => {
  it("requests the skill catalog with trimmed search and the requested limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([skill]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchSkillCatalog("  rea  ", { limit: 15 })).resolves.toEqual([
      skill,
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/skills\?search=rea&limit=15$/),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("passes an abort signal to the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await searchSkillCatalog("react", { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("rejects non-success responses with their HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );

    await expect(searchSkillCatalog("react")).rejects.toMatchObject({
      name: "SkillCatalogApiError",
      status: 503,
    });
  });

  it("rejects payloads that do not match the catalog response contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [skill] }), { status: 200 }),
      ),
    );

    await expect(searchSkillCatalog("react")).rejects.toBeInstanceOf(
      SkillCatalogApiError,
    );
  });

  it("rejects records with invalid skill identifiers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([{ ...skill, id: "skill-1" }]),
          { status: 200 },
        ),
      ),
    );

    await expect(searchSkillCatalog("react")).rejects.toBeInstanceOf(
      SkillCatalogApiError,
    );
  });
});
