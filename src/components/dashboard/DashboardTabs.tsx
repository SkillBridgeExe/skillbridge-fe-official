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
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold transition-all duration-200",
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
