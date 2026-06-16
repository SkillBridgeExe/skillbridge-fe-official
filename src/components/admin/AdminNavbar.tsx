import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { AdminBrandMark } from "@/components/admin/AdminBrand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { logout as logoutSession } from "@/services/auth.service";
import { useAuthStore } from "@/store/useAuthStore";

type AdminTheme = "light" | "dark";

function sectionTitle(pathname: string) {
  if (pathname.startsWith("/admin/users")) return "User Management";
  if (pathname.startsWith("/admin/insights")) return "Insights";
  if (pathname.startsWith("/admin/billing")) return "Billing";
  return "Overview";
}

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "Admin";
  return source.slice(0, 2).toUpperCase();
}

export default function AdminNavbar({
  toggleSidebar,
  adminTheme,
  onThemeChange,
}: {
  toggleSidebar: () => void;
  adminTheme: AdminTheme;
  onThemeChange: (theme: AdminTheme) => void;
}) {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = adminTheme === "dark";

  const handleLogout = () => {
    void logoutSession();
    navigate("/?auth=login");
  };

  return (
    <header className="sticky top-0 flex h-16 w-full items-center border-b border-border bg-card px-3 text-card-foreground shadow-sm sm:px-4">
      <div className="flex w-auto shrink-0 items-center gap-2 sm:w-56 sm:gap-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle admin sidebar">
          <Menu data-icon="inline-start" />
        </Button>
        <Link to="/admin" className="hidden min-w-0 sm:block">
          <AdminBrandMark />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{sectionTitle(location.pathname)}</div>
        <div className="truncate text-xs font-medium text-muted-foreground">Live SkillBridge admin API</div>
      </div>

      <div className="ms-auto flex items-center gap-2">
        <Badge variant="outline" className="hidden whitespace-nowrap border-primary/20 bg-primary/10 text-primary sm:inline-flex">
          Live API
        </Badge>

        <div className="flex items-center rounded-md border border-border bg-muted p-0.5">
          <Button
            variant={isDark ? "ghost" : "secondary"}
            size="icon"
            className={cn("size-8", !isDark ? "shadow-sm" : "")}
            onClick={() => onThemeChange("light")}
            aria-label="Use light admin theme"
          >
            <Sun data-icon="inline-start" />
          </Button>
          <Button
            variant={isDark ? "secondary" : "ghost"}
            size="icon"
            className={cn("size-8", isDark ? "shadow-sm" : "")}
            onClick={() => onThemeChange("dark")}
            aria-label="Use dark admin theme"
          >
            <Moon data-icon="inline-start" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-10 rounded-full p-0" aria-label="Open admin account menu">
              <Avatar className="size-9 border border-border">
                <AvatarImage src={currentUser?.avatar} alt={currentUser?.name || "Admin"} />
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {initials(currentUser?.name, currentUser?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="truncate text-sm font-semibold leading-none">
                  {currentUser?.name || "Admin User"}
                </p>
                <p className="truncate text-xs leading-none text-muted-foreground">
                  {currentUser?.email || "admin@skillbridge.vn"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
