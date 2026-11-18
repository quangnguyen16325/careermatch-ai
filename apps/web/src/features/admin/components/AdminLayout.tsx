import type { ReactNode } from "react";
import { useState } from "react";
import { Building2, ChevronDown, ClipboardCheck, Flag, LayoutDashboard, ShieldCheck, Sparkles, Users } from "lucide-react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { AdminSection } from "../types";

const navigation: { label: AdminSection; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Employers", icon: Building2 },
  { label: "Job moderation", icon: ClipboardCheck },
  { label: "Reports", icon: Flag },
];

type AdminLayoutProps = {
  activeSection: AdminSection;
  children: ReactNode;
  onNavigate: (section: AdminSection) => void;
};

function AdminLayout({ activeSection, children, onNavigate }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigate(section: AdminSection) {
    onNavigate(section);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Sparkles size={20} /></span>
          <div>
            <p className="font-semibold tracking-tight">CareerMatch AI</p>
            <p className="text-xs text-slate-500">Platform operations</p>
          </div>
        </div>
        <div className="px-4 pt-6">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <nav aria-label="Admin sections" className="mt-3 space-y-1">
            {navigation.map(({ icon: Icon, label }) => (
              <button aria-current={activeSection === label ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition ${activeSection === label ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} key={label} onClick={() => navigate(label)} type="button">
                <Icon className={activeSection === label ? "text-emerald-700" : "text-slate-400"} size={18} />
                {label}
                {label === "Job moderation" ? <StatusBadge className="ml-auto" tone="warning">3</StatusBadge> : null}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-slate-100 p-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid size-9 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">ML</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Mai Le</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <ShieldCheck className="ml-auto shrink-0 text-emerald-700" size={17} />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Sparkles size={18} /></span>
              <div>
                <p className="text-sm font-semibold">CareerMatch AI</p>
                <p className="text-[11px] text-slate-500">Admin workspace</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-slate-500">Admin workspace</p>
              <p className="font-semibold">{activeSection}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:inline">System status</span>
              <StatusBadge tone="success">Operational</StatusBadge>
              <button aria-expanded={mobileMenuOpen} aria-label="Toggle admin navigation" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" onClick={() => setMobileMenuOpen((open) => !open)} type="button">
                <ChevronDown className={`transition ${mobileMenuOpen ? "rotate-180" : ""}`} size={18} />
              </button>
            </div>
          </div>
          {mobileMenuOpen ? (
            <nav aria-label="Admin sections" className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-3 lg:hidden">
              {navigation.map(({ icon: Icon, label }) => (
                <button aria-current={activeSection === label ? "page" : undefined} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold ${activeSection === label ? "bg-emerald-50 text-emerald-900" : "text-slate-600 hover:bg-slate-50"}`} key={label} onClick={() => navigate(label)} type="button">
                  <Icon size={16} />{label}
                </button>
              ))}
            </nav>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { AdminLayout };
