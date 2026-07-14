import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import { useAuthStore } from "@/store/useAuthStore";
import { logout as logoutSession } from "@/services/auth.service";
import { useSidebarStore } from "@/store/useSidebarStore";
import { NAV_ITEMS, ROLE_PROFILE } from "./nav-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PanelLeft,
  PanelLeftClose,
  LogOut,
  UserCircle,
  CreditCard,
  Sparkles,
  Menu,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/app";
import { useHasApiSession } from "@/hooks/use-api-session";
import {
  getMyAvatarUrl,
  getSafeAvatarUrl,
  isProtectedAvatarUrl,
} from "@/services/user-profile.service";
import logoPng from "@/assets/logo/LOGO_Final.png";


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** True when `pathname` starts with `href` (root "/" only matches exact). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* Flag SVGs — re-used from Navbar for i18n switcher */
const VNFlagCircle = () => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 rounded-full shadow-sm border border-slate-100 flex-shrink-0">
    <circle cx="15" cy="15" r="15" fill="#da251d" />
    <polygon points="15,5.5 17.13,12.06 24.04,12.06 18.45,16.12 20.58,22.69 15,18.63 9.42,22.69 11.55,16.12 5.96,12.06 12.87,12.06" fill="#ffff00" />
  </svg>
);

const UKFlagCircle = () => (
  <svg viewBox="0 0 30 30" className="w-4 h-4 rounded-full shadow-sm border border-slate-100 flex-shrink-0">
    <clipPath id="sidebarCircleView">
      <circle cx="15" cy="15" r="15" />
    </clipPath>
    <g clipPath="url(#sidebarCircleView)">
      <rect width="30" height="30" fill="#012169" />
      <path d="M0,0 L30,30 M30,0 L0,30" stroke="#fff" strokeWidth="5" />
      <path d="M0,0 L30,30 M30,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M15,0 L15,30 M0,15 L30,15" stroke="#fff" strokeWidth="8" />
      <path d="M15,0 L15,30 M0,15 L30,15" stroke="#C8102E" strokeWidth="5" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Sidebar nav list (shared by desktop + mobile drawer)                */
/* ------------------------------------------------------------------ */

function SidebarNavList({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const { t } = useTranslation("common");

  return (
    <TooltipProvider delayDuration={0}>
      <ul className="flex flex-col gap-0.5 px-2" role="list">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(location.pathname, item.href);
          const Icon = item.icon;

          const link = (
            <li key={item.href}>
              <Link
                to={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center h-10 rounded-lg px-3 gap-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
                  active
                    ? "bg-slate-100 text-[#2F3437] font-semibold"
                    : "text-[#787774] hover:bg-slate-50 hover:text-[#2F3437]",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && (
                  <span className="truncate">{t(item.labelKey)}</span>
                )}
                {/* Highlight dot for "Jobs" */}
                {item.highlight && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full bg-[#00AEEF] shrink-0",
                      collapsed ? "absolute top-2 right-2" : "ml-auto",
                    )}
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {t(item.labelKey)}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </ul>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Account footer block                                                */
/* ------------------------------------------------------------------ */

function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const { currentUser } = useAuthStore();
  const hasApiSession = useHasApiSession();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const posthog = usePostHog();

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

  const profileHref = currentUser
    ? ROLE_PROFILE[currentUser.role] ?? "/profile"
    : "/profile";

  const avatarSrc =
    avatarQuery.data || getSafeAvatarUrl(currentUser?.avatar) || undefined;

  const trigger = (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
        collapsed && "justify-center px-0",
      )}
    >
      <Avatar
        className={cn(
          "h-8 w-8 shrink-0 border border-slate-200",
          avatarQuery.isLoading && "animate-pulse",
        )}
      >
        <AvatarImage src={avatarSrc} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-blue-400 text-white text-[10px] font-bold">
          {currentUser?.name?.slice(0, 2).toUpperCase() || "SK"}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#2F3437]">
            {currentUser?.name}
          </p>
          <p className="truncate text-xs text-[#787774]">
            {currentUser?.email}
          </p>
        </div>
      )}
    </button>
  );

  const menu = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "end" : "start"}
        sideOffset={8}
        className={cn(
          "rounded-xl border-slate-200 shadow-lg p-1 bg-white",
          collapsed ? "w-52" : "w-[var(--radix-dropdown-menu-trigger-width)]",
        )}
      >
        {/* Profile */}
        <DropdownMenuItem asChild>
          <Link
            to={profileHref}
            className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-2 text-sm"
          >
            <UserCircle className="w-4 h-4 text-slate-500" />
            {t("account.myProfile")}
          </Link>
        </DropdownMenuItem>

        {/* Billing */}
        <DropdownMenuItem asChild>
          <Link
            to="/billing/me"
            className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-2 text-sm"
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            {t("account.billing")}
          </Link>
        </DropdownMenuItem>

        {/* Upgrade Plan */}
        <DropdownMenuItem asChild>
          <Link
            to="/pricing"
            className="flex items-center gap-2 cursor-pointer rounded-lg px-2.5 py-2 text-sm text-blue-600 font-medium"
          >
            <Sparkles className="w-4 h-4 fill-blue-100" />
            {t("account.upgradePlan")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Language switcher */}
        <DropdownMenuItem
          onClick={() =>
            i18n.changeLanguage(i18n.language.startsWith("vi") ? "en" : "vi")
          }
          className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 text-sm"
        >
          {i18n.language.startsWith("vi") ? <UKFlagCircle /> : <VNFlagCircle />}
          <span>
            {i18n.language.startsWith("vi") ? "English" : "Tiếng Việt"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 focus:text-red-500 cursor-pointer rounded-lg px-2.5 py-2 text-sm"
        >
          <LogOut className="w-4 h-4" />
          {t("account.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return <div className="px-2 py-2">{menu}</div>;
}

/* ------------------------------------------------------------------ */
/* Desktop sidebar (aside)                                             */
/* ------------------------------------------------------------------ */

function DesktopSidebar() {
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const prefersReduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col bg-white border-r border-[#EAEAEA]",
        prefersReduced
          ? ""
          : "transition-[width] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Top: logo */}
      <div className={cn("h-14 flex items-center shrink-0", collapsed ? "px-2 justify-center" : "px-4")}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={logoPng}
            alt="SkillBridge"
            className={cn(
              "h-11 w-auto object-contain shrink-0 transition-transform duration-200 group-hover:scale-105",
              collapsed && "h-10"
            )}
          />
          {!collapsed && (
            <span className="font-poppins font-black text-lg text-slate-900 tracking-tight whitespace-nowrap">
              SkillBridge
            </span>
          )}
        </Link>
      </div>

      {/* Middle: nav list */}
      <nav className="flex-1 overflow-y-auto py-2">
        <SidebarNavList collapsed={collapsed} />
      </nav>

      {/* Bottom: account block */}
      <div className="border-t border-[#EAEAEA]">
        <SidebarAccount collapsed={collapsed} />
      </div>

      {/* Collapse toggle at edge */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -right-3 z-50",
          "flex items-center justify-center w-6 h-6 rounded-full",
          "bg-white border border-[#EAEAEA] shadow-sm",
          "text-[#787774] hover:text-[#2F3437] hover:shadow-md",
          "transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        )}
      >
        {collapsed ? (
          <PanelLeft className="w-3.5 h-3.5" />
        ) : (
          <PanelLeftClose className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile top bar + sheet drawer                                       */
/* ------------------------------------------------------------------ */

function MobileTopBar() {
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  // A1: In diagnosis report mode the page-level ReportTopBar already provides
  // a 56px sticky bar with its own hamburger (sidebar Sheet trigger). Rendering
  // this MobileTopBar on top of it would stack two 56px bars on mobile.
  // Hide the header but keep the Sheet drawer so ReportTopBar's trigger works.
  const location = useLocation();
  const diagStep = useDiagnosisStore((s) => s.step);
  // Scope to the /diagnosis route — `step` is persisted, so a leftover
  // "results"/"cv-review" must NOT hide the top bar on other pages (they have
  // no ReportTopBar to replace it, leaving mobile with no way to open the nav).
  const isDiagnosisReportMode =
    location.pathname === "/diagnosis" &&
    (diagStep === "cv-review" || diagStep === "results");

  return (
    <>
      {/* Slim top bar — static (not sticky) so it never stacks over the page-level
          sticky bars (ReportTopBar top-0, ScoreRail chips top-14) on mobile.
          Hidden in diagnosis report mode (A1) where ReportTopBar takes over. */}
      {!isDiagnosisReportMode && (
        <header className="md:hidden flex items-center justify-between h-14 px-4 bg-white/95 border-b border-[#EAEAEA]">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoPng} alt="SkillBridge" className="h-9 w-auto object-contain" />
            <span className="font-poppins font-black text-base text-slate-900 tracking-tight">
              SkillBridge
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-50 text-[#787774] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>
      )}

      {/* Sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 border-r border-[#EAEAEA]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b border-[#EAEAEA]">
            <Link
              to="/"
              className="flex items-center gap-2.5"
              onClick={() => setMobileOpen(false)}
            >
              <img src={logoPng} alt="SkillBridge" className="h-11 w-auto object-contain" />
              <span className="font-poppins font-black text-lg text-slate-900 tracking-tight">
                SkillBridge
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3">
            <SidebarNavList
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>

          {/* Account */}
          <div className="border-t border-[#EAEAEA] mt-auto">
            <SidebarAccount collapsed={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Composite export                                                    */
/* ------------------------------------------------------------------ */

export function AppSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileTopBar />
    </>
  );
}
