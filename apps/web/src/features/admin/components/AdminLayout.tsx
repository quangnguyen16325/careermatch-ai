import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles } from "lucide-react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AdminSectionNavigation } from "./AdminSectionNavigation";
import type { AdminSection } from "../types";

type AdminLayoutProps = {
  activeSection: AdminSection;
  children: ReactNode;
  onNavigate: (section: AdminSection) => void;
};

function AdminLayout({ activeSection, children, onNavigate }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  function navigate(section: AdminSection, returnFocusToMenuButton = false) {
    onNavigate(section);
    if (returnFocusToMenuButton) {
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
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
          <AdminSectionNavigation activeSection={activeSection} onNavigate={navigate} variant="sidebar" />
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
              <button aria-controls="admin-section-navigation-mobile" aria-expanded={mobileMenuOpen} aria-label="Toggle admin navigation" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:hidden" onClick={() => setMobileMenuOpen((open) => !open)} ref={mobileMenuButtonRef} type="button">
                <ChevronDown className={`transition ${mobileMenuOpen ? "rotate-180" : ""}`} size={18} />
              </button>
            </div>
          </div>
          <div hidden={!mobileMenuOpen} id="admin-section-navigation-mobile">
            <AdminSectionNavigation activeSection={activeSection} onNavigate={(section) => navigate(section, true)} variant="mobile" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export { AdminLayout };
