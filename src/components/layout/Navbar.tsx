import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, Shield, Building2, Users } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import logoGif from "@/assets/logo/logo.gif";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Diagnosis", href: "/diagnosis" },
  { label: "Learning", href: "/learning" },
  { label: "Interview", href: "/interview" },
  { label: "Mentorship", href: "/ecosystem" },
  { label: "Jobs", href: "/jobs", highlight: true },
];

const ROLE_DASHBOARD: Record<string, { href: string; label: string; icon: React.ElementType }> = {
  user: { href: "/dashboard", label: "User Dashboard", icon: LayoutDashboard },
  admin: { href: "/admin", label: "Admin Panel", icon: Shield },
  business: { href: "/business", label: "Business Portal", icon: Building2 },
  mentor: { href: "/mentor-dashboard", label: "Mentor Hub", icon: Users },
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";
  const { isAuthenticated, currentUser, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleDash = currentUser ? ROLE_DASHBOARD[currentUser.role] : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center group">
          <img
            src={logoGif}
            alt="SkillBridge"
            className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "text-sm font-medium transition-all hover:text-primary relative py-1",
              location.pathname === item.href
                ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                : "text-slate-600 hover:after:absolute hover:after:bottom-0 hover:after:left-0 hover:after:right-0 hover:after:h-0.5 hover:after:bg-primary/30 hover:after:rounded-full"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="rounded-full px-4 text-slate-700 font-semibold hover:bg-slate-100">
                Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-glow font-semibold">
                Start Free
              </Button>
            </Link>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/50 cursor-pointer transition-all">
                <AvatarImage src={currentUser?.avatar || "https://github.com/shadcn.png"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-400 text-white text-xs font-bold">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || "SK"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-200 shadow-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-slate-800">{currentUser?.name}</span>
                  <span className="text-xs text-slate-400">{currentUser?.email}</span>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">
                    {currentUser?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {roleDash && (
                <DropdownMenuItem asChild>
                  <Link to={roleDash.href} className="flex items-center gap-2 cursor-pointer">
                    <roleDash.icon className="w-4 h-4 text-slate-500" />
                    {roleDash.label}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
