import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, CheckCircle2, Trash2, Calendar, FileText, Video, Bell, Clock, Map, BookOpen, Link, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionGoal, ScheduledSession, SessionNote, SessionRecording } from "../../types/mentor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface MentorSidebarProps {
  activeMode?: string;
  upcomingSession: ScheduledSession | null;
  sessionGoals: SessionGoal[];
  sessionNotes: SessionNote[];
  sessionRecordings: SessionRecording[];
  onAddGoal: () => void;
  onToggleGoal: (id: string) => void;
  onDeleteGoal: (id: string) => void;
  onShowRecordings: () => void;
}

export default function MentorSidebar({
  activeMode: _activeMode,
  upcomingSession,
  sessionGoals,
  sessionNotes,
  sessionRecordings: _sessionRecordings,
  onAddGoal,
  onToggleGoal,
  onDeleteGoal,
  onShowRecordings: _onShowRecordings
}: MentorSidebarProps) {
  return (
    <ScrollArea className="h-[calc(100vh-80px)] pr-4">
      <div className="space-y-6 pb-10">
        <Card className="glass border-white/50 shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="font-bold text-sm tracking-wide">Next Meeting</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              Today
            </Badge>
          </div>
          <CardContent className="p-5">
            {upcomingSession ? (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-lg leading-tight">{upcomingSession.topic || "Mentoring Session"}</h4>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Clock className="w-4 h-4 text-primary" />
                  {upcomingSession.time}
                </div>
                <Button className="w-full mt-2 gap-2 shadow-md">
                  <Video className="w-4 h-4" /> Join Call
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">No upcoming sessions</p>
                <Button variant="outline" size="sm" className="gap-2 w-full">
                  <Calendar className="w-4 h-4" /> Book Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/50 shadow-xl rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Recommended
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "React Performance Tuning", type: "Course", icon: Video },
              { title: "System Design Prep", type: "Document", icon: FileText },
              { title: "Interview Checklist", type: "Links", icon: Link },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 hover:bg-white rounded-xl transition-colors cursor-pointer border border-slate-100 shadow-sm">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-slate-800 line-clamp-1">{item.title}</h5>
                  <span className="text-xs text-slate-500">{item.type}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-white/50 shadow-xl rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" /> Action Items
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onAddGoal}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionGoals.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">All caught up!</p>
            ) : (
              sessionGoals.map(goal => (
                <div key={goal.id} className="group flex items-start gap-3 p-3 bg-white/60 hover:bg-white rounded-xl transition-all border border-slate-100 shadow-sm relative">
                  <button onClick={() => onToggleGoal(goal.id)} className="mt-0.5 shrink-0">
                    <CheckCircle2 className={cn("w-5 h-5 transition-colors", goal.completed ? "text-primary" : "text-slate-300 hover:text-primary")} />
                  </button>
                  <span className={cn("flex-grow text-sm leading-snug transition-all", goal.completed && "line-through text-slate-400")}>{goal.text}</span>
                  <button onClick={() => onDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/50 shadow-xl rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" /> Skill Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-4 border-l-2 border-primary/20 space-y-4 py-2">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-emerald-500/20" />
                <h5 className="text-sm font-semibold text-slate-800">Frontend Fundamentals</h5>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20" />
                <h5 className="text-sm font-semibold text-slate-800">Advanced React Patterns</h5>
                <p className="text-xs text-primary font-medium">In Progress</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white" />
                <h5 className="text-sm font-semibold text-slate-500">System Design</h5>
                <p className="text-xs text-slate-400">Next Step</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/50 shadow-xl rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Mentor Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200/50 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
              <p className="text-sm text-yellow-900 leading-relaxed italic">
                "Great progress on the state management module. Remember to focus on reducing unnecessary re-renders in the next assignment."
              </p>
              <div className="mt-2 text-xs text-yellow-700/70 font-medium">— Session on Oct 12</div>
            </div>
            <Button variant="outline" className="w-full justify-center gap-2 mt-2 bg-white/50">
              <FileText className="w-4 h-4" /> View All Notes ({sessionNotes.length})
            </Button>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
