import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Briefcase,
  Users,
  Trophy,
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", path: "/business" },
  { icon: Building2, label: "Company Profile", path: "/business/profile" },
  { icon: Briefcase, label: "Job Listings", path: "/business/jobs" },
  { icon: Trophy, label: "Top Candidates", path: "/business/top-candidates" },
  { icon: Users, label: "Applicants", path: "/business/applicants" },
];

interface BusinessLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function BusinessLayout({ children, title, subtitle }: BusinessLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPage = NAV_ITEMS.find((item) =>
    item.path === "/business"
      ? location.pathname === "/business"
      : location.pathname.startsWith(item.path),
  );
  const CurrentPageIcon = currentPage?.icon;

  return (
    <div className="min-h-dvh bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
            fixed top-0 left-0 h-dvh w-64 
            bg-white border-r border-slate-200 z-30 flex flex-col
            overflow-y-auto
            transform transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:translate-x-0
        `}
        >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-1">
            <span className="font-poppins font-black text-lg text-slate-900 tracking-tight">
              SkillBridge
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mb-2.5" />
          </Link>
          <button
            className="lg:hidden text-slate-400 hover:text-slate-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Company badge */}
        <div className="mx-4 mt-4 p-3 bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border border-sky-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-sm">
              CO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">Business Portal</p>
              <p className="text-xs text-sky-600">Enterprise Account</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const isActive =
              path === "/business"
                ? location.pathname === "/business"
                : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
              >
                <Icon size={16} />
                {label}
                {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-slate-100">
          <Link
            to="/?auth=login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            <LogOut size={16} />
            Exit Portal
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Topbar */}
        <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 sticky top-0 z-10">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Business Workspace</p>
            {title && <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>

          {currentPage && CurrentPageIcon && (
            <div className="hidden md:inline-flex items-center gap-2 text-xs text-slate-600 px-3 py-1.5 rounded-full bg-slate-100">
              <CurrentPageIcon size={13} />
              {currentPage.label}
            </div>
          )}

          <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sky-500 rounded-full" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
