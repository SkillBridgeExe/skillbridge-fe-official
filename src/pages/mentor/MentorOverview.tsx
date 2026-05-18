import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Star, DollarSign, Calendar,
  ArrowRight, MessageCircle, Video, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SESSION_HISTORY, MENTEE_REQUESTS } from "@/lib/mock-data/mentor-dashboard";

const KPI = [
  { label: "Total Sessions", value: "124", sub: "+8 this month", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
  { label: "Avg. Review", value: "4.8", sub: "From total reviews", icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
  { label: "Active Mentees", value: "4", sub: "3 fully paid", icon: Users, color: "text-primary", bg: "bg-primary/5" },
  { label: "Monthly Earnings", value: "₫2.7M", sub: "+₫450K vs last month", icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50" },
];

export default function MentorOverview() {
  const recentSessions = SESSION_HISTORY.slice(0, 3);
  const newRequests = MENTEE_REQUESTS.filter(r => r.status === "new");

  return (
    <div className="w-full max-w-none space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-poppins font-bold text-slate-900 dark:text-white">
              Good morning, Minh! 
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base mt-2">Saturday, 21 Month 3 Year 2026</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-500">3 new pending requests</span>
            <Link to="/mentor-dashboard/requests">
              <Button size="sm" variant="ghost" className="text-amber-700 dark:text-amber-500 h-7 px-2 hover:bg-amber-100">
                View now <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
          >
            <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", kpi.bg)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{kpi.label}</p>
                <p className="text-xs text-primary font-medium mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upcoming session */}
        <div className="lg:col-span-3 space-y-6">
          {/* Next session */}
          <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <div className="bg-primary p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4" />
                <span className="font-bold text-sm">Upcoming Session</span>
              </div>
              <p className="text-white/80 text-xs">Today • 20:00 - 21:30</p>
            </div>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary text-white font-bold text-sm">HN</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Hoang Van Nam</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">React Performance & Code Review</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary/90 border-0 text-xs">Paid</Badge>
              </div>
              <div className="flex items-center gap-2 mt-4">
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary gap-2 shadow-sm" 
                    size="sm"
                    onClick={() => window.open("/mentor-room/m001", "_blank")}
                  >
                    <Video className="w-4 h-4" /> Join Call
                  </Button>
                  <Link to="/mentor-dashboard/workspace?mentee=m001">
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageCircle className="w-4 h-4" /> Chat
                    </Button>
                  </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent sessions */}
          <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Recent Sessions</CardTitle>
                <Link to="/mentor-dashboard/history">
                  <Button variant="ghost" size="sm" className="text-primary text-xs h-7">
                    View all <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0b1120] hover:bg-slate-100 dark:bg-slate-800 transition-all">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                      {session.menteeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{session.menteeName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.topic}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-primary">+₫{session.earnings.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">{session.date}</p>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", session.status === "completed" ? "bg-primary/90" : "bg-slate-300 dark:bg-slate-700")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* New Requests */}
          <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">New Requests</CardTitle>
                <Badge className="bg-red-100 text-red-600 border-0 text-xs">{newRequests.length} new</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {newRequests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-50 dark:bg-[#0b1120] rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-white text-xs font-bold">{req.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{req.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{req.goalRole}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{req.message}</p>
                  <Link to="/mentor-dashboard/requests">
                    <Button size="sm" className="w-full h-7 text-xs bg-primary hover:bg-primary">
                      View & Respond
                    </Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Session Completion Rate", value: 94, color: "bg-primary" },
                { label: "reviews 5 stars", value: 78, color: "bg-amber-400" },
                { label: "Rate reschedule", value: 67, color: "bg-blue-50 dark:bg-blue-500/100" },
              ].map((stat) => (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stat.label}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{stat.value}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", stat.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ delay: 0.5, duration: 1 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
