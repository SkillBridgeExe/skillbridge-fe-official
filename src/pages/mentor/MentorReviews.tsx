import { motion } from "framer-motion";
import { Star, MessageSquare, TrendingUp, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SESSION_HISTORY } from "@/lib/mock-data/mentor-dashboard";


export default function Mentorreviews() {
  const reviewed = SESSION_HISTORY.filter(s => s.rating && s.review);
  const allRatings = SESSION_HISTORY.filter(s => s.rating).map(s => s.rating!);
  const avg = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;

  // Distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: allRatings.filter(r => r === star).length,
    pct: allRatings.length ? Math.round((allRatings.filter(r => r === star).length / allRatings.length) * 100) : 0,
  }));

  return (
    <div className="w-full max-w-none space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-poppins font-bold text-slate-900 dark:text-white">Student Reviews</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Feedback after mentoring sessions</p>
      </motion.div>

      {/* Rating summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="glass border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden">
          <div className="bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-6xl font-black font-poppins text-white">{avg.toFixed(1)}</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-5 h-5", s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-slate-700 dark:text-slate-300 fill-slate-800")} />
                  ))}
                </div>
                <p className="text-slate-400 text-xs mt-2">{allRatings.length} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5 border-l border-slate-800 pl-6">
                {dist.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-slate-300 text-xs font-bold w-4">{star}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5 + star * 0.05, duration: 0.8 }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "5 stars", value: `${dist[0].pct}%`, color: "text-primary", icon: Award },
                { label: "Feedback", value: `${reviewed.length}`, color: "text-blue-600", icon: MessageSquare },
                { label: "Trend", value: "↑ +0.2", color: "text-violet-600", icon: TrendingUp },
              ].map(stat => (
                <div key={stat.label} className="p-3 bg-slate-50 dark:bg-[#0b1120] rounded-xl">
                  <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
                  <p className={cn("font-black text-lg", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Review cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {reviewed.length} DETAILED FEEDBACK
        </h2>
        {reviewed.map((session, idx) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <Card className="glass border-white/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                      {session.menteeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">{session.menteeName}</p>
                      <span className="text-xs text-slate-400">{session.date}</span>
                    </div>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={cn(
                            "w-4 h-4",
                            s <= (session.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"
                          )}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-500 ml-1">{session.rating}/5</span>
                    </div>
                    {/* Topic */}
                    <Badge className="mt-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 text-[10px]">{session.topic}</Badge>
                    {/* Review text */}
                    <blockquote className="mt-3 p-3 bg-amber-50 dark:bg-amber-500/10 border-l-4 border-amber-300 rounded-r-xl">
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{session.review}"</p>
                    </blockquote>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
