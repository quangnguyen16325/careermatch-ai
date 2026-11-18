import { Building2, ClipboardCheck, Flag, LayoutDashboard, Users } from "lucide-react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { AdminSection } from "../types";

const navigation: { label: AdminSection; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Employers", icon: Building2 },
  { label: "Job moderation", icon: ClipboardCheck },
  { label: "Reports", icon: Flag },
];

type AdminSectionNavigationProps = {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
  variant: "sidebar" | "mobile";
};

function AdminSectionNavigation({ activeSection, onNavigate, variant }: AdminSectionNavigationProps) {
  const isSidebar = variant === "sidebar";
  const listClassName = isSidebar ? "mt-3 space-y-1" : "grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-3 lg:hidden";

  return (
    <nav aria-label="Admin sections" className={listClassName}>
      {navigation.map(({ icon: Icon, label }) => {
        const isActive = activeSection === label;
        const buttonClassName = isSidebar
          ? `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`
          : `flex min-h-11 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50"}`;

        return (
          <button
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName}
            key={label}
            onClick={() => onNavigate(label)}
            type="button"
          >
            <Icon aria-hidden="true" className={isActive && isSidebar ? "text-emerald-700" : isSidebar ? "text-slate-400" : undefined} size={isSidebar ? 18 : 16} />
            {label}
            {isSidebar && label === "Job moderation" ? <StatusBadge className="ml-auto" tone="warning">3</StatusBadge> : null}
          </button>
        );
      })}
    </nav>
  );
}

export { AdminSectionNavigation };
