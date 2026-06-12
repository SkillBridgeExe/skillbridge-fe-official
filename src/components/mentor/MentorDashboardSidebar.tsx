import { useState } from "react";
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
} from "lucide-react";
import { useMentorStore } from "@/store/useMentorStore";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

export default function MentorDashboardSidebar({
  forceExpanded = true,
  onHoverChange
}: {
  forceExpanded?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const { myProfile, profileSetupCompleted, pricingSetupCompleted } = useMentorStore();

  const expanded = forceExpanded || isHovering;

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

  return (
    <aside
      className={cn(
        "z-40 h-full flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-[width] duration-300 ease-out hidden lg:flex flex-col group",
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
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 overflow-x-hidden">
        <div className={cn("pb-2 transition-all", expanded ? "px-3" : "px-0 text-center")}>
          {expanded ? (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Main Menu</p>
          ) : (
            <div className="w-4 h-px bg-slate-200 dark:bg-slate-700 mx-auto rounded"></div>
          )}
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
              title={!expanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all relative",
                expanded ? "px-3" : "px-0 justify-center",
                isSelected
                  ? "bg-primary/10 text-primary font-bold dark:bg-primary/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isSelected ? "text-primary" : "text-slate-400 dark:text-slate-500"
                )}
              />
              <span 
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  expanded ? "flex-1 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-4 hidden"
                )}>
                {item.label}
              </span>
              {item.badge && (
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0 min-w-[20px] h-5 flex items-center justify-center rounded-full pointer-events-none transition-all duration-300",
                    expanded ? "opacity-100" : "absolute top-1 right-1 w-2 h-2 min-w-0 p-0 text-[0px]",
                    isSelected ? "bg-primary text-white border-0" : "bg-destructive text-white border-0"
                  )}
                >
                  {expanded ? item.badge : ""}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Fixed Area */}
      <div className={cn("p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-all", expanded ? "" : "px-2 py-4")}>
        <button
          type="button"
          onClick={handleViewMentorPage}
          title={!expanded ? "View Mentor Page" : undefined}
          className={cn(
            "w-full flex items-center gap-3 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/50 transition-all group overflow-hidden pointer",
            expanded ? "px-3" : "px-0 justify-center group"
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors flex-shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <span 
            className={cn(
              "whitespace-nowrap transition-all duration-300",
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden"
            )}>
            View Page
          </span>
        </button>
      </div>
    </aside>
  );
}
