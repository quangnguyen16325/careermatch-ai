import type { WorkspaceNavigationItem } from "./types";

function normalizePath(path: string) {
  const withoutQueryOrHash = path.split(/[?#]/, 1)[0] || "/";
  const normalized = withoutQueryOrHash.replace(/\/+$/, "");

  return normalized || "/";
}

function isNavigationItemActive(pathname: string, href: string) {
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(href);

  return currentPath === targetPath || (targetPath !== "/" && currentPath.startsWith(`${targetPath}/`));
}

function getActiveNavigationItem(
  pathname: string,
  items: readonly WorkspaceNavigationItem[],
) {
  return items.find((item) => isNavigationItemActive(pathname, item.href));
}

export { getActiveNavigationItem, isNavigationItemActive };
