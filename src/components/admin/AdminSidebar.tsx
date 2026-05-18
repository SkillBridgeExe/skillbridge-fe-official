import { useLocation, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  MessagesSquare,
  Shield,
  Settings2,
  Briefcase,
  BadgeDollarSign,
  ChevronDown,
  ChevronRight
} from "lucide-react";

type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { key: string; label: string; href: string }[];
};

const NAV_ITEMS: AdminNavItem[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { key: "insights", label: "Insights", href: "/admin/insights", icon: Sparkles },
  { 
    key: "users", 
    label: "User Management", 
    href: "/admin/users", 
    icon: Users,
    children: [
      { key: "users-user", label: "User", href: "/admin/users?role=user" },
      { key: "users-mentor", label: "Mentor", href: "/admin/users?role=mentor" },
      { key: "users-business", label: "Business", href: "/admin/users?role=business" },
      { key: "users-admin", label: "Admin", href: "/admin/users?role=admin" },
    ]
  },
  { key: "operations", label: "Core Operations", href: "/admin/operations", icon: Briefcase },
  { key: "commerce", label: "Commerce & Finance", href: "/admin/commerce", icon: BadgeDollarSign },
  {
    key: "community",
    label: "Community Management",
    href: "/admin/community",
    icon: MessagesSquare,
  },
  {
    key: "system",
    label: "System Administration",
    href: "/admin/system",
    icon: Shield,
  },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings2 },
];

export default function AdminSidebar({ 
  forceExpanded = true,
  onHoverChange 
}: { 
  forceExpanded?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ users: true });

  const expanded = forceExpanded || isHovering;

  const toggleSubmenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeKey = useMemo(() => {
    const path = location.pathname;
    const found = NAV_ITEMS.find((it) => {
      if (it.href === "/admin") return path === "/admin";
      return path.startsWith(it.href);
    });
    return found?.key ?? "overview";
  }, [location.pathname]);

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 h-full transition-[width] duration-300 ease-out flex-shrink-0",
        expanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => {
        setIsHovering(true);
        onHoverChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        onHoverChange?.(false);
      }}
    >
      <div
        className={cn(
          "h-full bg-white dark:bg-slate-900 border-r border-slate-200/70 dark:border-slate-800 overflow-hidden transition-colors",
          expanded ? "px-3 py-4" : "px-2 py-4"
        )}
      >
        <nav className={cn("space-y-1 overflow-x-hidden", expanded ? "px-1" : "px-0")}>
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;
            const hasChildren = item.children && item.children.length > 0;
            const menuOpen = openMenus[item.key];

            const itemBtn = (
              <div
                onClick={(e) => {
                  if (hasChildren && expanded) {
                    e.preventDefault();
                    toggleSubmenu(item.key);
                  } else if (!hasChildren) {
                    navigate(item.href);
                  } else if (hasChildren && !expanded) {
                    navigate(item.href);
                  }
                }}
                className={cn(
                  "group flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer",
                  active && !hasChildren
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent",
                  expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center",
                  active && hasChildren ? "bg-slate-50 dark:bg-slate-800/70" : ""
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors flex-shrink-0",
                    active ? "text-primary" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-100"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-semibold text-slate-800 dark:text-slate-100 transition-all duration-200 whitespace-nowrap flex-1 text-left",
                    expanded ? "opacity-100" : "opacity-0 w-0 hidden"
                  )}
                >
                  {item.label}
                </span>
                
                {hasChildren && expanded && (
                  <div className="flex-shrink-0 text-slate-400 dark:text-slate-500">
                    {menuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                )}
              </div>
            );

            if (!expanded) {
              return (
                <Tooltip key={item.key} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.href}>{itemBtn}</Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={item.key} className="flex flex-col">
                {itemBtn}
                {hasChildren && expanded && menuOpen && (
                  <div className="ml-9 mt-1 flex flex-col space-y-1 animate-in slide-in-from-top-2 duration-200 mb-2">
                    {item.children?.map(child => {
                      const roleParam = new URLSearchParams(child.href.split('?')[1]).get('role');
                      const isChildActive = location.pathname.startsWith('/admin/users') && location.search.includes('role=' + roleParam);
                      return (
                        <Link 
                          key={child.key} 
                          to={child.href}
                          className={cn(
                            "text-sm px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                            isChildActive 
                              ? "bg-primary/10 text-primary font-semibold" 
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={cn("mt-6 pt-4 border-t border-slate-200/70 dark:border-slate-800", expanded ? "" : "px-1")}>
          <div className={cn("flex items-center gap-3", expanded ? "" : "justify-center")}>
            <div className="w-9 h-9 rounded-xl bg-slate-900/5 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-sm bg-slate-900/50 dark:bg-slate-400/70" />
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-300",
                expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}
            >
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Admin Studio</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Mock data · Demo</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}


