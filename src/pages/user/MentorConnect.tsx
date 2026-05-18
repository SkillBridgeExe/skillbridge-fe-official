import Layout from "@/components/layout/Layout";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Languages, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

// Components
import MentorHeader from "@/components/mentor/MentorHeader";
import MentorSidebar from "@/components/mentor/MentorSidebar";
import ChatMode from "@/components/mentor/ChatMode";
import VideoMode from "@/components/mentor/VideoMode";
import ScheduleMode from "@/components/mentor/ScheduleMode";

// Mock Data & Types
import { INITIAL_SCHEDULED_SESSIONS, MENTOR_DATA } from "@/lib/mock-data/mentor";
import { ScheduledSession, SessionNote, SessionGoal, SessionRecording } from "@/types/mentor";

export default function MentorConnect() {
  const [searchParams] = useSearchParams();
  const mentor = searchParams.get("mentor") || "Sarah Connor";

  // Core Main State
  const [showMentorInfo, setShowMentorInfo] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'video' | 'schedule'>('chat');

  // Chat State
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: "Hello! I'm " + mentor + ". I'm excited to connect with you. How can I help you today?", time: '10:00 AM' }
  ]);

  // Video State
  const [videoMode, setVideoMode] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingTime = 0; // TODO: wire up recording timer when VideoMode supports it
  const [activeVideoSession, setActiveVideoSession] = useState<ScheduledSession | null>(null);

  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>(INITIAL_SCHEDULED_SESSIONS);
  const [bookingRequestKey, setBookingRequestKey] = useState(0);

  // Notes & Goals Storage State
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [sessionGoals, setSessionGoals] = useState<SessionGoal[]>([]);
  const [sessionRecordings, setSessionRecordings] = useState<SessionRecording[]>([]);


  useEffect(() => {
    const savedNotes = localStorage.getItem("mentor-notes-" + mentor);
    if (savedNotes) setSessionNotes(JSON.parse(savedNotes));
    const savedGoals = localStorage.getItem("mentor-goals-" + mentor);
    if (savedGoals) setSessionGoals(JSON.parse(savedGoals));
    const savedRecordings = localStorage.getItem("mentor-recordings-" + mentor);
    if (savedRecordings) setSessionRecordings(JSON.parse(savedRecordings));
  }, [mentor]);

  const mentorInfoData = MENTOR_DATA[mentor] || MENTOR_DATA["Sarah Connor"];

  const upcomingSession = scheduledSessions.find(s => s.status === 'scheduled' || s.status === 'started') || null;

  const handleBookingRequest = (slot: { date: string; time: string; duration: string }) => {
    const newRequest: ScheduledSession = {
      id: `pending-${Date.now()}`,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      status: 'pending',
      topic: 'Mentorship Session Request'
    };

    setScheduledSessions((prev) => [newRequest, ...prev]);
    setActiveMode('schedule');
    toast({
      title: 'Booking request sent',
      description: 'Your session is waiting for mentor confirmation.'
    });
  };

  const handleRescheduleSession = (id: string) => {
    setScheduledSessions((prev) =>
      prev.map((session) =>
        session.id === id && (session.status === 'pending' || session.status === 'declined')
          ? { ...session, status: 'cancelled', topic: `${session.topic || 'Session'} (rescheduled request)` }
          : session
      )
    );

    setActiveMode('chat');
    setBookingRequestKey((prev) => prev + 1);
    toast({
      title: 'Pick a new slot',
      description: 'Please choose another time and send a new request.'
    });
  };

  const renderMode = () => {
    switch (activeMode) {
      case 'chat':
        return (
          <ChatMode 
            mentorName={mentor}
            chatHistory={chatHistory}
            message={message}
            setMessage={setMessage}
            bookingRequestKey={bookingRequestKey}
            onSendMessage={() => {
              if (!message.trim()) return;
              const newMsg = { role: 'user', content: message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
              setChatHistory(prev => [...prev, newMsg]);
              setMessage("");
              setTimeout(() => {
                setChatHistory(prev => [...prev, { role: 'ai', content: "That is a great point. Let's discuss it deeper in our next session.", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
              }, 1000);
            }}
            onBookSession={handleBookingRequest}
          />
        );
      case 'video':
        return (
          <VideoMode 
            mentorName={mentor}
            activeVideoSession={activeVideoSession}
            videoMode={videoMode}
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isRecording={isRecording}
            recordingTime={recordingTime}
            setIsMicOn={setIsMicOn}
            setIsCameraOn={setIsCameraOn}
            setVideoMode={setVideoMode}
            setIsRecording={setIsRecording}
            onEndCall={() => setActiveMode('chat')}
          />
        );
      case 'schedule':
        return (
          <ScheduleMode 
            mentorName={mentor}
            scheduledSessions={scheduledSessions}
            onCancelSession={(id) => {
              setScheduledSessions(prev => prev.filter(s => s.id !== id));
              toast({ title: "Session cancelled" });
            }}
            onRescheduleSession={handleRescheduleSession}
            onJoinSession={(s) => {
              setActiveVideoSession(s);
              setActiveMode('video');
            }}
            onViewNotes={(_id) => {
              // placeholder
              toast({ title: "Viewing notes..." });
            }}
            onViewRecording={(_id) => {
              // placeholder
              toast({ title: "Viewing recording..." });
            }}
          />
        );
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl flex flex-col mx-auto px-6 py-12 w-full">
        <MentorHeader 
          mentorName={mentor}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
          onShowMentorInfo={() => setShowMentorInfo(true)}
        />

        {activeMode === 'video' ? (
          <div className="w-full">
            {renderMode()}
          </div>
        ) : (
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 ${activeMode === 'chat' ? 'min-h-[650px]' : 'min-h-0'} items-start`}>
            <div className={`lg:col-span-8 flex flex-col ${activeMode === 'chat' ? 'h-full' : 'h-auto'} bg-slate-50/20 rounded-3xl p-2 border border-slate-100/50`}>
              {renderMode()}
            </div>
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24 rounded-3xl p-4 h-max self-start shadow-lg bg-slate-50 border border-slate-100">
              <MentorSidebar 
                upcomingSession={upcomingSession}
                sessionGoals={sessionGoals}
                sessionNotes={sessionNotes}
                sessionRecordings={sessionRecordings}
                activeMode={activeMode}
                onAddGoal={() => toast({ title: "Goal feature coming soon!" })}
                onToggleGoal={(id) => {
                  const updated = sessionGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
                  setSessionGoals(updated);
                  localStorage.setItem("mentor-goals-" + mentor, JSON.stringify(updated));
                }}
                onDeleteGoal={(id) => {
                  const updated = sessionGoals.filter(g => g.id !== id);
                  setSessionGoals(updated);
                  localStorage.setItem("mentor-goals-" + mentor, JSON.stringify(updated));
                }}
                onShowRecordings={() => toast({ title: "Recordings modal placeholder" })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mentor Info Dialog */}
      <Dialog open={showMentorInfo} onOpenChange={setShowMentorInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={`https://i.pravatar.cc/150?u=${mentor.toLowerCase().replace(" ", "")}`} />
                <AvatarFallback>{mentor[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-slate-900">{mentorInfoData.name}</div>
                <div className="text-sm text-slate-500 font-normal">{mentorInfoData.role}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-slate-600 leading-relaxed">{mentorInfoData.bio}</p>
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-slate-700 font-medium">{mentorInfoData.rating} ({mentorInfoData.sessions} sessions)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">{mentorInfoData.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">{mentorInfoData.languages.join(", ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 font-medium">Response: {mentorInfoData.responseTime}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-3 text-slate-900">Expertise</div>
              <div className="flex flex-wrap gap-2">
                {mentorInfoData.expertise.map((skill: string) => (
                  <span key={skill} className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">{skill}</span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 sm:justify-center">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl px-8">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
