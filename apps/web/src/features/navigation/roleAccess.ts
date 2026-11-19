import type { WorkspaceRole } from "./types";

function canAccessWorkspace(userRole: string | undefined, requiredRole: WorkspaceRole) {
  return userRole?.toUpperCase() === requiredRole.toUpperCase();
}

export { canAccessWorkspace };
