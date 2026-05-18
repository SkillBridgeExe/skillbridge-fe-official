import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import SkillRadarChart from "./SkillRadarChart";
import {
  MOCK_SKILL_CATEGORIES,
  MOCK_SKILLS,
  MOCK_SKILL_GROWTH,
} from "@/lib/mock-data/dashboard";
import { LayoutTemplate, Server, Cloud, Palette, Target, TrendingUp } from "lucide-react";

const CategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  switch (category) {
    case "Frontend": return <LayoutTemplate className={className} />;
    case "Backend": return <Server className={className} />;
    case "DevOps": return <Cloud className={className} />;
    case "Design": return <Palette className={className} />;
    default: return <Target className={className} />;
  }
};

export default function SkillsTab() {
  // Group skills by category
  const categories = [...new Set(MOCK_SKILLS.map((s) => s.category))];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Row: Radar + Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radar Chart takes up 4 columns on large screens */}
        <div className="lg:col-span-4 h-full">
          <SkillRadarChart data={MOCK_SKILL_CATEGORIES} />
        </div>

        {/* Skill Details Cards takes 8 columns */}
        <div className="lg:col-span-8">
          <Card className="glass border-white/50 shadow-sm h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100/30 rounded-full blur-[60px] pointer-events-none" />
            
            <CardHeader className="pb-4 relative z-10 border-b border-slate-100/50 bg-white/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Skill Deep Dive
                  </CardTitle>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Your proficiency across core technical domains</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {categories.map((cat) => (
                  <div key={cat} className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100/50 shadow-sm">
                        <CategoryIcon category={cat} className="w-4 h-4 text-slate-700" />
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                        {cat}
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      {MOCK_SKILLS.filter((s) => s.category === cat).map((skill) => (
                        <div key={skill.name} className="space-y-1.5 group">
                          <div className="flex justify-between items-center text-sm px-1">
                            <span className="font-semibold text-slate-600 group-hover:text-primary transition-colors">{skill.name}</span>
                            <span className={cn(
                              "font-bold text-[13px] bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100",
                              skill.level >= 80 ? "text-emerald-600" :
                              skill.level >= 50 ? "text-amber-600" : "text-red-500"
                            )}>
                              {skill.level}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100/80 rounded-full overflow-hidden shadow-inner flex">
                            <div
                              className={cn("h-full rounded-full transition-all duration-1000 ease-out", skill.color)}
                              style={{ width: `${skill.level}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Skill Growth Area Chart */}
      <Card className="glass border-white/50 shadow-sm relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <CardHeader className="pb-4 relative z-10 border-b border-slate-100/50 bg-white/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
               <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Growth Trajectory
              </CardTitle>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Evolution of your core skills over the last 6 weeks</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 relative z-10 w-full pl-0">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={MOCK_SKILL_GROWTH} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFrontend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBackend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorDevops" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
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
                itemStyle={{ paddingTop: 4, paddingBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ fontSize: "13px", fontWeight: 600, paddingTop: "20px" }}
                iconType="circle"
              />
              <Area type="monotone" dataKey="frontend" name="Frontend" stroke="#10b981" fillOpacity={1} fill="url(#colorFrontend)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }} />
              <Area type="monotone" dataKey="backend" name="Backend" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBackend)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: "#f59e0b" }} />
              <Area type="monotone" dataKey="devops" name="DevOps" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDevops)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0, fill: "#3b82f6" }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
