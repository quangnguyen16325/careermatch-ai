import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, LoaderCircle, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getWorkspaceSession } from "../auth/workspaceSession";
import type { WorkspaceSessionResult } from "../auth/workspaceSession";
import { canAccessWorkspace } from "./roleAccess";
import type { WorkspaceRole } from "./types";

type RoleProtectedLayoutProps = {
  children: ReactNode;
  requiredRole: WorkspaceRole;
};

function RoleProtectedLayout({ children, requiredRole }: RoleProtectedLayoutProps) {
  const [session, setSession] = useState<WorkspaceSessionResult | { status: "loading" }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    void getWorkspaceSession().then((result) => {
      if (isCurrent) setSession(result);
    });

    return () => {
      isCurrent = false;
    };
  }, [attempt]);

  if (session.status === "authenticated" && canAccessWorkspace(session.role, requiredRole)) {
    return children;
  }

  const isLoading = session.status === "loading";
  const isUnauthenticated = session.status === "unauthenticated";
  const isForbidden = session.status === "forbidden" || session.status === "authenticated";
  const heading = isLoading
    ? "Verifying your session"
    : isUnauthenticated
      ? "Sign in required"
      : isForbidden
        ? "Access not permitted"
        : "Workspace unavailable";
  const message = isLoading
    ? "We are checking your account before opening this workspace."
    : isUnauthenticated
      ? "No active session was found. This frontend does not include a sign-in page yet; establish a session through the supported authentication flow, then return here."
      : isForbidden
        ? session.status === "authenticated"
          ? `This page requires the ${requiredRole} role. Your current role is ${session.role}.`
          : "Your account is not allowed to access this workspace."
        : "We could not verify your account right now. Check your connection and try again.";
  const Icon = isLoading ? LoaderCircle : isForbidden ? ShieldAlert : LockKeyhole;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:grid sm:place-items-center sm:px-6">
      <main aria-busy={isLoading} className="mx-auto w-full max-w-xl">
        <a aria-label="CareerMatch AI home" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href="/">
          <ArrowLeft aria-hidden="true" size={16} />
          CareerMatch AI
        </a>
        <Card className="text-center" padding="lg" role={isLoading ? "status" : "alert"}>
          <span className={`mx-auto grid size-12 place-items-center rounded-2xl ${isForbidden ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
            <Icon aria-hidden="true" className={isLoading ? "animate-spin" : ""} size={22} />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!isLoading && !isForbidden ? (
              <Button icon={<RefreshCw aria-hidden="true" size={16} />} onClick={() => { setSession({ status: "loading" }); setAttempt((current) => current + 1); }}>
                Try again
              </Button>
            ) : null}
            {!isLoading ? (
              <a className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" href="/">
                Return to home
              </a>
            ) : null}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">Workspace access is checked in the browser for navigation. Backend APIs must enforce permissions for protected data and actions.</p>
        </Card>
      </main>
    </div>
  );
}

export { RoleProtectedLayout };
