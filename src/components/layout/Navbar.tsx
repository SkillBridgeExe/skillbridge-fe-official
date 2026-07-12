import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LoginDialog } from "@/components/auth/LoginDialog";
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
import { LogOut, LayoutDashboard, Shield, Building2, Users, ChevronDown, UserCircle, Sparkles } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { useAuthStore } from "@/store/useAuthStore";
import { logout as logoutSession } from "@/services/auth.service";
import { useTranslation } from "react-i18next";
import logoPng from "@/assets/logo/LOGO_Final.png";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import { getMyAvatarUrl, getSafeAvatarUrl, isProtectedAvatarUrl } from "@/services/user-profile.service";

const VNFlagCircle = () => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 rounded-full shadow-sm border border-slate-100 flex-shrink-0">
    <circle cx="15" cy="15" r="15" fill="#da251d" />
    <polygon points="15,5.5 17.13,12.06 24.04,12.06 18.45,16.12 20.58,22.69 15,18.63 9.42,22.69 11.55,16.12 5.96,12.06 12.87,12.06" fill="#ffff00" />
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
  { labelKey: "nav.cvStudio", href: "/cv-studio" },
  { labelKey: "nav.learning", href: "/learning" },
  { labelKey: "nav.interview", href: "/interview" },
  { labelKey: "nav.mentorship", href: "/ecosystem" },
  { labelKey: "nav.jobs", href: "/jobs", highlight: true },
];

const ROLE_DASHBOARD: Record<string, { href: string; labelKey: string; icon: React.ElementType }> = {
  user: { href: "/dashboard", labelKey: "account.userDashboard", icon: LayoutDashboard },
  admin: { href: "/admin", labelKey: "account.adminPanel", icon: Shield },
  business: { href: "/business", labelKey: "account.businessPortal", icon: Building2 },
  mentor: { href: "/mentor-dashboard", labelKey: "account.mentorHub", icon: Users },
};

const ROLE_PROFILE: Record<string, string> = {
  user: "/profile",
  admin: "/admin",
  business: "/business/profile",
  mentor: "/mentor-dashboard/profile",
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const { isAuthenticated, currentUser } = useAuthStore();
  const hasApiSession = useHasApiSession();
  const { t, i18n } = useTranslation("common");
  const posthog = usePostHog();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const auth = searchParams.get("auth");
    if (auth !== "login" && auth !== "register") return;

    setAuthMode(auth);
    setLoginOpen(true);
    searchParams.delete("auth");
    navigate(
      {
        pathname: location.pathname,
        search: searchParams.toString() ? `?${searchParams.toString()}` : "",
        hash: location.hash,
      },
      { replace: true },
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  const avatarQuery = useQuery({
    queryKey: QUERY_KEYS.USER_AVATAR,
    queryFn: getMyAvatarUrl,
    enabled: hasApiSession && isProtectedAvatarUrl(currentUser?.avatar),
  });

  const handleLogout = () => {
    posthog?.capture("user_logged_out", { role: currentUser?.role });
    posthog?.reset();
    void logoutSession();
    navigate("/");
  };

  const roleDash = currentUser ? ROLE_DASHBOARD[currentUser.role] : null;
  const profileHref = currentUser ? ROLE_PROFILE[currentUser.role] : "/profile";


  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full px-4 pt-4 md:pt-6 pointer-events-none">
      <nav className="w-full max-w-6xl h-16 md:h-[4.5rem] flex items-center justify-between px-3 sm:px-4 lg:px-6 bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-900/5 rounded-full pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
        <div className="flex items-center gap-3 lg:gap-5 xl:gap-10">
        <Link to="/" className="flex items-center group">
          <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <img
              src={logoPng}
              alt="SkillBridge"
              className="h-[72px] w-auto max-w-none object-contain drop-shadow-sm -my-4 -ml-4 -mr-1"
            />
          </div>
          <span className="hidden sm:inline md:hidden xl:inline text-[20px] font-bold tracking-tight text-slate-800">
            SkillBridge
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2.5 lg:gap-4 xl:gap-6">
          {NAV_ITEMS.filter((item) => isAuthenticated || item.href !== "/dashboard").map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={location.pathname === item.href ? "page" : undefined}
              className={cn(
                "text-[13px] xl:text-sm font-medium transition-colors hover:text-primary relative py-1 whitespace-nowrap",
                location.pathname === item.href
                  ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full"
                  : "text-slate-600"
              )}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-3 text-slate-600 hover:bg-slate-100 flex items-center gap-2 h-9 transition-all active:scale-95 border border-slate-100"
            >
              {i18n.language.startsWith("vi") ? <VNFlagCircle /> : <UKFlagCircle />}
              <span className="text-xs font-bold tracking-wider">{i18n.language.startsWith("vi") ? "VI" : "EN"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl border-slate-200 shadow-lg p-1">
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("en")}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold",
                i18n.language.startsWith("en") ? "bg-primary/5 text-primary" : "text-slate-600"
              )}
            >
              <UKFlagCircle />
              <span>English</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("vi")}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold",
                i18n.language.startsWith("vi") ? "bg-primary/5 text-primary" : "text-slate-600"
              )}
            >
              <VNFlagCircle />
              <span>Tiếng Việt</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAuthMode("login");
                setLoginOpen(true);
              }}
              className="rounded-full px-4 text-slate-700 font-semibold hover:bg-slate-100"
            >
              {t("actions.login")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setLoginOpen(true);
              }}
              className="rounded-full px-6 bg-[#00AEEF] hover:bg-[#049bd7] text-white shadow-[0_10px_22px_rgba(0,174,239,0.22)] font-semibold"
            >
              {t("actions.startFree")}
            </Button>
          </div>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Avatar className={cn(
                "h-9 w-9 border-2 border-primary/20 hover:border-primary/50 cursor-pointer transition-all",
                avatarQuery.isLoading && "animate-pulse"
              )}>
                <AvatarImage src={avatarQuery.data || getSafeAvatarUrl(currentUser?.avatar) || undefined} />
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
                    {t(roleDash.labelKey)}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to={profileHref} className="flex items-center gap-2 cursor-pointer">
                  <UserCircle className="w-4 h-4 text-slate-500" />
                  {t("account.myProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/pricing" className="flex items-center gap-2 cursor-pointer text-blue-600 font-medium">
                  <Sparkles className="w-4 h-4 fill-blue-100" />
                  Upgrade Plan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                {t("account.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <LoginDialog
        open={loginOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onOpenChange={setLoginOpen}
      />
      </nav>
    </div>
  );
}
