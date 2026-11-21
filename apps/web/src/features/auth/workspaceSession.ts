type WorkspaceSessionResult =
  | { status: "authenticated"; role: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

type JsonObject = Record<string, unknown>;

class WorkspaceSessionError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/+$/, "");
let pendingSession: Promise<WorkspaceSessionResult> | null = null;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function refreshWorkspaceAccessToken(): Promise<string> {
  const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
    cache: "no-store",
    credentials: "include",
    method: "POST",
  });
  if (!refreshResponse.ok) throw new WorkspaceSessionError(`Session refresh failed (${refreshResponse.status}).`, refreshResponse.status);
  const payload = await readJson(refreshResponse);
  if (!isJsonObject(payload) || typeof payload.accessToken !== "string" || payload.tokenType !== "Bearer") {
    throw new WorkspaceSessionError("Session refresh returned an invalid access token.");
  }
  return payload.accessToken;
}

async function resolveWorkspaceSession(): Promise<WorkspaceSessionResult> {
  try {
    const accessToken = await refreshWorkspaceAccessToken();

    const userResponse = await fetch(`${apiBaseUrl}/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (userResponse.status === 401) return { status: "unauthenticated" };
    if (userResponse.status === 403) return { status: "forbidden" };
    if (!userResponse.ok) return { status: "unavailable" };

    const userPayload = await readJson(userResponse);
    if (!isJsonObject(userPayload) || typeof userPayload.role !== "string" || !userPayload.role.trim()) {
      return { status: "unavailable" };
    }

    return { status: "authenticated", role: userPayload.role };
  } catch (error) {
    if (error instanceof WorkspaceSessionError && error.status === 401) return { status: "unauthenticated" };
    return { status: "unavailable" };
  }
}

function getWorkspaceSession() {
  if (pendingSession) return pendingSession;

  const request = resolveWorkspaceSession();
  pendingSession = request;
  void request.then(() => {
    if (pendingSession === request) pendingSession = null;
  });

  return request;
}

export { getWorkspaceSession, resolveWorkspaceSession };
export { refreshWorkspaceAccessToken };
export type { WorkspaceSessionResult };
