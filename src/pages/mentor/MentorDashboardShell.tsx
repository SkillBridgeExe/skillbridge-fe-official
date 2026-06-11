import { useState } from "react";
import { Outlet } from "react-router-dom";
import MentorDashboardNavbar from "@/components/mentor/MentorDashboardNavbar";
import MentorDashboardSidebar from "@/components/mentor/MentorDashboardSidebar";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  User,
  Settings,
  ClipboardList,
  MessageCircle,
  History,
  Star,
  Wallet,
  Eye,
  LogOut
} from "lucide-react";
import { useMentorStore } from "@/store/useMentorStore";
import { logout } from "@/services/auth.service";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type MentorTheme = "light" | "dark";

type MentorNavItem = {
  path: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
};

const NAV_ITEMS: MentorNavItem[] = [
  { path: "/mentor-dashboard", label: "Overview", icon: BarChart2, exact: true },
  { path: "/mentor-dashboard/profile", label: "My Profile", icon: User },
  { path: "/mentor-dashboard/availability", label: "Availability & Pricing", icon: Settings },
  { path: "/mentor-dashboard/requests", label: "Requests", icon: ClipboardList, badge: 3 },
  { path: "/mentor-dashboard/workspace", label: "Workspace", icon: MessageCircle, badge: 3 },
  { path: "/mentor-dashboard/history", label: "History", icon: History },
  { path: "/mentor-dashboard/reviews", label: "Reviews", icon: Star },
  { path: "/mentor-dashboard/wallet", label: "Wallet & Earnings", icon: Wallet },
];

export default function MentorDashboardShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  const [mentorTheme, setMentorTheme] = useState<MentorTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("skillbridge-mentor-theme");
    return saved === "dark" ? "dark" : "light";
  });

  const handleThemeChange = (theme: MentorTheme) => {
    setMentorTheme(theme);
    window.localStorage.setItem("skillbridge-mentor-theme", theme);
  };

  const location = useLocation();
  const navigate = useNavigate();
  const { myProfile, profileSetupCompleted, pricingSetupCompleted } = useMentorStore();

  const handleViewMentorPage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profileSetupCompleted || !pricingSetupCompleted) {
      toast({
        title: "Setup Incomplete",
        description: "Please complete and save both your Profile and Availability & Pricing settings to view your page.",
        variant: "destructive"
      });
      return;
    }
    const slug = myProfile.name.toLowerCase().replace(/\s+/g, "-");
    navigate(`/ecosystem/mentor/${slug}`);
  };

  const MobileSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
      {/* Top Header */}
      <div className="px-6 h-16 flex items-center border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
        <Link to="/" className="flex items-center gap-0 group">
          <span className="font-poppins font-black text-xl text-slate-900 dark:text-white leading-none tracking-tight">SkillBridge</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2.5" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Main Menu</p>
        </div>
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path) && item.path !== "/mentor-dashboard";
          const exactActive = location.pathname === "/mentor-dashboard" && item.exact;
          const isSelected = exactActive || (!item.exact && active);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
                isSelected
                  ? "bg-primary/10 text-primary font-bold dark:bg-primary/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isSelected ? "text-primary" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
              <span className="flex-1 dark:text-white">{item.label}</span>
              {item.badge && (
                <Badge className={cn("text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center rounded-full pointer-events-none", isSelected ? "bg-primary text-white border-0" : "bg-destructive text-white border-0")}>
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <a
          href="#"
          onClick={(e) => {
            handleViewMentorPage(e);
            setMobileOpen(false);
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all dark:hover:text-white"
        >
          <Eye className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <span>View Mentor Page</span>
        </a>
        <button
          onClick={() => { void logout(); navigate("/?auth=login"); setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={mentorTheme === "dark" ? "dark" : ""}>
      <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-0 left-0 h-screen w-64 bg-white dark:bg-slate-900 z-50 lg:hidden flex flex-col"
              >
                <MobileSidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Layout containing Desktop Navbar & Sidebar */}
        <MentorDashboardNavbar 
          toggleSidebar={() => {
            if (window.innerWidth >= 1024) {
              setSidebarExpanded(!sidebarExpanded);
            } else {
              setMobileOpen(true);
            }
          }} 
          mentorTheme={mentorTheme}
          onThemeChange={handleThemeChange}
        />
        
        <div className="flex flex-1 overflow-hidden">
          <MentorDashboardSidebar forceExpanded={sidebarExpanded} />
          
          {/* Main content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden w-full bg-transparent">
            <div className="max-w-none w-full px-6 py-6 border-transparent">
              <Outlet context={{ mentorTheme }} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
