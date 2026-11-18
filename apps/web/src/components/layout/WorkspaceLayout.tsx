import type { ReactNode } from "react";

type WorkspaceLayoutProps = {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
};

function WorkspaceLayout({
  children,
  className = "",
  header,
}: WorkspaceLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {header ? (
        <header className="border-b border-slate-200 bg-white">{header}</header>
      ) : null}
      <main className={`mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${className}`}>
        {children}
      </main>
    </div>
  );
}

export { WorkspaceLayout };
export type { WorkspaceLayoutProps };
