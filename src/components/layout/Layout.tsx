import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { AppSidebar } from "./AppSidebar";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useAuthStore } from "@/store/useAuthStore";
import { APP_VERSION, GIT_SHA_SHORT } from "@/lib/version";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  hideFooter?: boolean;
  hideNavbar?: boolean;
  /** When true, hides the sidebar even for user role (e.g. builder full-screen). */
  hideSidebar?: boolean;
}

export default function Layout({ children, hideFooter = false, hideNavbar = false, hideSidebar = false }: LayoutProps) {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const { isAuthenticated, currentUser } = useAuthStore();
  const collapsed = useSidebarStore((s) => s.collapsed);

  // Hide footer on app pages automatically
  const isAppPage = ["/learning", "/diagnosis", "/dashboard", "/profile", "/billing", "/interview", "/ecosystem", "/cv-builder", "/cv-studio"].some(
    (path) => location.pathname.startsWith(path),
  );
  const shouldHideFooter = hideFooter || isAppPage;

  // Sidebar mode: only for authenticated user role "user".
  // hideNavbar (report mode) does NOT hide the sidebar — Teal keeps sidebar
  // visible in analyzer/report views. Only hideSidebar (builder full-screen)
  // explicitly removes it.
  const sidebarMode = isAuthenticated && currentUser?.role === "user" && !hideSidebar;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (sidebarMode) {
    return (
      <div className={cn(
        "min-h-dvh w-full font-sans bg-[#FCFCFD] overflow-x-hidden relative selection:bg-ink-accent/20 selection:text-ink-accent",
        hideNavbar && "h-dvh overflow-hidden"
      )}>
        <AppSidebar />

        {/* Main content area — offset by sidebar width */}
        <main
          className={cn(
            "min-h-dvh z-10 relative",
            // Desktop: push content right of sidebar
            collapsed ? "md:pl-16" : "md:pl-60",
            hideNavbar && "h-dvh max-h-dvh overflow-hidden",
            // Smooth width transition
            !prefersReduced && "transition-[padding-left] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          )}
        >
          {children}
        </main>
      </div>
    );
  }

  // Default: anonymous / other roles / full-screen builder
  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden bg-white font-sans selection:bg-ink-accent/20 selection:text-ink-accent">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#FCFCFD]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUsIDIzLCA0MiwgMC4wNykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_top,black,transparent_80%)]" />
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[80vw] max-w-[1000px] -translate-x-1/2 rounded-[100%] bg-ink-accent/10 opacity-80 blur-[120px] mix-blend-multiply" />
      </div>

      {!hideNavbar && <Navbar />}
      <main className={`relative z-10 flex-grow animate-in fade-in duration-700 ${!isLanding && !hideNavbar ? "pt-24" : ""}`}>
        {children}
      </main>

      {!shouldHideFooter && (
        <footer className="bg-white border-t border-slate-100 px-6 py-12">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-4">
            <div className="col-span-1 md:col-span-1">
              <div className="mb-4 flex items-center gap-0">
                <span className="font-poppins text-xl font-black leading-none tracking-tight text-slate-900">SkillBridge</span>
                <span className="mb-2.5 ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <p className="text-sm text-slate-500">
                Bridging the gap between learning and earning with AI-powered career growth and skill matching.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/diagnosis" className="transition-colors hover:text-primary">Diagnosis</Link></li>
                <li><Link to="/learning" className="transition-colors hover:text-primary">Learning</Link></li>
                <li><Link to="/interview" className="transition-colors hover:text-primary">Interview</Link></li>
                <li><Link to="/ecosystem" className="transition-colors hover:text-primary">Ecosystem</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/about" className="transition-colors hover:text-primary">About Us</Link></li>
                <li><Link to="/success" className="transition-colors hover:text-primary">Success Stats</Link></li>
                <li><Link to="/testimonials" className="transition-colors hover:text-primary">Testimonials</Link></li>
                <li><Link to="/privacy" className="transition-colors hover:text-primary">Privacy Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-slate-900">Support</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link to="/help" className="transition-colors hover:text-primary">Help Center</Link></li>
                <li><Link to="/contact" className="transition-colors hover:text-primary">Contact Us</Link></li>
                <li><Link to="/community" className="transition-colors hover:text-primary">Community</Link></li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-slate-50 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">(c) 2026 SkillBridge. All rights reserved.</p>
            <p className="select-all font-mono text-[10px] text-slate-300" title={`v${APP_VERSION} (${GIT_SHA_SHORT})`}>
              v{APP_VERSION} / {GIT_SHA_SHORT}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
