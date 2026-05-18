import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Video, Calendar, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface MentorHeaderProps {
  mentorName: string;
  activeMode: string;
  setActiveMode: (mode: 'chat' | 'video' | 'schedule') => void;
  onShowMentorInfo: () => void;
}

export default function MentorHeader({
  mentorName,
  activeMode,
  setActiveMode,
  onShowMentorInfo
}: MentorHeaderProps) {
  return (
    <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onShowMentorInfo}
          className="group relative cursor-pointer"
        >
          <Avatar className="w-20 h-20 border-4 border-white shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-105">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${mentorName.toLowerCase().replace(" ", "")}`} />
            <AvatarFallback>{mentorName[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-primary border-4 border-white rounded-full" />
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
            <User className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-poppins font-bold text-slate-900 leading-none">{mentorName}</h1>
            {/* <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold border border-emerald-100 uppercase tracking-widest">
              Live Now
            </div> */}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-slate-500 font-medium">Sr. Engineering Mentor</p>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-slate-700">4.9 (124 sessions)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 flex-wrap">
        <Button
          variant={activeMode === 'chat' ? 'default' : 'ghost'}
          className={cn("rounded-xl font-bold h-11 px-6 transition-all", activeMode === 'chat' && "shadow-glow")}
          onClick={() => setActiveMode('chat')}
        >
          <MessageSquare className="w-4 h-4 mr-2" /> Chat
        </Button>
        <Button
          variant={activeMode === 'video' ? 'default' : 'ghost'}
          className={cn("rounded-xl font-bold h-11 px-6 transition-all", activeMode === 'video' && "shadow-glow")}
          onClick={() => setActiveMode('video')}
        >
          <Video className="w-4 h-4 mr-2" /> Video
        </Button>
        <Button
          variant={activeMode === 'schedule' ? 'default' : 'ghost'}
          className={cn("rounded-xl font-bold h-11 px-6 transition-all", activeMode === 'schedule' && "shadow-glow")}
          onClick={() => setActiveMode('schedule')}
        >
          <Calendar className="w-4 h-4 mr-2" /> Schedule
        </Button>
      </div>
    </header>
  );
}