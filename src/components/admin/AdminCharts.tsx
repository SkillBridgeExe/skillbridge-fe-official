import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type AdminFunnelItem = { label: string; value: number };
type DonutItem = { name: string; value: number; color: string };

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: Math.abs(value) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function EmptyChart({ label = "No chart data yet" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 text-center text-sm font-medium text-muted-foreground">
      {label}
    </div>
  );
}

export function AdminFunnelChartCard({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: AdminFunnelItem[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-2">
        {items.length ? (
          <div className="flex h-[240px] flex-col justify-center gap-4">
            {items.map((item, index) => {
              const width = maxValue ? Math.max((item.value / maxValue) * 100, 8) : 0;
              const share = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-foreground">{item.label}</span>
                    <span className="shrink-0 font-mono font-semibold tabular-nums text-muted-foreground">
                      {formatCompact(item.value)} · {share}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${width}%`, backgroundColor: colors[index % colors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyChart />
        )}
      </CardContent>
    </Card>
  );
}

export function AdminLineChartCard({
  title,
  description,
  data,
  dataKey,
  xKey,
  axisValueFormatter,
  valueFormatter,
}: {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey: string;
  dataKey: string;
  axisValueFormatter?: (value: number) => string;
  valueFormatter?: (value: number) => string;
}) {
  const config = useMemo<ChartConfig>(
    () => ({
      [dataKey]: {
        label: title,
        color: "hsl(var(--chart-1))",
      },
    }),
    [dataKey, title],
  );

  const chartId = `admin-line-${dataKey}-${title.replace(/\W+/g, "-").toLowerCase()}`;
  const hasData = data.some((item) => Number(item[dataKey] ?? 0) > 0);

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-2">
        {data.length && hasData ? (
          <ChartContainer id={chartId} config={config} className="h-[260px] w-full aspect-auto min-w-0">
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={26}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={axisValueFormatter || valueFormatter ? 70 : 38}
                tickFormatter={(value) =>
                  axisValueFormatter
                    ? axisValueFormatter(Number(value))
                    : valueFormatter
                      ? valueFormatter(Number(value))
                      : formatCompact(Number(value))
                }
              />
              <ChartTooltip
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => (
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {valueFormatter ? valueFormatter(Number(value)) : Number(value).toLocaleString()}
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={`var(--color-${dataKey})`}
                strokeWidth={2.5}
                fill={`url(#${chartId}-fill)`}
                dot={{ r: 2.5, fill: `var(--color-${dataKey})`, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyChart />
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDonutChartCard({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: DonutItem[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        ...item,
        fill: item.color || `hsl(var(--chart-${(index % 5) + 1}))`,
      })),
    [data],
  );

  const config = useMemo<ChartConfig>(
    () =>
      chartData.reduce<ChartConfig>((acc, item) => {
        acc[item.name] = {
          label: item.name,
          color: item.fill,
        };
        return acc;
      }, {}),
    [chartData],
  );

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pt-2">
        {total ? (
          <div className="grid h-[240px] grid-cols-[minmax(150px,0.85fr)_1fr] items-center gap-4">
            <div className="relative min-h-[180px]">
              <ChartContainer id={`admin-donut-${title.replace(/\W+/g, "-").toLowerCase()}`} config={config} className="h-[190px] w-full aspect-square">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={4}
                    isAnimationActive={false}
                  >
                    {chartData.map((item) => (
                      <Cell key={item.name} fill={item.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                  {total.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-muted-foreground">total</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              {chartData.map((item) => {
                const share = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="grid gap-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="truncate font-semibold text-foreground">{item.name}</span>
                      </div>
                      <span className="shrink-0 font-mono font-semibold tabular-nums text-muted-foreground">
                        {share}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", share === 0 ? "opacity-0" : "")}
                        style={{ width: `${Math.max(share, 4)}%`, backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyChart />
        )}
      </CardContent>
    </Card>
  );
}
