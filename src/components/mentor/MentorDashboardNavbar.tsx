import { Search, Bell, Menu, User, Wallet, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useMentorStore } from "@/store/useMentorStore";
import { Link, useNavigate } from "react-router-dom";

type MentorTheme = "light" | "dark";

const NOTIFICATIONS = [
  {
    id: 1,
    title: "John has sent a booking request",
    desc: "(14:00 today)",
    type: "booking",
    severity: "critical",
    status: "unread",
    time: "10 mins ago",
    link: "/mentor-dashboard/requests"
  },
  {
    id: 2,
    title: "Anna: em bị lỗi useEffect...",
    desc: "New Message",
    type: "chat",
    severity: "info",
    status: "unread",
    time: "1 hour ago",
    link: "/mentor-dashboard/workspace"
  },
  {
    id: 3,
    title: "Session with John has been fully paid",
    desc: "Payment Completed",
    type: "payment",
    severity: "success",
    status: "unread",
    time: "2 hours ago",
    link: "/mentor-dashboard/history"
  },
  {
    id: 4,
    title: "Session with John starts in 10 minutes",
    desc: "Upcoming Session",
    type: "upcoming",
    severity: "warning",
    status: "read",
    time: "10 mins ago",
    link: "/mentor-dashboard/workspace"
  },
  {
    id: 5,
    title: "Anna left a 5★ review",
    desc: "New Review",
    type: "review",
    severity: "info",
    status: "read",
    time: "1 day ago",
    link: "/mentor-dashboard/reviews"
  },
  {
    id: 6,
    title: "User did not attend the session",
    desc: "Missed Session",
    type: "missed",
    severity: "warning",
    status: "read",
    time: "2 days ago",
    link: "/mentor-dashboard/history"
  }
];

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function MentorDashboardNavbar({
  toggleSidebar,
  mentorTheme,
  onThemeChange,
}: {
  toggleSidebar: () => void;
  mentorTheme: MentorTheme;
  onThemeChange: (theme: MentorTheme) => void;
}) {
  const { logout } = useAuthStore();
  const { myProfile } = useMentorStore();
  const navigate = useNavigate();
  const unreadCount = NOTIFICATIONS.filter((n) => n.status === "unread").length;
  const isDark = mentorTheme === "dark";

  const handleLogout = () => {
    logout();
    navigate("/?auth=login");
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center px-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 w-full transition-colors">
      {/* Left side: Hamburger + Logo */}
      <div className="flex items-center gap-4 w-64 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Link to="/mentor-dashboard" className="flex items-center gap-0 group">
          <span className="font-poppins font-black text-xl text-slate-900 dark:text-slate-100 leading-none tracking-tight">SkillBridge</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2.5" />
        </Link>
      </div>

      {/* Center: Global Search */}
      {/* <div className="flex-1 flex justify-center px-4 lg:px-8"> */}
        <div className="flex-1 max-w-2xl px-4">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search User, Chat, Session, History..."
            className="w-full pl-9 pr-4 h-10 bg-slate-100 dark:bg-slate-800 border-transparent focus-visible:bg-white dark:focus-visible:bg-slate-700 dark:text-white transition-all rounded-full"
          />
          {/* <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-slate-50 dark:bg-slate-900 dark:border-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <span className="text-xs">Ctrl</span>K
            </kbd>
          </div> */}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Theme Toggle */}
        <div className="hidden sm:flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onThemeChange("light")}
            className={cn(
              "h-7 w-7 rounded-full transition-colors",
              !isDark ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Sun className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onThemeChange("dark")}
            className={cn(
              "h-7 w-7 rounded-full transition-colors",
              isDark ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Moon className="w-4 h-4" />
          </Button>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[380px] p-0 rounded-xl overflow-hidden mt-2 border-slate-200 dark:border-slate-800 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              <span className="font-semibold text-sm dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {NOTIFICATIONS.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => navigate(n.link)}
                    className={cn(
                      "group flex gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0",
                      n.status === "unread" ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/50 opacity-75"
                    )}
                  >
                    <div className="mt-1">
                      <div className={cn("w-2 h-2 rounded-full", n.status === "unread" ? "bg-primary" : "bg-transparent")} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-tight", n.status === "unread" ? "text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-400")}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                          {n.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", severityColors[n.severity])}>
                          {n.desc}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <Button variant="ghost" className="w-full text-xs text-primary hover:text-primary hover:bg-primary/5 h-8">
                Mark all as read
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 p-0 rounded-full ring-2 ring-transparent transition-all hover:ring-primary/20 ml-2"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {myProfile?.name?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-2 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl dark:bg-slate-900" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{myProfile?.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">Mentor</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem className="py-2 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800 dark:text-slate-200" onClick={() => navigate("/mentor-dashboard/profile")}>
              <User className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="py-2 cursor-pointer focus:bg-slate-50 dark:focus:bg-slate-800 dark:text-slate-200" onClick={() => navigate("/mentor-dashboard/wallet")}>
              <Wallet className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>Wallet & Earnings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem className="py-2 text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 cursor-pointer" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
