import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Paperclip, Mic, Send, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface ChatModeProps {
  mentorName: string;
  chatHistory: Array<{ role: string; content: string; time: string; type?: string }>;
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
  onBookSession?: (details: { date: string; time: string; duration: string }) => void;
  bookingRequestKey?: number;
}

export default function ChatMode({
  mentorName,
  chatHistory: initialHistory,
  message,
  setMessage,
  onSendMessage,
  onBookSession,
  bookingRequestKey = 0
}: ChatModeProps) {
  const [showBooking, setShowBooking] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [selectedDateId, setSelectedDateId] = useState("thu-13");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync with parent updates (e.g. AI replies) without overriding local-only booking entries.
    if (initialHistory.length >= history.length) {
      setHistory(initialHistory);
    }
  }, [initialHistory, history.length]);

  useEffect(() => {
    if (!bookingRequestKey) return;
    setShowBooking(true);
  }, [bookingRequestKey]);

  const bookingDates = [
    { id: "thu-13", label: "Thu 13", shortDay: "THU", dayNumber: "13", fullDate: "Tomorrow" },
    { id: "fri-14", label: "Fri 14", shortDay: "FRI", dayNumber: "14", fullDate: "Friday" },
    { id: "sat-15", label: "Sat 15", shortDay: "SAT", dayNumber: "15", fullDate: "Saturday" },
  ];

  const timeSlotsByDate: Record<string, string[]> = {
    "thu-13": ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"],
    "fri-14": ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"],
    "sat-15": ["8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM"],
  };

  const availableSlots = timeSlotsByDate[selectedDateId] || [];
  const selectedDateMeta = bookingDates.find((date) => date.id === selectedDateId) || bookingDates[0];

  useGSAP(() => {
    if (chatContainerRef.current) {
      const messages = chatContainerRef.current.querySelectorAll('.message-bubble');
      if (messages.length > 0) {
        gsap.from(messages, {
          y: 20,
          opacity: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.2)"
        });
      }
    }
  }, []);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMsg = {
      role: 'user',
      content: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setHistory(prev => [...prev, newMsg]);
    onSendMessage();
    setMessage("");
    
    setTimeout(() => {
      const messages = document.querySelectorAll('.message-bubble');
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        gsap.fromTo(lastMsg, 
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" }
        );
        lastMsg.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleBookSession = (slot: { date: string; time: string; duration: string }) => {
    const defaultBookingMsg = `I'd like to book a session for ${slot.date} at ${slot.time}.`;
    const confirmationMsg = {
      role: 'system',
      type: 'booking_confirmation',
      content: `Booking request sent for ${slot.date} at ${slot.time}. Waiting for mentor confirmation.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setHistory(prev => [
      ...prev, 
      { role: 'user', content: defaultBookingMsg, time: confirmationMsg.time },
      confirmationMsg
    ]);
    
    setShowBooking(false);
    setSelectedTime(null);
    
    if (onBookSession) {
      onBookSession(slot);
    }

    setTimeout(() => {
      const messages = document.querySelectorAll('.message-bubble');
      if (messages.length >= 2) {
        const lastTwo = Array.from(messages).slice(-2);
        gsap.fromTo(lastTwo,
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.5)" }
        );
        lastTwo[1].scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <Card className="flex flex-col h-[700px] glass border-white/50 shadow-xl overflow-hidden rounded-[2.5rem] relative">
      <div 
        ref={chatContainerRef}
        className="flex-grow p-8 overflow-y-auto space-y-8 bg-slate-50/30 pb-36"
      >
        {history.map((msg, i) => (
          <div key={i} className={cn("message-bubble flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row", msg.type === 'booking_confirmation' && "justify-center")}>
            
            {msg.type === 'booking_confirmation' ? (
              <div className="bg-primary/5 border border-emerald-100/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm w-full max-w-sm mx-auto my-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-primary text-sm">Booking Confirmed!</h4>
                <p className="text-xs text-primary mt-1">{msg.content}</p>
                <Button variant="outline" size="sm" className="mt-3 bg-white h-8 text-xs text-primary/90 border-primary/20 hover:bg-primary/5">
                  Add to Calendar
                </Button>
              </div>
            ) : (
              <>
                <Avatar className="w-12 h-12 shadow-sm border-2 border-white shrink-0">
                  {msg.role === 'user' ? (
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">ME</AvatarFallback>
                  ) : (
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${mentorName.toLowerCase().replace(" ", "")}`} />
                  )}
                </Avatar>
                <div className={cn("max-w-[75%] space-y-2", msg.role === 'user' ? "items-end text-right" : "items-start text-left")}>
                  <div className={cn(
                    "p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm relative group",
                    msg.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">{msg.time}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            <div className="md:col-span-2 border-r border-slate-100 p-6 bg-slate-50/70">
              <DialogHeader className="mb-5">
                <DialogTitle className="text-xl font-poppins font-bold text-slate-900">Select an appointment time</DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">Choose your preferred day and time.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {bookingDates.map((date) => (
                  <button
                    key={date.id}
                    onClick={() => {
                      setSelectedDateId(date.id);
                      setSelectedTime(null);
                    }}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left transition-all",
                      selectedDateId === date.id
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:border-primary/40"
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{date.shortDay}</p>
                    <p className="text-sm font-bold leading-tight">{date.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-slate-900">Available slots for {selectedDateMeta.fullDate}</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-bold transition-all",
                      selectedTime === slot
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-primary border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  {selectedTime
                    ? `Selected: ${selectedDateMeta.fullDate} at ${selectedTime}`
                    : "Please select a time slot to continue"}
                </p>
                <Button
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
                  disabled={!selectedTime}
                  onClick={() => {
                    if (!selectedTime) return;
                    handleBookSession({
                      date: selectedDateMeta.fullDate,
                      time: selectedTime,
                      duration: "45 min"
                    });
                  }}
                >
                  Request Confirmation
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("h-8 rounded-full text-xs gap-1.5 transition-all", showBooking ? "bg-primary text-white border-primary" : "text-slate-600")}
            onClick={() => setShowBooking(true)}
          >
            <Calendar className="w-3.5 h-3.5" /> Book Session
          </Button>
          {/* <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-slate-600 gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Send Document
          </Button> */}
        </div>

        <div className="flex gap-3 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full text-slate-400 hover:text-primary bg-slate-50 relative shrink-0"
          >
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Upload file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setMessage(`Attachment: ${file.name}`);
              }}
            />
            <Paperclip className="w-4 h-4 pointer-events-none" />
          </Button>

          <div className="flex-grow relative">
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-5 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
              placeholder={`Message ${mentorName}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-slate-400 hover:text-primary">
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            className="h-12 w-12 rounded-full shadow-lg shrink-0"
            onClick={handleSendMessage}
            disabled={!message.trim()}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
