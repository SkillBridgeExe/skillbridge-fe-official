import { useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminAIChat from "@/components/admin/AdminAIChat";
import {
  AdminDonutChartCard,
  AdminFunnelChartCard,
  AdminLineChartCard,
} from "@/components/admin/AdminCharts";
import AdminProgressRing from "@/components/admin/AdminProgressRing";
import { AI_DECISIONS, ADMIN_LEARNING_METRICS, ROLE_DISTRIBUTION } from "@/lib/mock-data/admin";
import { Search } from "lucide-react";

const IMPACT_META: Record<string, { tone: string; label: string }> = {
  high: { tone: "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/30 text-red-700 dark:text-red-300", label: "High Impact" },
  medium: { tone: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/30 text-amber-700 dark:text-amber-300", label: "Medium Impact" },
  low: { tone: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/30 text-blue-700 dark:text-blue-300", label: "Low Impact" },
};

export default function AdminInsights() {
  const [timeRange, setTimeRange] = useState("7d");
  const [segment, setSegment] = useState("all");

  const funnelItems = useMemo(
    () => [
      { label: "CV", value: 124800 },
      { label: "Analysis", value: 18720 },
      { label: "Roadmap", value: 12480 },
      { label: "Mentor", value: 6240 },
      { label: "Interview", value: 3744 },
      { label: "Job", value: 1650 },
    ],
    []
  );

  const userBehaviorData = useMemo(() => {
    // Proxy for "user behavior": use enrolled/completed + certificatesEarned.
    return ADMIN_LEARNING_METRICS.map((m) => ({
      month: m.month,
      activity: m.completedCourses * 42 + m.certificatesEarned * 120,
    }));
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-poppins">Insights & AI Decision Support</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detect where users drop, explain revenue changes, and suggest actions for mentors/content (mock).
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="w-full sm:w-44">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Time range</div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Segment</div>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="frontend">Frontend learners</SelectItem>
                <SelectItem value="premium">Premium users</SelectItem>
                <SelectItem value="business">Business plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => toast({ title: " Filter applied", description: `time=${timeRange}, segment=${segment} (mock)` })}
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_DECISIONS.map((d) => {
            const impact = IMPACT_META[d.impact];
            return (
              <Card key={d.id} className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={impact.tone + " inline-flex items-center gap-2 border px-3 py-1.5 rounded-full"}>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{d.urgency}</span>
                      </div>
                      <div className="mt-3 text-base font-black text-slate-900 dark:text-slate-100 leading-tight">{d.title}</div>
                    </div>
                    <div className="shrink-0">
                      <AdminProgressRing
                        value={d.confidence}
                        size={58}
                        strokeWidth={8}
                        colorClass={d.impact === "high" ? "text-red-500" : d.impact === "medium" ? "text-amber-500" : "text-blue-500"}
                        labelSuffix="%"
                        labelClassName="text-[12px] font-black text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{d.insight}</div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Estimated impact</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {d.estimatedRevenue ? `₫${Math.round(d.estimatedRevenue / 1000000)}M` : "—"}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl w-full"
                      onClick={() =>
                        toast({ title: "✅ Action queued", description: `Applied: ${d.type} (mock)` })
                      }
                    >
                      Apply action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="min-w-0">
            <AdminFunnelChartCard title="Drop user flow (CV → Job)" items={funnelItems} />
          </div>
          <div className="min-w-0">
            <AdminLineChartCard
              title="User behavior signal"
              xKey="month"
              dataKey="activity"
              data={userBehaviorData}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AdminDonutChartCard title="Role distribution" data={ROLE_DISTRIBUTION} />
        </div>
        <div className="lg:col-span-2">
          <AdminAIChat />
        </div>
      </div>
    </div>
  );
}

