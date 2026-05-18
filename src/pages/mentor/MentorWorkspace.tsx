import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Video, Paperclip, Send, Mic, Search, FileText, Image as ImageIcon, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ACTIVE_MENTEES, ActiveMentee } from "@/lib/mock-data/mentor-dashboard";

interface Message {
  id: string;
  role: "mentor" | "mentee";
  content: string;
  time: string;
  type?: "text" | "file" | "image";
  fileName?: string;
  fileSize?: string;
}

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "m001": [
    { id: "1", role: "mentee", content: "Hi, I fixed the bug with React memo, please check it for me!", time: "10:15" },
    { id: "2", role: "mentor", content: "Ok, send the code here for me to see. Remember to include context about the affected component.", time: "10:20" },
    { id: "3", role: "mentee", content: "Hi, I fixed the bug, please check it again for me!", time: "10:32" },
  ],
  "m002": [
    { id: "1", role: "mentor", content: "Have you watched the video on TypeScript generics? We will practice it next session.", time: "Yesterday" },
    { id: "2", role: "mentee", content: "I understand, thank you very much!", time: "Yesterday" },
  ],
  "m003": [
    { id: "1", role: "mentee", content: "Can you review this PR? I have implemented it according to the pattern you guided.", time: "Yesterday" },
    { id: "2", role: "mentor", content: "I will take a look. Please link the GitHub PR.", time: "Yesterday" },
  ],
  "m004": [
    { id: "1", role: "mentee", content: "Hi, can I ask you about useCallback? I dont understand when to use it.", time: "2 days ago" },
  ],
};

