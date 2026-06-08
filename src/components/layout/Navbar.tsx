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
import { LogOut, LayoutDashboard, Shield, Building2, Users, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import logoGif from "@/assets/logo/logo.gif";

const VNFlagCircle = () => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 rounded-full shadow-sm border border-slate-100 flex-shrink-0">
    <circle cx="15" cy="15" r="15" fill="#da251d" />
    <polygon points="15,6 16.65,11.08 22,11.08 17.68,14.22 19.33,19.3 15,16.18 10.67,19.3 12.32,14.22 8,11.08 13.35,11.08" fill="#ffff00" />
  </svg>
);

const UKFlagCircle = () => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 rounded-full shadow-sm border border-slate-100 flex-shrink-0">
    <clipPath id="circleView">
      <circle cx="15" cy="15" r="15" />
    </clipPath>
    <g clipPath="url(#circleView)">
      <rect width="30" height="30" fill="#012169" />
      <path d="M0,0 L30,30 M30,0 L0,30" stroke="#fff" strokeWidth="5" />
      <path d="M0,0 L30,30 M30,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M15,0 L15,30 M0,15 L30,15" stroke="#fff" strokeWidth="8" />
      <path d="M15,0 L15,30 M0,15 L30,15" stroke="#C8102E" strokeWidth="5" />
    </g>
  </svg>
);

const NAV_ITEMS = [
  { labelKey: "nav.dashboard", href: "/dashboard" },
  { labelKey: "nav.diagnosis", href: "/diagnosis" },
  { labelKey: "nav.learning", href: "/learning" },
  { labelKey: "nav.interview", href: "/interview" },
  { labelKey: "nav.mentorship", href: "/ecosystem" },
  { labelKey: "nav.jobs", href: "/jobs", highlight: true },
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
  const { isAuthenticated, currentUser, logout } = useAuthStore();
  const { t, i18n } = useTranslation("common");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleDash = currentUser ? ROLE_DASHBOARD[currentUser.role] : null;
  const currentLang = i18n.language === "vi" ? "VI" : "EN";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="flex items-center gap-12">
        <Link to="/" className="flex items-center group">
          <img
            src={logoGif}
            alt="SkillBridge"
            className="h-20 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary relative py-1",
                location.pathname === item.href
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-slate-600" // hover chỉ đổi màu chữ — không hiện thanh gạch dưới (user chốt 06-08)
              )}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-3 text-slate-600 hover:bg-slate-100 flex items-center gap-2 h-9 transition-all active:scale-95 border border-slate-100"
            >
              {i18n.language === "vi" ? <VNFlagCircle /> : <UKFlagCircle />}
              <span className="text-xs font-bold tracking-wider">{i18n.language === "vi" ? "VI" : "EN"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl border-slate-200 shadow-lg p-1">
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("en")}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold",
                i18n.language === "en" ? "bg-primary/5 text-primary" : "text-slate-600"
              )}
            >
              <UKFlagCircle />
              <span>English</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("vi")}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold",
                i18n.language === "vi" ? "bg-primary/5 text-primary" : "text-slate-600"
              )}
            >
              <VNFlagCircle />
              <span>Tiếng Việt</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="rounded-full px-4 text-slate-700 font-semibold hover:bg-slate-100">
                {t("actions.login")}
              </Button>
            </Link>
            <Link to="/register">
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-white shadow-glow font-semibold">
                {t("actions.startFree")}
              </Button>
            </Link>
          </div>
        ) : (
          <DropdownMenu modal={false}>
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
