import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";

type AdminTheme = "light" | "dark";

export default function AdminDashboard() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [adminTheme, setAdminTheme] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("skillbridge-admin-theme");
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem("skillbridge-admin-theme", adminTheme);
  }, [adminTheme]);

  return (
    <div className={adminTheme === "dark" ? "dark" : "light"}>
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#0b1120] overflow-hidden transition-colors text-slate-900 dark:text-slate-100">
        <AdminNavbar
          toggleSidebar={() => setSidebarExpanded(!sidebarExpanded)}
          adminTheme={adminTheme}
          onThemeChange={setAdminTheme}
        />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar
            forceExpanded={sidebarExpanded}
            onHoverChange={(_isHovering) => {
              // Option to handle hover if needed
            }}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-transparent">
            <div className="max-w-none w-full px-6 py-6 border-transparent">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
