import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import type { SkillCategory } from "@/lib/mock-data/dashboard";
import { Sparkles } from "lucide-react";

interface SkillRadarChartProps {
  data: SkillCategory[];
}

export default function SkillRadarChart({ data }: SkillRadarChartProps) {
  return (
    <Card className="glass border-white/50 shadow-sm overflow-hidden relative flex flex-col h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />
      
      <CardHeader className="pb-0 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
             <Sparkles className="w-4 h-4 text-primary" />
           </div>
           <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Average Skill Score
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1 font-medium">Based on CV analysis and practice exercises</p>
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex items-center justify-center pt-4 pb-4 relative z-10 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <PolarGrid
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: "#475569", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
              tickCount={5}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
              }}
              itemStyle={{ color: "#0f172a" }}
              formatter={(value: number) => [`${value}/100`, "Score"]}
            />
            <Radar
              name="Current"
              dataKey="score"
              stroke="#0ea5e9"
              fill="url(#colorScore)"
              fillOpacity={1}
              strokeWidth={2.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
