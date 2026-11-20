type WorkspaceSessionResult =
  | { status: "authenticated"; role: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

type WorkspaceAccessResult =
  | { status: "authenticated"; role: string; accessToken: string }
  | Exclude<WorkspaceSessionResult, { status: "authenticated" }>;

type JsonObject = Record<string, unknown>;

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/+$/, "");
let pendingSession: Promise<WorkspaceAccessResult> | null = null;

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

async function resolveWorkspaceAccess(): Promise<WorkspaceAccessResult> {
  try {
    const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
      cache: "no-store",
      credentials: "include",
      method: "POST",
    });

    if (refreshResponse.status === 401) return { status: "unauthenticated" };
    if (!refreshResponse.ok) return { status: "unavailable" };

    const refreshPayload = await readJson(refreshResponse);
    if (!isJsonObject(refreshPayload) || typeof refreshPayload.accessToken !== "string" || refreshPayload.tokenType !== "Bearer") {
      return { status: "unavailable" };
    }

    const userResponse = await fetch(`${apiBaseUrl}/auth/me`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${refreshPayload.accessToken}` },
    });

    if (userResponse.status === 401) return { status: "unauthenticated" };
    if (userResponse.status === 403) return { status: "forbidden" };
    if (!userResponse.ok) return { status: "unavailable" };

    const userPayload = await readJson(userResponse);
    if (!isJsonObject(userPayload) || typeof userPayload.role !== "string" || !userPayload.role.trim()) {
      return { status: "unavailable" };
    }

    return {
      status: "authenticated",
      role: userPayload.role,
      accessToken: refreshPayload.accessToken,
    };
  } catch {
    return { status: "unavailable" };
  }
}

function getWorkspaceAccess() {
  if (pendingSession) return pendingSession;

  const request = resolveWorkspaceAccess();
  pendingSession = request;
  void request.then(() => {
    if (pendingSession === request) pendingSession = null;
  });

  return request;
}

async function resolveWorkspaceSession(): Promise<WorkspaceSessionResult> {
  const result = await resolveWorkspaceAccess();
  if (result.status !== "authenticated") return result;
  return { status: "authenticated", role: result.role };
}

async function getWorkspaceSession(): Promise<WorkspaceSessionResult> {
  const result = await getWorkspaceAccess();
  if (result.status !== "authenticated") return result;
  return { status: "authenticated", role: result.role };
}

export { getWorkspaceAccess, getWorkspaceSession, resolveWorkspaceSession };
export type { WorkspaceAccessResult, WorkspaceSessionResult };
