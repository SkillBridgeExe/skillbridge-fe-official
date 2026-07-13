import Navbar from "./Navbar";
import { AppSidebar } from "./AppSidebar";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocation, Link } from "react-router-dom";
import { GIT_SHA_SHORT, APP_VERSION } from "@/lib/version";
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
    path => location.pathname.startsWith(path)
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
    <div className="min-h-dvh w-full flex flex-col font-sans bg-white overflow-x-hidden relative selection:bg-ink-accent/20 selection:text-ink-accent">
      
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[#FCFCFD]">
        {/* Dot Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTUsIDIzLCA0MiwgMC4wNykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_top,black,transparent_80%)]"></div>
        
        {/* Radial Glow */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[80vw] max-w-[1000px] h-[600px] bg-ink-accent/10 blur-[120px] rounded-[100%] opacity-80 mix-blend-multiply"></div>
      </div>

      {!hideNavbar && <Navbar />}
      <main className={`flex-grow z-10 relative animate-in fade-in duration-700 ${(!isLanding && !hideNavbar) ? 'pt-24' : ''}`}>
        {children}
      </main>
      {!shouldHideFooter && <footer className="bg-white border-t border-slate-100 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-0 mb-4">
               <span className="font-poppins font-black text-xl text-slate-900 leading-none tracking-tight">SkillBridge</span>
               <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2.5" />
            </div>
            <p className="text-slate-500 text-sm">
              Bridging the gap between learning and earning with AI-powered career growth and skill matching.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/diagnosis" className="hover:text-primary transition-colors">Diagnosis</Link></li>
              <li><Link to="/learning" className="hover:text-primary transition-colors">Learning</Link></li>
              <li><Link to="/interview" className="hover:text-primary transition-colors">Interview</Link></li>
              <li><Link to="/ecosystem" className="hover:text-primary transition-colors">Ecosystem</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/success" className="hover:text-primary transition-colors">Success Stats</Link></li>
              <li><Link to="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/community" className="hover:text-primary transition-colors">Community</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-50 mt-12 pt-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">© 2026 SkillBridge. All rights reserved.</p>
          <p className="text-[10px] text-slate-300 font-mono select-all" title={`v${APP_VERSION} (${GIT_SHA_SHORT})`}>
            v{APP_VERSION}·{GIT_SHA_SHORT}
          </p>
        </div>
      </footer>}
    </div>
  );
}
