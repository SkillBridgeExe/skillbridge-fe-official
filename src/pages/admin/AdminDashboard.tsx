import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";

type AdminTheme = "light" | "dark";

export default function AdminDashboard() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(isDesktop);
  const [adminTheme, setAdminTheme] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("skillbridge-admin-theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncSidebarMode = (event: MediaQueryListEvent | MediaQueryList) => {
      const desktop = event.matches;
      setIsDesktop(desktop);
      setSidebarExpanded(desktop);
    };

    syncSidebarMode(mediaQuery);
    mediaQuery.addEventListener("change", syncSidebarMode);
    return () => mediaQuery.removeEventListener("change", syncSidebarMode);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("skillbridge-admin-theme", adminTheme);
  }, [adminTheme]);

  return (
    <div className={adminTheme === "dark" ? "dark" : "light"}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground transition-colors">
        <AdminNavbar
          toggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
          adminTheme={adminTheme}
          onThemeChange={setAdminTheme}
        />
        <div className="relative flex flex-1 overflow-hidden">
          {!isDesktop && sidebarExpanded ? (
            <button
              type="button"
              aria-label="Close admin sidebar"
              className="fixed inset-x-0 bottom-0 top-16 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarExpanded(false)}
            />
          ) : null}
          <AdminSidebar
            forceExpanded={sidebarExpanded}
            mobileOpen={!isDesktop && sidebarExpanded}
            onNavigate={() => {
              if (!isDesktop) setSidebarExpanded(false);
            }}
          />
          <main className="w-full flex-1 overflow-x-hidden overflow-y-auto bg-muted/25">
            <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
