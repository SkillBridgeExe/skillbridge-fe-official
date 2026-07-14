import React from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface JobscanTabNavProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export function JobscanTabNav({ tabs, active, onChange }: JobscanTabNavProps) {
  return (
    <div role="tablist" className="flex border-b border-[#EAEAEA] w-full h-[48px] items-end bg-[#F1F1EF] px-2 rounded-t-xl overflow-hidden">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 h-[40px] text-[15px] font-semibold transition-all rounded-t-lg border-t border-x focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-accent/40",
              isActive
                ? "bg-white text-slate-900 border-[#EAEAEA] border-b-white -mb-[1px] z-10"
                : "bg-[#F1F1EF] text-[#787774] border-transparent hover:text-slate-800"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
