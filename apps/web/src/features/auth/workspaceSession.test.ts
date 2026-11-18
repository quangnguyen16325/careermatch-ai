import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceSession, resolveWorkspaceSession } from "./workspaceSession";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("resolveWorkspaceSession", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes the HttpOnly session and reads the current backend role", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: "signed-access-token", tokenType: "Bearer", expiresIn: 900 }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", role: "EMPLOYER", status: "ACTIVE" }));

    await expect(resolveWorkspaceSession()).resolves.toEqual({ status: "authenticated", role: "EMPLOYER" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/\/auth\/refresh$/), expect.objectContaining({ credentials: "include", method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringMatching(/\/auth\/me$/), expect.objectContaining({ headers: { Authorization: "Bearer signed-access-token" } }));
  });

  it("shares one refresh request between concurrent protected layouts", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: "signed-access-token", tokenType: "Bearer", expiresIn: 900 }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", role: "ADMIN", status: "ACTIVE" }));

    const sessions = await Promise.all([getWorkspaceSession(), getWorkspaceSession()]);

    expect(sessions).toEqual([
      { status: "authenticated", role: "ADMIN" },
      { status: "authenticated", role: "ADMIN" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a missing or expired refresh session as unauthenticated", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ code: "INVALID_REFRESH_TOKEN" }, 401));

    await expect(resolveWorkspaceSession()).resolves.toEqual({ status: "unauthenticated" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a backend permission failure without opening the workspace", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: "signed-access-token", tokenType: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ code: "FORBIDDEN" }, 403));

    await expect(resolveWorkspaceSession()).resolves.toEqual({ status: "forbidden" });
  });

  it("fails closed when the API cannot be reached or returns malformed identity", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network unavailable"));
    await expect(resolveWorkspaceSession()).resolves.toEqual({ status: "unavailable" });

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ accessToken: "signed-access-token", tokenType: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-1", role: 12 }));
    await expect(resolveWorkspaceSession()).resolves.toEqual({ status: "unavailable" });
  });
});
