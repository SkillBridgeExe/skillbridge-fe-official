import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import VideoMode from "@/components/mentor/VideoMode";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MentorRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  // Video State
  const [videoMode, setVideoMode] = useState<"calling" | "connected" | "ended">("calling");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // mock the active video session
  const activeVideoSession = {
    id: roomId || "room-1",
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    duration: "60 mins",
    status: "active",
    topic: "React Performance & Code Review"
  };

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col p-4 relative">
      <div className="flex items-center justify-between mb-4 px-2 relative z-50">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-white dark:bg-slate-900/10" 
          onClick={() => navigate('/mentor-dashboard')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="text-white text-center">
          <h2 className="font-bold text-lg">Meeting Room: {roomId}</h2>
          <p className="text-xs text-white/50">{activeVideoSession.topic}</p>
        </div>
        <div className="w-32" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-slate-900/5 border border-white/10 relative z-40">
        <VideoMode
          mentorName="Mentee" // Here we switch the roles, since the mentor is viewing, the other person is "Mentee"
          activeVideoSession={activeVideoSession}
          videoMode={videoMode}
          isMicOn={isMicOn}
          isCameraOn={isCameraOn}
          isRecording={isRecording}
          recordingTime={0}
          setIsMicOn={setIsMicOn}
          setIsCameraOn={setIsCameraOn}
          setVideoMode={setVideoMode}
          setIsRecording={setIsRecording}
          onEndCall={() => navigate('/mentor-dashboard')}
        />
      </div>
    </div>
  );
}