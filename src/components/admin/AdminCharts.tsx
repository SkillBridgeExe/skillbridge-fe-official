import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  FunnelChart,
  Funnel,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type AdminFunnelItem = { label: string; value: number };

export function AdminFunnelChartCard({
  title,
  items,
}: {
  title: string;
  items: AdminFunnelItem[];
}) {
  const funnelData = useMemo(
    () => items.map((it) => ({ name: it.label, value: it.value })),
    [items]
  );

  const colors = ["#6366F1", "#22D3EE", "#34D399", "#F59E0B", "#EF4444", "#A78BFA"];

  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm overflow-hidden min-w-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</div>
        </div>
        <div className="h-[220px] min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip />
              <Funnel
                dataKey="value"
                data={funnelData}
                stroke="hsl(var(--border))"
                fill="#6366F1"
              >
                {funnelData.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminLineChartCard({
  title,
  data,
  dataKey,
  xKey,
}: {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  dataKey: string;
}) {
  const config = useMemo(
    () => ({
      [dataKey]: { label: title, color: "hsl(var(--ring))" },
    }),
    [dataKey, title]
  );

  const cssColorVar = `var(--color-${dataKey})`;

  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm overflow-hidden min-w-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</div>
        </div>
        <div className="h-[220px] min-w-0 overflow-hidden">
          <ChartContainer id={`admin-line-${title}`} config={config} className="h-full w-full aspect-auto min-w-0">
            <LineChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickMargin={8} width={34} />
              <Tooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={cssColorVar}
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 0, fill: cssColorVar }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDonutChartCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <Card className="rounded-2xl border-slate-200/70 dark:border-slate-700/70 shadow-sm overflow-hidden min-w-0">
      <CardContent className="p-4">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</div>
        <div className="h-[220px] min-w-0 overflow-hidden flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

