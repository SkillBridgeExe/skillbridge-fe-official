import { Search, Bell, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";

type AdminTheme = "light" | "dark";

const NOTIFICATIONS = [
  {
    id: 1,
    title: "CV parse error increased",
    severity: "critical",
    status: "unread",
    time: "10 mins ago",
  },
  {
    id: 2,
    title: "User spam",
    severity: "warning",
    status: "unread",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "Low mentor rating",
    severity: "info",
    status: "read",
    time: "2 hours ago",
  },
  {
    id: 4,
    title: "Abnormal funnel drop",
    severity: "warning",
    status: "read",
    time: "1 day ago",
  },
];


const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function AdminNavbar({
  toggleSidebar,
  adminTheme,
  onThemeChange,
}: {
  toggleSidebar: () => void;
  adminTheme: AdminTheme;
  onThemeChange: (theme: AdminTheme) => void;
}) {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const unreadCount = NOTIFICATIONS.filter((n) => n.status === "unread").length;
  const isDark = adminTheme === "dark";

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
          className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <Link to="/admin" className="flex items-center gap-0 mb-0 group">
          <span className="font-poppins font-black text-xl text-slate-900 dark:text-slate-100 leading-none tracking-tight">SkillBridge</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5 mb-2.5" />
        </Link>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-2xl px-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <Input
            placeholder="Global search..."
            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 pl-10 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 transition-all rounded-full"
          />
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
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
              className="relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {NOTIFICATIONS.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full h-full gap-2">
                    <span
                      className={cn(
                        "font-medium truncate flex-1",
                        notif.status === "unread" ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {notif.title}
                    </span>
                    {notif.status === "unread" && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase px-1.5 py-0 border-none font-semibold",
                        severityColors[notif.severity]
                      )}
                    >
                      {notif.severity}
                    </Badge>
                    <span className="text-xs text-slate-400">{notif.time}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <Button variant="ghost" className="w-full text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-primary h-8 rounded-none">
              View all notifications
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar className="h-9 w-9 border-2 border-slate-200 dark:border-slate-700">
                <AvatarImage src={currentUser?.avatar} alt="Admin" />
                <AvatarFallback className="bg-primary/10 text-primary">AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{currentUser?.name || "Admin User"}</p>
                <p className="text-xs leading-none text-slate-500">
                  {currentUser?.email || "admin@skillbridge.vn"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>System Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
