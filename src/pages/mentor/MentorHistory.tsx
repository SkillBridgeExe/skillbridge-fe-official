import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  History, CheckCircle2, XCircle, Clock, Search,
  Filter, Download
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SESSION_HISTORY } from "@/lib/mock-data/mentor-dashboard";

const STATUS_CONFIG = {
  completed: { label: "Completed", color: "bg-primary/5 text-primary/90 border-primary", icon: CheckCircle2, iconColor: "text-primary" },
  cancelled: { label: "Cancelled", color: "bg-red-50 dark:bg-red-500/10 text-red-600 border-red-100", icon: XCircle, iconColor: "text-red-400" },
  no_show: { label: "No show", color: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800", icon: Clock, iconColor: "text-slate-400" },
};

const _STARS = [1, 2, 3, 4, 5];

export default function MentorHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = SESSION_HISTORY.filter(s => {
    const matchSearch = s.menteeName.toLowerCase().includes(search.toLowerCase()) ||
      s.topic.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalEarnings = SESSION_HISTORY.filter(s => s.status === "completed").reduce((sum, s) => sum + s.earnings, 0);
  const completedCount = SESSION_HISTORY.filter(s => s.status === "completed").length;
  const avgRating = SESSION_HISTORY.filter(s => s.rating).reduce((sum, s, _, arr) => sum + (s.rating || 0) / arr.length, 0);

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">History</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">All past mentoring sessions</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed Sessions", value: completedCount, sub: `/ ${SESSION_HISTORY.length} total`, color: "text-primary", bg: "bg-primary/5" },
          { label: "Total Earnings", value: `$${(totalEarnings / 1000000).toFixed(1)}M`, sub: "Paid", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Avg. Review", value: `${avgRating.toFixed(1)}`, sub: "Out of 5", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className={cn("text-2xl font-black font-poppins", stat.color)}>{stat.value}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{stat.label}</p>
                <p className="text-[11px] text-slate-400">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by student name or topic..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 border-slate-200 dark:border-slate-800 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 h-9 border-slate-200 dark:border-slate-800 text-sm">
              <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed"> Completed</SelectItem>
              <SelectItem value="cancelled"> Cancelled</SelectItem>
              <SelectItem value="no_show">⏳ No show</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
            <CardContent className="py-16 text-center">
              <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-600 dark:text-slate-400">No sessions found</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((session, idx) => {
          const config = STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.completed;
          const Icon = config.icon;
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Mentee Avatar */}
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                        {session.menteeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 dark:text-white">{session.menteeName}</p>
                        <Badge className={cn("text-[10px] border gap-1", config.color)}>
                          <Icon className={cn("w-3 h-3", config.iconColor)} />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{session.topic}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {session.date} • {session.duration}
                        </span>
                        {session.status === "completed" && (
                          <span className="text-xs font-bold text-primary">+${session.earnings.toLocaleString()}</span>
                        )}
                        {session.rating && (
                          <span className="text-xs text-amber-500 flex items-center gap-0.5 font-bold">
                              {Array.from({ length: session.rating ?? 0 }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-current" />
                              ))}
                              {Array.from({ length: 5 - (session.rating ?? 0) }).map((_, i) => (
                                <Star key={i + (session.rating ?? 0)} className="w-3 h-3 text-slate-300" />
                              ))}
                              <span className="ml-1">{session.rating}/5</span>
                          </span>
                        )}
                      </div>

                      {/* Review */}
                      {session.review && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 rounded-xl">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-1"> Review from student</p>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{session.review}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
