import { isValidUuid } from "./validation";
import type { SkillCatalogItem } from "./types";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api/v1").replace(
  /\/+$/,
  "",
);
const DEFAULT_SKILL_LIMIT = 20;

class SkillCatalogApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SkillCatalogApiError";
    this.status = status;
  }
}

function isSkillCatalogItem(value: unknown): value is SkillCatalogItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    isValidUuid(item.id) &&
    typeof item.name === "string" &&
    typeof item.normalizedName === "string"
  );
}

async function searchSkillCatalog(
  search: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<SkillCatalogItem[]> {
  const params = new URLSearchParams({
    search: search.trim(),
    limit: String(options.limit ?? DEFAULT_SKILL_LIMIT),
  });
  const response = await fetch(`${apiBaseUrl}/skills?${params}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  if (!response.ok) {
    throw new SkillCatalogApiError(
      "The skill catalog could not be loaded. Try again.",
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SkillCatalogApiError("The skill catalog returned invalid data.");
  }

  if (!Array.isArray(payload) || !payload.every(isSkillCatalogItem)) {
    throw new SkillCatalogApiError("The skill catalog returned invalid data.");
  }

  return payload;
}

export { DEFAULT_SKILL_LIMIT, searchSkillCatalog, SkillCatalogApiError };