export default function MentorWorkspace() {
  const [searchParams] = useSearchParams();
  const [activeMentee, setActiveMentee] = useState<ActiveMentee | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [inputMsg, setInputMsg] = useState("");
  const [search, setSearch] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const menteeId = searchParams.get("mentee");
    if (menteeId) {
      const mentee = ACTIVE_MENTEES.find(m => m.id === menteeId);
      if (mentee) {
        setActiveMentee(mentee);
        setShowMobileChat(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMentee, messages]);

  const filteredMentees = ACTIVE_MENTEES.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentMessages = activeMentee ? (messages[activeMentee.id] || []) : [];
  const canJoinCall = activeMentee?.paymentStatus === "paid_100";

  const MOCK_REPLIES = [
    "Dạ em hiểu rồi ạ. Cảm ơn mentor!",
    "Để em kiểm tra lại đoạn code này xem sao.",
    "Mentor giải thích thêm về phần này giúp em được không ạ?",
    "Tuyệt vời quá, em đã fix được lỗi rồi nhờ hướng dẫn của mentor!",
    "Dạ em rõ rồi. Em sẽ chú ý hơn ở phần này nhé.",
    "Em sẽ đọc thêm docs về phần này, có gì không hiểu em sẽ hỏi lại mentor nha."
  ];

  const triggerAutoReply = (menteeId: string, isFile = false) => {
    setTimeout(() => {
      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "mentee",
        content: isFile ? "Dạ em nhận được file rồi ạ. Để em xem nhé!" : MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)],
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => ({
        ...prev,
        [menteeId]: [...(prev[menteeId] || []), replyMsg],
      }));
    }, 1500); // 1.5s delay
  };

  const sendMessage = () => {
    if (!inputMsg.trim() || !activeMentee) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      role: "mentor",
      content: inputMsg.trim(),
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => ({
      ...prev,
      [activeMentee.id]: [...(prev[activeMentee.id] || []), newMsg],
    }));
    setInputMsg("");
    
    // Auto-reply mock
    triggerAutoReply(activeMentee.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMentee) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
    const newMsg: Message = {
      id: Date.now().toString(),
      role: "mentor",
      content: isImage ? "Sent an image" : "Sent a document",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      type: isImage ? "image" : "file",
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
    };
    setMessages(prev => ({
      ...prev,
      [activeMentee.id]: [...(prev[activeMentee.id] || []), newMsg],
    }));
    e.target.value = "";
    toast({ title: "Uploaded!", description: `${file.name} has been sent.` });

    // Auto-reply mock
    triggerAutoReply(activeMentee.id, true);
  };

  const handleJoinCall = () => {
    if (!canJoinCall) {
      toast({ title: "Cannot join yet", description: "Student hasnt fully paid 90%. Button will enable after payment is complete.", variant: "destructive" });
      return;
    }
    toast({ title: "Connecting...", description: "Video call is starting." });
    
    // Logic to switch to video call room in a new tab
    if (activeMentee) {
      window.open(`/mentor-room/${activeMentee.id}`, "_blank");
    }
  };

  const openChat = (mentee: ActiveMentee) => {
    setActiveMentee(mentee);
    setShowMobileChat(true);
  };

  const renderMenteeList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="font-bold text-slate-900 dark:text-white text-base mb-3">Active Mentees</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 border-slate-200 dark:border-slate-800 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredMentees.map(mentee => (
            <button
              key={mentee.id}
              onClick={() => openChat(mentee)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all mb-1",
                activeMentee?.id === mentee.id
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-slate-50 dark:bg-[#0b1120]"
              )}
            >
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{mentee.initials}</AvatarFallback>
                </Avatar>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white", mentee.online ? "bg-primary" : "bg-slate-300 dark:bg-slate-700")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{mentee.name}</p>
                  <span className="text-[11px] text-slate-400">{mentee.lastMessageTime}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{mentee.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-[9px] px-1.5 py-0 border-0", mentee.paymentStatus === "paid_100" ? "bg-primary/10 text-primary/90" : "bg-amber-100 text-amber-700 dark:text-amber-500")}>
                    {mentee.paymentStatus === "paid_100" ? " Paid in full" : "⏳ Pending 90% payment"}
                  </Badge>
                </div>
              </div>
              {mentee.unread > 0 && (
                <div className="w-5 h-5 bg-red-50 dark:bg-red-500/100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-white font-bold">{mentee.unread}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderChatArea = () => (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      {activeMentee ? (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileChat(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800 mr-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{activeMentee.initials}</AvatarFallback>
              </Avatar>
              <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", activeMentee.online ? "bg-primary" : "bg-slate-300 dark:bg-slate-700")} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{activeMentee.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{activeMentee.online ? "Active" : "Offline"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Join call button */}
            <Button
              size="sm"
              onClick={handleJoinCall}
              disabled={!canJoinCall}
              className={cn(
                "gap-2 text-xs",
                canJoinCall
                  ? "bg-primary hover:bg-primary/90 shadow-md animate-pulse"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              )}
            >
              <Video className="w-3.5 h-3.5" />
              {canJoinCall ? "Join Call" : "Pending Payment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Select a mentee to start chatting</p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-5 py-4">
        {!activeMentee ? (
          <div className="flex items-center justify-center h-full py-20 text-center">
            <div>
              <MessageCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="font-bold text-slate-600 dark:text-slate-400">Select a conversation</p>
              <p className="text-sm text-slate-400 mt-1">Select a mentee from the left list to begin.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {currentMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3", msg.role === 'mentor' ? "flex-row-reverse" : "")}
                >
                  <Avatar className="w-8 h-8 shrink-0 mt-auto mb-1">
                    {msg.role === 'mentor' ? (
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">ME</AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">{activeMentee.initials}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn("max-w-[75%] space-y-2", msg.role === 'mentor' ? "items-end text-right" : "items-start text-left")}>
                    <div className={cn(
                      "p-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm relative group",
                      msg.role === 'mentor' ? "bg-primary text-white rounded-tr-none" : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800"
                    )}>
                      {msg.type === "file" ? (
                        <div className="flex items-center gap-2">
                           <FileText className="w-5 h-5 opacity-80" />
                           <div className="text-left">
                             <p className="text-sm font-medium">{msg.fileName}</p>
                             <p className="text-[10px] opacity-70">{msg.fileSize}</p>
                           </div>
                        </div>
                      ) : msg.type === "image" ? (
                        <div className="flex items-center gap-2">
                           <ImageIcon className="w-5 h-5 opacity-80" />
                           <div className="text-left">
                             <p className="text-sm font-medium">{msg.fileName}</p>
                             <p className="text-[10px] opacity-70">{msg.fileSize}</p>
                           </div>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2 block">
                      {msg.time}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      {activeMentee && (
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-3 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full text-slate-400 hover:text-primary bg-slate-50 dark:bg-[#0b1120] relative shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4 pointer-events-none" />
            </Button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif" className="hidden" onChange={handleFileUpload} />
            <div className="flex-grow relative">
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-full pl-5 pr-12 py-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                placeholder={`Message ${activeMentee.name}...`}
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-slate-400 hover:text-primary">
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              className="h-12 w-12 rounded-full shadow-lg shrink-0"
              onClick={sendMessage}
              disabled={!inputMsg.trim()}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-130px)] lg:h-[calc(100vh-90px)]">
      <div className="h-full flex gap-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Sidebar - Mentee list */}
        <div className={cn(
          "w-80 border-r border-slate-100 dark:border-slate-800 flex-shrink-0",
          showMobileChat ? "hidden lg:flex lg:flex-col" : "flex flex-col w-full lg:w-80"
        )}>
          {renderMenteeList()}
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1",
          showMobileChat ? "flex flex-col" : "hidden lg:flex lg:flex-col"
        )}>
          {renderChatArea()}
        </div>
      </div>
    </div>
  );
}
