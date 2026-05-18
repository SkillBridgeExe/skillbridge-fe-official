import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FlaskConical, Trophy, ScanSearch, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningHistoryEntry } from "@/lib/mock-data/dashboard";

const typeConfig = {
  lesson: { icon: BookOpen, color: "text-blue-600 bg-blue-50", label: "Lesson" },
  quiz: { icon: FlaskConical, color: "text-amber-600 bg-amber-50", label: "Quiz" },
  module_complete: { icon: Trophy, color: "text-emerald-600 bg-emerald-50", label: "Completed" },
  cv_scan: { icon: ScanSearch, color: "text-violet-600 bg-violet-50", label: "CV Scan" },
};

interface LearningHistoryTimelineProps {
  entries: LearningHistoryEntry[];
}

export default function LearningHistoryTimeline({ entries }: LearningHistoryTimelineProps) {
  // Group by date
  const grouped = entries.reduce<Record<string, LearningHistoryEntry[]>>((acc, entry) => {
    (acc[entry.date] ??= []).push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="glass border-white/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">
          Learning History
        </CardTitle>
        <p className="text-xs text-slate-400">Based on the last 30 days</p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-6 relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-100" />

          {sortedDates.map((date) => {
            const formatted = new Date(date).toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div key={date} className="space-y-3">
                {/* Date marker */}
                <div className="flex items-center gap-3">
                  <div className="w-[14px] h-[14px] rounded-full bg-primary border-2 border-white shadow-sm z-10 flex-shrink-0" />
                  <span className="text-xs font-bold text-slate-700">{formatted}</span>
                </div>

                {/* Entries */}
                <div className="ml-7 space-y-2">
                  {grouped[date].map((entry) => {
                    const config = typeConfig[entry.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition-shadow"
                      >
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", config.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{config.label}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 truncate">{entry.title}</p>
                          <p className="text-xs text-slate-500">{entry.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {entry.score != null && (
                            <span className={cn(
                              "text-sm font-bold",
                              entry.score >= 80 ? "text-emerald-600" : entry.score >= 60 ? "text-amber-600" : "text-red-500"
                            )}>
                              {entry.score}%
                            </span>
                          )}
                          {entry.stars != null && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star
                                  key={s}
                                  className={cn(
                                    "w-4 h-4",
                                    s <= entry.stars! ? "text-amber-400 fill-amber-400" : "text-slate-200"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

