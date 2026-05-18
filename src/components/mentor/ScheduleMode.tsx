import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, Video, FileText, UserPlus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ScheduledSession } from "../../types/mentor";

interface ScheduleModeProps {
  mentorName: string;
  scheduledSessions: ScheduledSession[];
  onCancelSession: (id: string) => void;
  onJoinSession: (session: ScheduledSession) => void;
  onViewNotes: (id: string) => void;
  onViewRecording: (id: string) => void;
  onRescheduleSession: (id: string) => void;
}

type FilterStatus = "All" | "Upcoming" | "Pending" | "Completed" | "Cancelled";

export default function ScheduleMode({
  mentorName,
  scheduledSessions,
  onCancelSession,
  onJoinSession,
  onViewNotes,
  onViewRecording,
  onRescheduleSession
}: ScheduleModeProps) {
  const [filter, setFilter] = useState<FilterStatus>("All");

  const getSessionBucket = (status: string) => {
    if (status === "scheduled" || status === "started" || status === "upcoming") return "Upcoming";
    if (status === "pending") return "Pending";
    if (status === "declined") return "Needs Reschedule";
    if (status === "completed") return "Completed";
    if (status === "cancelled") return "Cancelled";
    return "All";
  };

  const filteredSessions = scheduledSessions.filter(session => {
    if (filter === "All") return true;
    return getSessionBucket(session.status) === filter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case "upcoming": return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none";
      case "completed": return "bg-green-100 text-green-700 hover:bg-green-200 border-none";
      case "cancelled": return "bg-red-100 text-red-700 hover:bg-red-200 border-none";
      case "pending": return "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none";
      case "declined": return "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="glass border-white/50 shadow-xl overflow-hidden rounded-[2.5rem] flex flex-col">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="text-2xl font-bold">Sessions with {mentorName}</CardTitle>
          <CardDescription>Manage your scheduled 1:1 sessions</CardDescription>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          {["All", "Upcoming", "Pending", "Completed", "Cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterStatus)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-8 bg-slate-50/30">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </Badge>
                      <h4 className="font-bold text-lg text-slate-900">{session.topic}</h4>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <Clock className="w-4 h-4 text-primary" />
                        {session.time} ({session.duration} min)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {session.status === 'upcoming' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
                          onClick={() => onCancelSession(session.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button 
                          className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-glow"
                          onClick={() => onJoinSession(session)}
                        >
                          <Video className="w-4 h-4 mr-2" /> Join
                        </Button>
                      </>
                    )}

                    {session.status === 'scheduled' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl"
                          onClick={() => onCancelSession(session.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button 
                          className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-glow"
                          onClick={() => onJoinSession(session)}
                        >
                          <Video className="w-4 h-4 mr-2" /> Join
                        </Button>
                      </>
                    )}

                    {session.status === 'pending' && (
                      <>
                        <div className="flex-1 md:flex-none text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl font-semibold">
                          Awaiting mentor confirmation
                        </div>
                        <Button
                          variant="outline"
                          className="flex-1 md:flex-none font-bold rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                          onClick={() => onRescheduleSession(session.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Reschedule
                        </Button>
                      </>
                    )}

                    {session.status === 'declined' && (
                      <>
                        <div className="flex-1 md:flex-none text-xs text-orange-700 bg-orange-50 border border-orange-100 px-3 py-2 rounded-xl font-semibold">
                          Mentor declined this slot
                        </div>
                        <Button
                          className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                          onClick={() => onRescheduleSession(session.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Book New Session
                        </Button>
                      </>
                    )}
                    
                    {session.status === 'completed' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 md:flex-none font-bold rounded-xl text-slate-600 bg-white"
                          onClick={() => onViewNotes(session.id)}
                        >
                          <FileText className="w-4 h-4 mr-2" /> View Notes
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 md:flex-none font-bold rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                          onClick={() => onViewRecording(session.id)}
                        >
                          <Video className="w-4 h-4 mr-2" /> Recording
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No {filter !== "All" ? filter.toLowerCase() : ""} sessions found</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  You don't have any {filter !== "All" ? filter.toLowerCase() : ""} sessions scheduled with {mentorName} at the moment.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
