// Shared nav config — single source for the anonymous Navbar (top pill) and the
// authenticated AppSidebar (Teal-style left rail). Keep hrefs in sync with routes.
import {
  LayoutDashboard,
  Stethoscope,
  FileText,
  GraduationCap,
  Mic,
  Users,
  Briefcase,
  Shield,
  Building2,
} from "lucide-react";

export interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  highlight?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.diagnosis", href: "/diagnosis", icon: Stethoscope },
  { labelKey: "nav.cvStudio", href: "/cv-studio", icon: FileText },
  { labelKey: "nav.learning", href: "/learning", icon: GraduationCap },
  { labelKey: "nav.interview", href: "/interview", icon: Mic },
  { labelKey: "nav.mentorship", href: "/ecosystem", icon: Users },
  { labelKey: "nav.jobs", href: "/jobs", icon: Briefcase, highlight: true },
];

export const ROLE_DASHBOARD: Record<string, { href: string; labelKey: string; icon: React.ElementType }> = {
  user: { href: "/dashboard", labelKey: "account.userDashboard", icon: LayoutDashboard },
  admin: { href: "/admin", labelKey: "account.adminPanel", icon: Shield },
  business: { href: "/business", labelKey: "account.businessPortal", icon: Building2 },
  mentor: { href: "/mentor-dashboard", labelKey: "account.mentorHub", icon: Users },
};

export const ROLE_PROFILE: Record<string, string> = {
  user: "/profile",
  admin: "/admin",
  business: "/business/profile",
  mentor: "/mentor-dashboard/profile",
};
