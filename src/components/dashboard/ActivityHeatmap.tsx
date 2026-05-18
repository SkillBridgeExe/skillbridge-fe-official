import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeatmapDay } from "@/lib/mock-data/dashboard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Clock, Award } from "lucide-react";

interface ActivityHeatmapProps {
  data: HeatmapDay[];
}

function getColor(minutes: number): string {
  if (minutes === 0) return "bg-slate-100 dark:bg-slate-800 border-transparent hover:ring-[1px] hover:ring-slate-300"; 
  if (minutes < 15) return "bg-blue-200 dark:bg-blue-900 border-transparent hover:ring-[1px] hover:ring-blue-400"; 
  if (minutes <= 60) return "bg-blue-400 dark:bg-blue-700 border-transparent hover:ring-[1px] hover:ring-blue-400"; 
  if (minutes <= 120) return "bg-blue-500 dark:bg-blue-500 border-transparent hover:ring-[1px] hover:ring-blue-400";
  return "bg-blue-700 dark:bg-blue-400 border-transparent hover:ring-[1px] hover:ring-blue-400"; 
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks: (HeatmapDay | null)[][] = [];
  let currentWeek: (HeatmapDay | null)[] = [];

  let totalMinutes = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  
  data.forEach((day) => {
    totalMinutes += day.minutes;
    if (day.minutes > 0) {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });
  
  let currentStreak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
     if (data[i].minutes > 0) {
         currentStreak++;
     } else {
       if (i === data.length - 1) continue; 
       break;
     }
  }

  const totalHours = Math.round(totalMinutes / 60);

  if (data.length > 0) {
    const firstDay = new Date(data[0].date).getDay();
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }
  }

  for (const day of data) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const monthLabels: { label: string; index: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const firstValidDay = week.find((day) => day !== null);
    if (firstValidDay) {
      const targetDate = new Date(firstValidDay.date);
      const m = targetDate.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          label: targetDate.toLocaleString("default", { month: "short" }),
          index,
        });
        lastMonth = m;
      }
    }
  });

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <Card className="glass border-white/50 shadow-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2 border-b border-slate-100/50 mb-4 bg-white/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-extrabold text-slate-800">
            Learning Consistency
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="mr-1">Less</span>
            <div className="flex items-center gap-[3px]">
              <div className="w-[14px] h-[14px] rounded-[3px] bg-slate-100" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-blue-200" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-blue-400" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-blue-500" />
              <div className="w-[14px] h-[14px] rounded-[3px] bg-blue-700" />
            </div>
            <span className="ml-1">More</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2 flex-1 pb-6 w-full flex flex-col justify-center">
        <div className="flex flex-col xl:flex-row w-full gap-4 xl:gap-8 items-center justify-center">
            
            {/* Heatmap Section */}
            <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
                <TooltipProvider delayDuration={0}>
                  <div className="min-w-fit pr-4">
                    <div className="flex gap-[4px]">
                      {/* Day labels (Y-axis) */}
                      <div className="flex flex-col gap-[4px] mr-2 pt-[24px] w-8 flex-shrink-0 justify-between">
                        {dayLabels.map((label, i) => (
                          <div key={i} className="h-[14px] flex items-center justify-end">
                            <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Matrix Container */}
                      <div className="relative">
                        {/* Month labels (X-axis) */}
                        <div className="absolute top-0 left-0 flex h-[24px] w-full items-end pb-1.5">
                          {monthLabels.map((month, i) => {
                            // Each column is 14px + 4px gap = 18px width
                            const leftPos = month.index * 18;
                            return (
                              <span
                                key={i}
                                className="absolute text-[11px] text-slate-500 font-bold tracking-wide"
                                style={{ left: `${leftPos}px` }}
                              >
                                {month.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Grid matrix */}
                        <div className="flex gap-[4px] pt-[24px]">
                          {weeks.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-[4px]">
                              {Array.from({ length: 7 }, (_, dIdx) => {
                                const day = week[dIdx];
                                
                                let tooltipDateStr = "";
                                if (day && day.date) {
                                    const [y, m, d] = day.date.split('-');
                                    tooltipDateStr = `${d}/${m}/${y}`;
                                }

                                return (
                                  <div key={dIdx} className="w-[14px] h-[14px]">
                                    {day ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={cn(
                                              "w-full h-full rounded-[3px] transition-all cursor-pointer",
                                              getColor(day.minutes)
                                            )}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent 
                                          side="top" 
                                          className="bg-[#1f2328] text-white border-none px-3 py-2 rounded-lg text-xs font-semibold shadow-xl"
                                          sideOffset={6}
                                        >
                                          {day.minutes === 0 ? (
                                            <p>No activity on {tooltipDateStr}</p>
                                          ) : (
                                            <p>{day.minutes} minutes on {tooltipDateStr}</p>
                                          )}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <div className="w-full h-full rounded-[3px] bg-transparent" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
            </div>

            {/* Stats section */}
            <div className="flex w-full xl:w-[220px] flex-row xl:flex-col justify-between xl:justify-center gap-4 xl:gap-6 xl:pl-8 xl:border-l border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Time</p>
                      <p className="text-xl xl:text-2xl font-black text-slate-800 leading-none">{totalHours}<span className="text-sm font-semibold text-slate-500 ml-1">hrs</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Flame className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Current Streak</p>
                      <p className="text-xl xl:text-2xl font-black text-slate-800 leading-none">{currentStreak}<span className="text-sm font-semibold text-slate-500 ml-1">days</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Longest Streak</p>
                      <p className="text-xl xl:text-2xl font-black text-slate-800 leading-none">{maxStreak}<span className="text-sm font-semibold text-slate-500 ml-1">days</span></p>
                    </div>
                </div>
            </div>

        </div>
      </CardContent>
    </Card>
  );
}
