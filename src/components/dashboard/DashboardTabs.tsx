import { cn } from "@/lib/utils";
import { LayoutDashboard, Zap, GraduationCap, Video, Briefcase } from "lucide-react";

export type DashboardTabValue = "overview" | "skills" | "learning" | "interview" | "career";

interface DashboardTabsProps {
  activeTab: DashboardTabValue;
  onTabChange: (tab: DashboardTabValue) => void;
}

const tabs: { value: DashboardTabValue; label: string; icon: React.ElementType }[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "skills", label: "Skills", icon: Zap },
  { value: "learning", label: "Learning Progress", icon: GraduationCap },
  { value: "interview", label: "Interview Prep", icon: Video },
  { value: "career", label: "Career & Jobs", icon: Briefcase },
];

export default function DashboardTabs({ activeTab, onTabChange }: DashboardTabsProps) {
  return (
    <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1 sm:mx-0 sm:w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-5 sm:text-[15px]",
              isActive
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-[18px] h-[18px]" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
