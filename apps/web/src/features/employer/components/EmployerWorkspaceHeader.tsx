import { BriefcaseBusiness, Building2, Sparkles, UsersRound } from "lucide-react";
import { getActiveNavigationItem } from "../../navigation/navigationUtils";
import type { WorkspaceNavigationItem } from "../../navigation/types";

const employerNavigation: readonly WorkspaceNavigationItem[] = [
  { id: "company", label: "Company & jobs", href: "/employer.html" },
  { id: "candidates", label: "Candidates", href: "/candidates.html" },
];

type EmployerWorkspaceHeaderProps = {
  companyName?: string;
};

function EmployerWorkspaceHeader({ companyName = "Northstar Labs" }: EmployerWorkspaceHeaderProps) {
  const activeItem = getActiveNavigationItem(window.location.pathname, employerNavigation);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <a aria-label="CareerMatch AI home" className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="/">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Sparkles size={20} /></span>
          <span>
            <span className="block font-semibold tracking-tight text-slate-950">CareerMatch AI</span>
            <span className="block text-xs text-slate-500">Employer workspace</span>
          </span>
        </a>
        <div className="flex min-w-0 items-center gap-2 text-right text-xs text-slate-600 sm:text-sm lg:hidden">
          <Building2 className="shrink-0" size={16} />
          <span className="max-w-36 truncate sm:max-w-none">{companyName}</span>
        </div>
      </div>

      <nav aria-label="Employer workspace" className="flex flex-wrap gap-2">
        {employerNavigation.map((item) => {
          const isActive = activeItem?.id === item.id;
          const Icon = item.id === "candidates" ? UsersRound : BriefcaseBusiness;

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              href={item.href}
              key={item.id}
            >
              <Icon aria-hidden="true" size={17} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="hidden min-w-0 items-center gap-2 text-sm text-slate-600 lg:flex">
        <Building2 aria-hidden="true" size={16} />
        <span className="max-w-48 truncate">{companyName}</span>
      </div>
    </div>
  );
}

export { EmployerWorkspaceHeader };
