import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, type ElementType } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeDollarSign,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Sparkles,
  Users,
  Flag,
  Building2,
} from "lucide-react";
import { AdminAssistantMark } from "@/components/admin/AdminBrand";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: ElementType;
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
      { key: "users-user", label: "Users", href: "/admin/users?role=USER" },
      { key: "users-mentor", label: "Mentors", href: "/admin/mentors" },
      { key: "users-business", label: "Business", href: "/admin/users?role=BUSINESS" },
      { key: "users-admin", label: "Admins", href: "/admin/users?role=ADMIN" },
    ],
  },
  { key: "business-profiles", label: "Business Profiles", href: "/admin/business-profiles", icon: Building2 },
  { key: "reports", label: "Job Reports", href: "/admin/reports", icon: Flag },
  {
    key: "billing",
    label: "Billing",
    href: "/admin/billing/plans",
    icon: BadgeDollarSign,
    children: [
      { key: "billing-plans", label: "Plans", href: "/admin/billing/plans" },
      { key: "billing-orders", label: "Orders", href: "/admin/billing/orders" },
      { key: "billing-subscriptions", label: "Subscriptions", href: "/admin/billing/subscriptions" },
      { key: "billing-vouchers", label: "Vouchers", href: "/admin/billing/vouchers" },
    ],
  },
];

export default function AdminSidebar({
  forceExpanded = true,
  mobileOpen = false,
  onNavigate,
  onHoverChange,
}: {
  forceExpanded?: boolean;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  onHoverChange?: (hovering: boolean) => void;
}) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({ users: true, billing: true });

  const expanded = forceExpanded || isHovering;

  const billingLabel = (key: string, fallback: string) => {
    const labels: Record<string, string> = {
      billing: t("billing.admin.nav.billing"),
      "billing-plans": t("billing.admin.nav.plans"),
      "billing-orders": t("billing.admin.nav.orders"),
      "billing-subscriptions": t("billing.admin.nav.subscriptions"),
      "billing-vouchers": t("billing.admin.nav.vouchers"),
    };
    return labels[key] ?? fallback;
  };

  const activeKey = useMemo(() => {
    const path = location.pathname;
    const found = NAV_ITEMS.find((item) => {
      if (item.href === "/admin") return path === "/admin";
      if (item.children?.some((child) => path.startsWith(child.href.split("?")[0]))) return true;
      return path.startsWith(item.href);
    });
    return found?.key ?? "overview";
  }, [location.pathname]);

  return (
    <aside
      className={cn(
        "shrink-0 transition-[width,transform] duration-300 ease-out",
        "hidden lg:sticky lg:top-0 lg:block lg:h-full",
        expanded ? "lg:w-56" : "lg:w-16",
        mobileOpen &&
          "fixed bottom-0 left-0 top-16 z-40 block h-[calc(100dvh-4rem)] w-64 shadow-2xl lg:static lg:h-full lg:shadow-none",
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
          "flex h-full flex-col overflow-hidden border-r border-border bg-card transition-colors",
          expanded ? "px-3 py-4" : "px-2 py-4",
        )}
      >
        <nav className="flex flex-1 flex-col gap-1 overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey;
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const menuOpen = openMenus[item.key];
            const itemLabel = billingLabel(item.key, item.label);
            const itemClassName = cn(
              "group flex h-10 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold transition-colors",
              expanded ? "justify-start" : "justify-center px-0",
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            );

            const content = (
              <>
                <Icon className="size-4 shrink-0" />
                {expanded ? <span className="min-w-0 flex-1 truncate text-left">{itemLabel}</span> : null}
                {hasChildren && expanded ? (
                  <span className="shrink-0 text-muted-foreground">
                    {menuOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </span>
                ) : null}
              </>
            );

            const node =
              hasChildren && expanded ? (
                <button
                  type="button"
                  className={itemClassName}
                  onClick={() => setOpenMenus((current) => ({ ...current, [item.key]: !current[item.key] }))}
                >
                  {content}
                </button>
              ) : (
                <Link to={item.href} className={itemClassName} onClick={onNavigate}>
                  {content}
                </Link>
              );

            return (
              <div key={item.key} className="flex flex-col gap-1">
                {!expanded ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{node}</TooltipTrigger>
                    <TooltipContent side="right">{itemLabel}</TooltipContent>
                  </Tooltip>
                ) : (
                  node
                )}

                {hasChildren && expanded && menuOpen ? (
                  <div className="ms-5 flex flex-col gap-1 border-l border-border ps-3">
                    {item.children?.map((child) => {
                      const [childPath, childSearch = ""] = child.href.split("?");
                      const roleParam = new URLSearchParams(childSearch).get("role");
                      const isChildActive = roleParam
                        ? location.pathname.startsWith(childPath) && location.search.includes(`role=${roleParam}`)
                        : location.pathname === childPath;
                      const childLabel = billingLabel(child.key, child.label);

                      return (
                        <Link
                          key={child.key}
                          to={child.href}
                          className={cn(
                            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isChildActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={(event) => {
                            if (child.href === item.href) {
                              event.preventDefault();
                              navigate(child.href);
                            }
                            onNavigate?.();
                          }}
                        >
                          <span className="block truncate">{childLabel}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border pt-3">
          <AdminAssistantMark compact={!expanded} />
        </div>
      </div>
    </aside>
  );
}
