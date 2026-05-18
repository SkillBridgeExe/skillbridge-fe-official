import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, Hand, Mic, MicOff, VideoOff, Video, Phone, Maximize2, Minimize2, Edit3, Bookmark, BookmarkCheck, Link2, Plus, Trash2, ChevronRight, Sparkles, Clock, Target, Award, CheckCircle2, Circle, Send, Copy, Download, ArrowRight, HelpCircle, Flag, Zap, BookOpen, TrendingUp, MessageSquare, Star, Monitor, MonitorOff, X, ListTodo, Shield, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import gsap from "gsap";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ScheduledSession { id: string; date: string; time: string; duration: string; status: string; topic?: string; }
interface VideoModeProps {
  mentorName: string; activeVideoSession: ScheduledSession | null;
  videoMode: "calling" | "connected" | "ended";
  isMicOn: boolean; isCameraOn: boolean; isRecording: boolean; recordingTime: number;
  setIsMicOn: (b: boolean) => void; setIsCameraOn: (b: boolean) => void;
  setVideoMode: (v: "calling" | "connected" | "ended") => void;
  setIsRecording: (b: boolean) => void; onEndCall: () => void;
}
interface BookmarkItem { id: string; timestamp: string; label: string; seconds: number; }
interface Resource { id: string; title: string; url: string; type: "link" | "doc" | "code"; addedBy: "mentor" | "you"; }
interface QueuedQuestion { id: string; text: string; answered: boolean; priority: "high" | "normal"; }
interface NoteEntry { id: string; content: string; by: "ai" | "you"; time: string; }
// In-call banner (raise hand, reactions, mic muted etc.) — shown inside video area bottom-left like Google Meet
interface InCallBanner { id: string; emoji?: string; message: string; }
// Time warning — shown next to the timer top-left like Google Meet
interface TimeWarning { minutes: number; color: "amber" | "red"; }

// ─── Mock data ──────────────────────────────────────────────────────────────────
const mockSkillsData = [
  { subject: "React", score: 85, fullMark: 100 }, { subject: "Sys Design", score: 72, fullMark: 100 },
  { subject: "Communication", score: 90, fullMark: 100 }, { subject: "TypeScript", score: 80, fullMark: 100 },
  { subject: "Algorithms", score: 65, fullMark: 100 },
];
const INIT_NOTES: NoteEntry[] = [
  { id: "n1", content: "Discussed micro-frontend architecture — module federation approach recommended.", by: "ai", time: "10:02" },
  { id: "n2", content: "Review scaling bottlenecks in current DB schema before next session.", by: "ai", time: "10:08" },
];
const INIT_RESOURCES: Resource[] = [
  { id: "r1", title: "Module Federation Docs", url: "https://webpack.js.org/concepts/module-federation/", type: "link", addedBy: "mentor" },
  { id: "r2", title: "Redis Caching Patterns", url: "https://redis.io/docs/manual/patterns/", type: "doc", addedBy: "mentor" },
];
const INIT_QUESTIONS: QueuedQuestion[] = [
  { id: "q1", text: "When should I choose Redis over Memcached?", answered: false, priority: "high" },
  { id: "q2", text: "Best strategy for DB migration with zero downtime?", answered: false, priority: "normal" },
];
const REACTIONS = ['👍', '❤️', '😊', '🎉', '👏'];

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ─── In-call banners (bottom-left, inside video like Google Meet) ─────────────
function InCallBanners({ banners, onDismiss }: { banners: InCallBanner[]; onDismiss: (id: string) => void }) {
  return (
    <div className="absolute bottom-20 left-4 flex flex-col gap-2 z-40 pointer-events-none" style={{ maxWidth: 280 }}>
      <AnimatePresence>
        {banners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-3.5 py-2.5 rounded-2xl shadow-xl"
          >
            {b.emoji && <span className="text-xl shrink-0 leading-none">{b.emoji}</span>}
            <span className="text-white text-sm font-medium flex-1 leading-snug">{b.message}</span>
            <button onClick={() => onDismiss(b.id)} className="opacity-40 hover:opacity-80 transition-opacity shrink-0 ml-1">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Time warning badge (inline next to timer, Google Meet style) ─────────────
function TimeWarningBadge({ warning, onDismiss }: { warning: TimeWarning | null; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {warning && (
        <motion.div
          initial={{ opacity: 0, x: -12, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur",
            warning.color === "amber"
              ? "bg-amber-500/90 border-amber-400/50 text-white"
              : "bg-rose-600/90 border-rose-500/50 text-white"
          )}
        >
          <Clock className="w-3 h-3 shrink-0" />
          <span>{warning.minutes} min left</span>
          <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Permission modal ──────────────────────────────────────────────────────────
function PermissionModal({ onGrant, onDeny }: { onGrant: (mic: boolean, cam: boolean) => void; onDeny: () => void }) {
  const [micAllowed, setMicAllowed] = useState(true);
  const [camAllowed, setCamAllowed] = useState(true);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm mx-4"
      >
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-2">
            <Shield className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Allow device access</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">SkillBridge wants to use your camera and microphone for this video session.</p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { label: "Microphone", desc: micAllowed ? "Others can hear you" : "You'll be muted", allowed: micAllowed, toggle: () => setMicAllowed(!micAllowed), IconOn: Mic, IconOff: MicOff },
            { label: "Camera", desc: camAllowed ? "Others can see you" : "Camera off", allowed: camAllowed, toggle: () => setCamAllowed(!camAllowed), IconOn: Video, IconOff: VideoOff },
          ].map((item) => (
            <div
              key={item.label}
              onClick={item.toggle}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all select-none",
                item.allowed ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              )}
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.allowed ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600")}>
                {item.allowed ? <item.IconOn className="w-4 h-4 text-white" /> : <item.IconOff className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <div className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0", item.allowed ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600")}>
                <motion.div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" animate={{ left: item.allowed ? "calc(100% - 18px)" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl h-11 border-slate-200 dark:border-slate-700" onClick={onDeny}>Cancel</Button>
          <Button className="flex-1 rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={() => onGrant(micAllowed, camAllowed)}>
            <CheckCheck className="w-4 h-4" /> Allow
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Audio bars ────────────────────────────────────────────────────────────────
function AudioBars({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex gap-[2px] items-end h-4">
      {[4, 8, 6, 10, 5, 9, 4].map((h, i) => (
        <motion.div key={i} className="w-[3px] bg-primary/90 rounded-full"
          animate={{ height: [h, h * 1.8, h] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

// ─── Calling screen ─────────────────────────────────────────────────────────────
function CallingScreen({ mentorName, onConnect }: { mentorName: string; onConnect: () => void }) {
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ringRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(".ring-pulse", { scale: 1.8, opacity: 0, duration: 1.6, repeat: -1, stagger: 0.4, ease: "power2.out" });
      gsap.from(".avatar-calling", { scale: 0.7, opacity: 0, duration: 0.6, ease: "back.out(1.7)" });
    }, ringRef);
    const t = setTimeout(onConnect, 2600);
    return () => { ctx.revert(); clearTimeout(t); };
  }, [onConnect]);

  return (
    <div ref={ringRef} className="flex flex-col items-center justify-center flex-1 gap-8 bg-slate-900 h-full">
      <div className="relative flex items-center justify-center">
        {[1, 2, 3].map((i) => (<div key={i} className="ring-pulse absolute rounded-full border border-indigo-500/30" style={{ width: 80 + i * 56, height: 80 + i * 56 }} />))}
        <Avatar className="avatar-calling w-24 h-24 border-4 border-indigo-500/40 shadow-2xl">
          <AvatarImage src={`https://i.pravatar.cc/150?u=${mentorName.replace(" ", "")}`} />
          <AvatarFallback className="text-2xl font-bold bg-indigo-700 text-white">{mentorName[0]}</AvatarFallback>
        </Avatar>
      </div>
      <div className="text-center space-y-2">
        <p className="text-white/50 text-sm font-medium tracking-widest uppercase">Connecting to</p>
        <p className="text-white text-2xl font-bold">{mentorName}</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {[0, 0.2, 0.4].map((d, i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: d }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen share overlay ──────────────────────────────────────────────────────
function ScreenShareOverlay({ onStop }: { onStop: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 relative bg-[#1e1e2e] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-8 bg-[#181825] flex items-center gap-2 px-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <span className="text-[11px] text-slate-400 ml-2 font-mono">SkillBridge_Architecture.tsx — VSCode</span>
        </div>
        <div className="flex h-full pt-8">
          <div className="w-40 bg-[#181825] border-r border-slate-700/50 p-3 flex flex-col gap-1 text-[10px] text-slate-400 font-mono shrink-0">
            {["src", "  components", "    VideoMode.tsx", "    ChatMode.tsx", "  lib", "    utils.ts", "App.tsx"].map((f) => (
              <div key={f} className={cn("px-1 rounded", f.includes("VideoMode") && "bg-indigo-600/30 text-indigo-300")}>{f}</div>
            ))}
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] leading-6 overflow-hidden">
            <div className="text-slate-500">{"// VideoMode Component — Architecture session"}</div>
            <div><span className="text-indigo-400">import</span> <span className="text-primary">{"{ useState, useEffect }"}</span> <span className="text-indigo-400">from</span> <span className="text-amber-300">'react'</span></div>
            <div className="mt-2"><span className="text-purple-400">export default function</span> <span className="text-sky-300">VideoMode</span>{"() {"}</div>
            <div className="ml-4 text-slate-400">{"// Redis caching layer — mentioned in session"}</div>
            <div className="ml-4 bg-indigo-500/20 border-l-2 border-indigo-500 pl-2 rounded-r">
              <span className="text-indigo-400">const</span> [<span className="text-sky-300">isSharing</span>] = <span className="text-purple-400">useState</span>(<span className="text-amber-300">true</span>)
            </div>
            <div className="ml-4 mt-2 text-primary">{"//  Module federation approach confirmed"}</div>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ y: 60 }} animate={{ y: 0 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur border border-indigo-400/30 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-2xl z-50"
      >
        <motion.div className="w-2 h-2 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span className="text-white text-sm font-semibold">You are sharing your screen</span>
        <button onClick={onStop} className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors ml-1">Stop sharing</button>
      </motion.div>
      <div className="absolute top-12 right-3 w-36 aspect-video bg-slate-800 rounded-xl border-2 border-indigo-500/40 shadow-2xl overflow-hidden z-50">
        <Avatar className="w-full h-full rounded-none"><AvatarImage src="https://i.pravatar.cc/300?u=mentor" className="object-cover" /><AvatarFallback className="bg-slate-700 text-white text-lg rounded-none">M</AvatarFallback></Avatar>
        <div className="absolute bottom-1 left-1.5 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded-full font-semibold">Mentor</div>
      </div>
    </motion.div>
  );
}

// ─── Floating reaction ─────────────────────────────────────────────────────────
function FloatingReaction({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div className="absolute pointer-events-none z-50 text-4xl select-none" style={{ bottom: 80, left: "50%", x: "-50%" }}
      initial={{ bottom: 80, opacity: 1, scale: 0.5 }}
      animate={{ bottom: 280, opacity: 0, scale: 1.4 }}
      transition={{ duration: 2, ease: "easeOut" }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Notes tab ─────────────────────────────────────────────────────────────────
function NotesTab({ notes, setNotes }: { notes: NoteEntry[]; setNotes: (n: NoteEntry[]) => void }) {
  const [input, setInput] = useState("");
  const addNote = () => {
    if (!input.trim()) return;
    setNotes([...notes, { id: Date.now().toString(), content: input.trim(), by: "you", time: timeNow() }]);
    setInput("");
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <motion.div className="w-2 h-2 rounded-full bg-violet-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">AI Auto-capturing</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-slate-400 hover:text-slate-600"><Copy className="w-3 h-3" /> Copy all</Button>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <AnimatePresence initial={false}>
          {notes.map((note) => (
            <motion.div key={note.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}
              className={cn("mb-2 p-2.5 rounded-xl text-xs leading-relaxed border", note.by === "ai" ? "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40 text-violet-900 dark:text-violet-300" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300")}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn("font-semibold text-[10px] uppercase tracking-wider", note.by === "ai" ? "text-violet-500" : "text-slate-400")}>{note.by === "ai" ? "AI" : "You"}</span>
                <span className="text-[10px] text-slate-400">{note.time}</span>
              </div>
              {note.content}
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Add your own note..." className="flex-1 text-xs bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-violet-300 transition-colors placeholder:text-slate-400" />
        <Button size="icon" className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 shrink-0" onClick={addNote}><Send className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}

// ─── Questions tab ─────────────────────────────────────────────────────────────
function QuestionsTab({ questions, setQuestions }: { questions: QueuedQuestion[]; setQuestions: (q: QueuedQuestion[]) => void }) {
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState<"normal" | "high">("normal");
  const addQ = () => {
    if (!input.trim()) return;
    setQuestions([...questions, { id: Date.now().toString(), text: input.trim(), answered: false, priority }]);
    setInput("");
  };
  const toggle = (id: string) => setQuestions(questions.map((q) => q.id === id ? { ...q, answered: !q.answered } : q));
  const remove = (id: string) => setQuestions(questions.filter((q) => q.id !== id));
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <p className="text-[10px] text-slate-400">Queue questions so you never lose your train of thought.</p>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <AnimatePresence initial={false}>
          {questions.map((q) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.22 }}
              className={cn("mb-2 p-2.5 rounded-xl border text-xs flex items-start gap-2.5 group", q.answered ? "bg-slate-50 dark:bg-slate-900/50 border-slate-100 opacity-60" : q.priority === "high" ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800")}
            >
              <button onClick={() => toggle(q.id)} className="mt-0.5 shrink-0">
                {q.answered ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                {q.priority === "high" && !q.answered && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1"><Flag className="w-2.5 h-2.5" /> Priority</span>}
                <p className={cn("leading-relaxed text-slate-700 dark:text-slate-300", q.answered && "line-through text-slate-400")}>{q.text}</p>
              </div>
              <button onClick={() => remove(q.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-400 transition-colors" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {questions.length === 0 && <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2"><HelpCircle className="w-8 h-8 opacity-30" /><p className="text-xs text-center">No questions yet.</p></div>}
      </ScrollArea>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
        <div className="flex gap-1">
          <button onClick={() => setPriority("normal")} className={cn("text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors", priority === "normal" ? "bg-slate-200 dark:bg-slate-700 text-slate-700" : "text-slate-400 hover:text-slate-600")}>Normal</button>
          <button onClick={() => setPriority("high")} className={cn("text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors", priority === "high" ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:text-slate-600")}>Priority</button>
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQ()} placeholder="Type a question..." className="flex-1 text-xs bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-sky-300 transition-colors placeholder:text-slate-400" />
          <Button size="icon" className="w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 shrink-0" onClick={addQ}><Plus className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// ─── Resources tab ─────────────────────────────────────────────────────────────
function ResourcesTab({ resources, setResources }: { resources: Resource[]; setResources: (r: Resource[]) => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const add = () => {
    if (!url.trim() || !title.trim()) return;
    setResources([...resources, { id: Date.now().toString(), title: title.trim(), url: url.trim(), type: "link", addedBy: "you" }]);
    setUrl(""); setTitle("");
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0"><p className="text-[10px] text-slate-400">Linkss & docs shared during this session.</p></div>
      <ScrollArea className="flex-1 px-3 py-2">
        <AnimatePresence initial={false}>
          {resources.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-2.5 hover:border-slate-200 transition-colors">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{r.url}</p>
              </div>
              <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", r.addedBy === "mentor" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>{r.addedBy === "mentor" ? "Mentor" : "You"}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-1.5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full text-xs bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-1.5 outline-none border border-transparent focus:border-emerald-300 transition-colors placeholder:text-slate-400" />
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Paste URL..." className="flex-1 text-xs bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-1.5 outline-none border border-transparent focus:border-emerald-300 transition-colors placeholder:text-slate-400" />
          <Button size="icon" className="w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 shrink-0" onClick={add}><Plus className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bookmarks tab ─────────────────────────────────────────────────────────────
function BookmarksTab({ bookmarks, setBookmarks, callSeconds }: { bookmarks: BookmarkItem[]; setBookmarks: (b: BookmarkItem[]) => void; callSeconds: number }) {
  const [label, setLabel] = useState("");
  const addBookmark = () => {
    const lbl = label.trim() || `Moment at ${formatTime(callSeconds)}`;
    setBookmarks([...bookmarks, { id: Date.now().toString(), timestamp: formatTime(callSeconds), label: lbl, seconds: callSeconds }]);
    setLabel("");
  };
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0"><p className="text-[10px] text-slate-400">Pin key moments to rewatch in the recording.</p></div>
      <ScrollArea className="flex-1 px-3 py-2">
        <AnimatePresence initial={false}>
          {bookmarks.map((bm) => (
            <motion.div key={bm.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mb-2 p-2.5 rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/60 dark:bg-orange-950/10 flex items-center gap-2.5">
              <span className="text-[10px] font-mono font-bold text-orange-600 w-12 shrink-0">{bm.timestamp}</span>
              <div className="w-px h-5 bg-orange-200 shrink-0" />
              <p className="text-xs text-slate-700 dark:text-slate-300 flex-1">{bm.label}</p>
              <button onClick={() => setBookmarks(bookmarks.filter((b) => b.id !== bm.id))}><Trash2 className="w-3.5 h-3.5 text-slate-300 hover:text-rose-400 transition-colors" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
        {bookmarks.length === 0 && <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2"><Bookmark className="w-8 h-8 opacity-30" /><p className="text-xs text-center">No bookmarks yet.</p></div>}
      </ScrollArea>
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBookmark()} placeholder={`Label for ${formatTime(callSeconds)}...`} className="flex-1 text-xs bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-orange-300 transition-colors placeholder:text-slate-400" />
          <Button size="icon" onClick={addBookmark} className="w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 shrink-0"><BookmarkCheck className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

// ─── End screen ─────────────────────────────────────────────────────────────────
function EndedScreen({ mentorName, notes, bookmarks, questions, onBackToChat }: { mentorName: string; notes: NoteEntry[]; bookmarks: BookmarkItem[]; questions: QueuedQuestion[]; onBackToChat: () => void; }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".summary-hero", { scale: 0.85, opacity: 0, duration: 0.6, ease: "back.out(1.4)" });
      gsap.from(".summary-card", { y: 32, opacity: 0, duration: 0.55, stagger: 0.12, ease: "power3.out", delay: 0.2 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const answeredQs = questions.filter((q) => q.answered);
  const unansweredQs = questions.filter((q) => !q.answered);
  const nextPrepItems = ["Review Redis caching patterns (link shared by mentor)", "Implement module federation in a side project", "Prepare DB migration plan for zero-downtime deployment", "Read up on TypeScript generics — identified weak point"];
  const learningPath = [
    { label: "React Architecture", done: true }, { label: "System Design Basics", done: true },
    { label: "Database Optimization", done: false, current: true },
    { label: "Distributed Systems", done: false }, { label: "Leadership & Soft Skills", done: false },
  ];

  return (
    <motion.div ref={containerRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-slate-900 dark:from-slate-950 dark:to-slate-900 overflow-y-auto" style={{ minHeight: "100%" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="summary-hero text-center space-y-3">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-indigo-200"><Award className="w-8 h-8 text-white" /></div>
            <motion.div className="absolute -top-1 -right-1 w-5 h-5 bg-primary/90 rounded-full flex items-center justify-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 300 }}><CheckCircle2 className="w-3 h-3 text-white" /></motion.div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Session Complete</h2>
          <p className="text-slate-500 text-sm">45-minute session with <span className="font-semibold text-slate-700 dark:text-slate-300">{mentorName}</span></p>
          <div className="flex items-center justify-center gap-6 pt-2">
            {[{ icon: Clock, label: "Duration", value: "45 min" }, { icon: Bookmark, label: "Bookmarks", value: String(bookmarks.length) }, { icon: CheckCircle2, label: "Questions answered", value: `${answeredQs.length}/${questions.length}` }].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1">
                <stat.icon className="w-4 h-4 text-slate-400" />
                <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{stat.value}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="summary-card md:col-span-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800"><Sparkles className="w-4 h-4 text-violet-500" /><h3 className="font-semibold text-slate-900 dark:text-white text-sm">AI Session Summary</h3><Button variant="ghost" size="sm" className="ml-auto h-7 text-xs gap-1 text-slate-400"><Download className="w-3 h-3" /> Export</Button></div>
            <div className="p-5 space-y-4">
              <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-3.5 text-sm leading-relaxed space-y-2">
                {notes.map((n) => (<p key={n.id} className="flex items-start gap-2 text-violet-900 dark:text-violet-300"><span className="text-violet-400 mt-0.5">•</span>{n.content}</p>))}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3"><ListTodo className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Action Items</h4></div>
                <div className="space-y-2">
                  {["Implement module federation proof-of-concept", "Set up Redis caching layer for main feed", "Review DB indexing strategy"].map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-5 h-5 rounded-full border-2 border-emerald-300 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-bold text-primary">{i + 1}</span></div>
                      {item}
                    </motion.div>
                  ))}
                </div>
              </div>
              {unansweredQs.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 rounded-xl p-3.5">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5" /> {unansweredQs.length} question{unansweredQs.length > 1 ? "s" : ""} to follow up</p>
                  {unansweredQs.map((q) => (<p key={q.id} className="text-xs text-amber-800 flex items-start gap-1.5 mb-1"><ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />{q.text}</p>))}
                </div>
              )}
              {bookmarks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Bookmark className="w-4 h-4 text-orange-500" /><h4 className="text-sm font-semibold text-slate-800">Recording Bookmarks</h4></div>
                  {bookmarks.map((bm) => (<div key={bm.id} className="flex items-center gap-2.5 text-xs text-slate-600 mb-1"><span className="font-mono font-semibold text-orange-500 w-10 shrink-0">{bm.timestamp}</span><div className="w-px h-3 bg-slate-200" />{bm.label}</div>))}
                </div>
              )}
            </div>
          </div>

          <div className="summary-card bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100"><Target className="w-4 h-4 text-sky-500" /><h3 className="font-semibold text-slate-900 text-sm">Skills Covered</h3></div>
            <div className="flex-1 flex items-center justify-center p-4 min-h-[200px]">
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={mockSkillsData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Radar name="Student" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Top strengths today</p>
              {["Communication (90)", "React (85)", "TypeScript (80)"].map((s) => (<div key={s} className="flex items-center gap-2 text-xs text-slate-600"><Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />{s}</div>))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="summary-card bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100"><Zap className="w-4 h-4 text-amber-500" /><h3 className="font-semibold text-slate-900 text-sm">Next Session Prep</h3><span className="ml-auto text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">AI Generated</span></div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-500">Based on today's session, prepare these before your next meeting:</p>
              {nextPrepItems.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] font-bold text-amber-600">{i + 1}</span></div>
                  <p className="text-xs text-slate-700 leading-relaxed">{item}</p>
                </motion.div>
              ))}
              <Button className="w-full h-8 text-xs mt-1 gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl"><MessageSquare className="w-3.5 h-3.5" /> Schedule next session</Button>
            </div>
          </div>

          <div className="summary-card bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100"><TrendingUp className="w-4 h-4 text-primary" /><h3 className="font-semibold text-slate-900 text-sm">Learning Path Update</h3></div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs mb-1"><span className="text-slate-500">Overall progress</span><span className="font-bold text-primary">40%</span></div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3"><motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: "40%" }} transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }} /></div>
              <div className="space-y-2.5">
                {learningPath.map((step, i) => (
                  <motion.div key={step.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.08 }} className={cn("flex items-center gap-3 p-2.5 rounded-xl text-xs", step.current ? "bg-primary/5 border border-primary/20" : "opacity-60")}>
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", step.done ? "bg-primary" : step.current ? "bg-primary" : "bg-slate-200")}>
                      {step.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : step.current ? <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} /> : <Circle className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <span className={cn("font-medium", step.current ? "text-primary/90" : "text-slate-600")}>{step.label}</span>
                    {step.current && <span className="ml-auto text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">In progress</span>}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-sky-50 border border-sky-100">
                <p className="text-[10px] font-semibold text-sky-600 mb-1 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Recommended next</p>
                <p className="text-xs text-slate-600">Deep dive into CAP theorem & distributed consensus before tackling Distributed Systems.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 pb-6">
          <Button variant="outline" className="rounded-xl px-6 gap-2" onClick={onBackToChat}><MessageSquare className="w-4 h-4" /> Continue in Chat</Button>
          <Button className="rounded-xl px-6 gap-2 bg-indigo-600 hover:bg-indigo-700"><ArrowRight className="w-4 h-4" /> Schedule Next Session</Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function VideoMode({ mentorName, activeVideoSession: _activeVideoSession, videoMode, isMicOn, isCameraOn, isRecording, recordingTime: _recordingTime, setIsMicOn, setIsCameraOn, setVideoMode, setIsRecording, onEndCall }: VideoModeProps) {
  // ── Permission gate (shown before calling) ──
  const [permissionAsked, setPermissionAsked] = useState(false);

  // ── Video UI state ──
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── New controls state ──
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string }[]>([]);
  // FIX: separate mentor mic from user mic
  const [mentorMicOn] = useState(true);

  // ── In-call notifications (inside video area) ──
  const [banners, setBanners] = useState<InCallBanner[]>([]);
  const [timeWarning, setTimeWarning] = useState<TimeWarning | null>(null);
  const warnedAt = useRef<Set<number>>(new Set());

  // ── Sidebar state ──
  const [notes, setNotes] = useState<NoteEntry[]>(INIT_NOTES);
  const [questions, setQuestions] = useState<QueuedQuestion[]>(INIT_QUESTIONS);
  const [resources, setResources] = useState<Resource[]>(INIT_RESOURCES);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const videoAreaRef = useRef<HTMLDivElement>(null);

  const addBanner = useCallback((message: string, emoji?: string, duration = 3500) => {
    const id = Date.now().toString() + Math.random();
    setBanners((p) => [...p, { id, message, emoji }]);
    setTimeout(() => setBanners((p) => p.filter((b) => b.id !== id)), duration);
  }, []);

  // ── Permission grant ──
  const handleGrantPermission = (mic: boolean, cam: boolean) => {
    setPermissionAsked(true);
    setIsMicOn(mic);
    setIsCameraOn(cam);
  };
  const handleDenyPermission = () => {
    setPermissionAsked(true);
    setIsMicOn(false);
    setIsCameraOn(false);
  };

  // ── Connected timer + AI notes + time warnings ──
  useEffect(() => {
    if (videoMode !== "connected") return;
    setIsRecording(true);
    const timer = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    const n1 = setTimeout(() => setNotes((p) => [...p, { id: "ai-1", content: "Mentor suggested Redis caching for main feed — target 50ms response time.", by: "ai", time: timeNow() }]), 7000);
    const n2 = setTimeout(() => setNotes((p) => [...p, { id: "ai-2", content: "Key decision: migrate to TypeORM for better type safety.", by: "ai", time: timeNow() }]), 15000);
    // Simulate mentor raising hand
    const mh = setTimeout(() => addBanner("Sarah Connor raised their hand", "", 5000), 12000);
    return () => { clearInterval(timer); clearTimeout(n1); clearTimeout(n2); clearTimeout(mh); };
  }, [videoMode, setIsRecording, addBanner]);

  // ── Time warnings inline next to timer ──
  useEffect(() => {
    if (videoMode !== "connected") return;
    if (callSeconds === 10 && !warnedAt.current.has(10)) {
      warnedAt.current.add(10);
      setTimeWarning({ minutes: 15, color: "amber" });
    }
    if (callSeconds === 20 && !warnedAt.current.has(20)) {
      warnedAt.current.add(20);
      setTimeWarning({ minutes: 10, color: "amber" });
    }
    if (callSeconds === 30 && !warnedAt.current.has(30)) {
      warnedAt.current.add(30);
      setTimeWarning({ minutes: 5, color: "red" });
    }
  }, [callSeconds, videoMode]);

  
  useEffect(() => {
    if (videoMode !== "connected") return;
    const ctx = gsap.context(() => {
      if (sidebarRef.current) gsap.from(sidebarRef.current, { x: 32, opacity: 0, duration: 0.5, ease: "power3.out", delay: 0.15 });
      if (videoAreaRef.current) gsap.from(videoAreaRef.current, { scale: 0.97, opacity: 0, duration: 0.45, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, [videoMode]);

  // ── Controls auto-hide ──
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);
  useEffect(() => {
    if (videoMode !== "connected") return;
    resetControlsTimer();
    return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
  }, [videoMode, resetControlsTimer]);

  // ── Control handlers with in-call feedback ──
  const handleToggleMic = () => {
    const next = !isMicOn;
    setIsMicOn(next);
    // addBanner(next ? "Microphone on" : "You are now muted", "", 2000);
  };
  const handleToggleCam = () => {
    const next = !isCameraOn;
    setIsCameraOn(next);
    // addBanner(next ? "Camera on" : "Camera off", "", 2000);
  };
  const handleShareScreen = () => {
    const next = !isScreenSharing;
    setIsScreenSharing(next);
    // addBanner(next ? "You are now sharing your screen" : "Screen sharing stopped","" , 3000);
  };
  const handleRaiseHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    // addBanner(next ? "Hand raised — mentor has been notified" : "Hand lowered", "", 3000);
  };
  const fireReaction = (emoji: string) => {
    const id = Date.now().toString();
    setActiveReactions((p) => [...p, { id, emoji }]);
    setShowReactionPicker(false);
  };
  const handleEndCall = () => {
    addBanner("Ending call...", "", 1200);
    setTimeout(() => setVideoMode("ended"), 1200);
  };

  // ─── RENDER: Permission modal ──────────────────────────────────────────────
  if (!permissionAsked) {
    return (
      <>
        <PermissionModal onGrant={handleGrantPermission} onDeny={handleDenyPermission} />
        <div className="w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center" style={{ height: "70vh", minHeight: 480 }}>
          <div className="text-slate-600 text-sm animate-pulse">Waiting for device permissions...</div>
        </div>
      </>
    );
  }

  // ─── RENDER: Ended ─────────────────────────────────────────────────────────
  if (videoMode === "ended") {
    return <EndedScreen mentorName={mentorName} notes={notes} bookmarks={bookmarks} questions={questions} onBackToChat={onEndCall} />;
  }

  // ─── RENDER: Calling ───────────────────────────────────────────────────────
  if (videoMode === "calling") {
    return (
      <div className="w-full rounded-2xl overflow-hidden" style={{ height: "70vh", minHeight: 480 }}>
        <CallingScreen mentorName={mentorName} onConnect={() => setVideoMode("connected")} />
      </div>
    );
  }

  // ─── RENDER: Connected ─────────────────────────────────────────────────────
  return (
    <div
      className={cn("flex transition-all duration-300", isFullscreen ? "fixed inset-0 z-50 bg-black" : "w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl")}
      style={!isFullscreen ? { height: "72vh", minHeight: 520 } : undefined}
      onMouseMove={resetControlsTimer}
    >
      {/* ── VIDEO AREA ── */}
      <div ref={videoAreaRef} className={cn("relative bg-slate-950 flex flex-col overflow-hidden", isFullscreen ? "flex-1" : "flex-[7]")}>

        {/* Screen share overlay */}
        <AnimatePresence>
          {isScreenSharing && <ScreenShareOverlay onStop={handleShareScreen} />}
        </AnimatePresence>

        {/* Mentor video */}
        {!isScreenSharing && (
          <>
            <div className="absolute inset-0 bg-slate-900">
              <img src={`https://i.pravatar.cc/800?u=${mentorName.replace(" ", "")}`} alt={mentorName} className="w-full h-full object-cover opacity-40 blur-sm scale-105" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={`https://i.pravatar.cc/300?u=${mentorName.replace(" ", "")}`} />
                  <AvatarFallback className="text-3xl font-bold bg-indigo-800 text-white">{mentorName[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                  <AudioBars active={mentorMicOn} />
                  {!mentorMicOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              </div>
              <div className="text-center"><p className="text-white font-semibold">{mentorName}</p><p className="text-white/40 text-xs">Mentor</p></div>
            </div>
          </>
        )}

        {/* ── STATUS BAR (top-left) — timer + REC + time warning badge inline ── */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Recording dot + time */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
              <motion.div className="w-2 h-2 rounded-full bg-rose-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              <span className="text-white text-xs font-mono font-semibold">{formatTime(callSeconds)}</span>
              {isRecording && <span className="text-[10px] text-rose-400 font-bold uppercase tracking-widest ml-0.5">REC</span>}
            </div>
            {/* Time warning — inline next to timer like Google Meet */}
            <TimeWarningBadge warning={timeWarning} onDismiss={() => setTimeWarning(null)} />
            {/* Screen sharing badge */}
            {isScreenSharing && (
              <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 rounded-full flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Sharing
              </span>
            )}
            {/* Hand raised indicator */}
            {isHandRaised && (
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.9, repeat: Infinity }} className="text-base leading-none"></motion.span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Self PiP */}
        {!isScreenSharing && (
          <motion.div className="absolute bottom-20 right-4 w-28 aspect-[3/4] bg-slate-800 rounded-xl border-2 border-slate-700 shadow-2xl overflow-hidden z-20" whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }}>
            <div className="h-full flex items-center justify-center bg-slate-900 relative">
              {isCameraOn ? (
                <Avatar className="w-full h-full rounded-none"><AvatarImage className="object-cover" src="https://i.pravatar.cc/150?img=12" /><AvatarFallback>ME</AvatarFallback></Avatar>
              ) : (
                <div className="flex flex-col items-center gap-2"><VideoOff className="w-6 h-6 text-slate-500" /><span className="text-[9px] text-slate-500">Camera off</span></div>
              )}
              {isMicOn
                ? <div className="absolute bottom-2 left-1/2 -translate-x-1/2"><AudioBars active /></div>
                : <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-rose-500/80 rounded-full p-1"><MicOff className="w-2.5 h-2.5 text-white" /></div>
              }
            </div>
            <div className="bg-slate-900/90 py-1 text-[9px] font-bold text-slate-300 uppercase tracking-wider text-center border-t border-slate-700">You</div>
          </motion.div>
        )}

        {/* ── IN-CALL BANNERS (bottom-left inside video, like Google Meet) ── */}
        <InCallBanners banners={banners} onDismiss={(id) => setBanners((p) => p.filter((b) => b.id !== id))} />

        {/* Floating reactions */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
          {activeReactions.map((r) => (
            <FloatingReaction key={r.id} emoji={r.emoji} onDone={() => setActiveReactions((p) => p.filter((x) => x.id !== r.id))} />
          ))}
        </div>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactionPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-white/10 px-4 py-3 rounded-2xl shadow-2xl z-40 flex gap-3"
            >
              {REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => fireReaction(emoji)} className="text-3xl hover:scale-125 transition-transform active:scale-90 select-none">{emoji}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CONTROLS BAR — centered, bigger icons ── */}
        <AnimatePresence>
          {(controlsVisible || !isFullscreen) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-0 right-0 flex justify-center z-30"
            >
              <div className="bg-slate-900/92 backdrop-blur-xl border border-white/10 px-4 py-2.5 flex items-center gap-2 rounded-2xl shadow-2xl">
                {/* Mic */}
                <ControlBtn active={isMicOn} activeIcon={<Mic className="w-5 h-5" />} inactiveIcon={<MicOff className="w-5 h-5" />} label={isMicOn ? "Mute" : "Unmute"} onClick={handleToggleMic} inactiveClass="bg-rose-500 hover:bg-rose-600" />
                {/* Camera */}
                <ControlBtn active={isCameraOn} activeIcon={<Video className="w-5 h-5" />} inactiveIcon={<VideoOff className="w-5 h-5" />} label={isCameraOn ? "Camera" : "No cam"} onClick={handleToggleCam} inactiveClass="bg-rose-500 hover:bg-rose-600" />

                <div className="w-px h-9 bg-white/10 mx-1" />

                {/* Screen share */}
                <ControlBtn active={!isScreenSharing} activeIcon={<Monitor className="w-5 h-5" />} inactiveIcon={<MonitorOff className="w-5 h-5" />} label={isScreenSharing ? "Stop" : "Share"} onClick={handleShareScreen} inactiveClass="bg-indigo-600 hover:bg-indigo-700" activeClass="hover:bg-white/10 text-white/70 hover:text-white" />
                {/* Raise hand */}
                <ControlBtn active={!isHandRaised} activeIcon={<Hand className="w-5 h-5" />} inactiveIcon={<Hand className="w-5 h-5" />} label={isHandRaised ? "Lower" : "Hand"} onClick={handleRaiseHand} inactiveClass="bg-amber-500 hover:bg-amber-600" activeClass="hover:bg-white/10 text-white/70 hover:text-white" badge={isHandRaised} />
                {/* Reactions */}
                <ControlBtn active={!showReactionPicker} activeIcon={<Smile className="w-5 h-5" />} inactiveIcon={<Smile className="w-5 h-5" />} label="React" onClick={() => setShowReactionPicker(!showReactionPicker)} inactiveClass="bg-white/20" activeClass="hover:bg-white/10 text-white/70 hover:text-white" />

                <div className="w-px h-9 bg-white/10 mx-1" />

                {/* End call */}
                <div className="flex flex-col items-center gap-0.5">
                  <Button variant="destructive" size="icon" onClick={handleEndCall} className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 shadow-lg" title="End call">
                    <Phone className="w-5 h-5 fill-current" style={{ transform: "rotate(135deg)" }} />
                  </Button>
                  <span className="text-[9px] text-rose-400 font-medium">End</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SIDEBAR ── */}
      {!isFullscreen && (
        <div ref={sidebarRef} className="flex-[3] flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 overflow-hidden min-w-0">
          <Tabs defaultValue="notes" className="flex flex-col h-full">
            <div className="border-b border-slate-100 dark:border-slate-800 px-2 pt-2 pb-0 shrink-0">
              <TabsList className="grid w-full grid-cols-4 bg-transparent gap-0 h-auto p-0">
                {[
                  { value: "notes", icon: Edit3, label: "Notes", color: "text-violet-500" },
                  { value: "questions", icon: HelpCircle, label: "Q&A", color: "text-sky-500" },
                  { value: "resources", icon: Link2, label: "Linkss", color: "text-primary" },
                  { value: "bookmarks", icon: Bookmark, label: "Marks", color: "text-orange-500" },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}
                    className={cn("flex flex-col items-center gap-1 py-2 px-1 text-[10px] font-semibold rounded-t-lg border-b-2 border-transparent data-[state=active]:border-current data-[state=active]:bg-transparent data-[state=inactive]:opacity-40 transition-all", tab.color)}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex-1 overflow-hidden">
              <TabsContent value="notes" className="h-full m-0 data-[state=active]:flex flex-col outline-none"><NotesTab notes={notes} setNotes={setNotes} /></TabsContent>
              <TabsContent value="questions" className="h-full m-0 data-[state=active]:flex flex-col outline-none"><QuestionsTab questions={questions} setQuestions={setQuestions} /></TabsContent>
              <TabsContent value="resources" className="h-full m-0 data-[state=active]:flex flex-col outline-none"><ResourcesTab resources={resources} setResources={setResources} /></TabsContent>
              <TabsContent value="bookmarks" className="h-full m-0 data-[state=active]:flex flex-col outline-none"><BookmarksTab bookmarks={bookmarks} setBookmarks={setBookmarks} callSeconds={callSeconds} /></TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// ─── Control button helper ───────────────────────────────────────────────────
function ControlBtn({ active, activeIcon, inactiveIcon, label, onClick, inactiveClass = "", activeClass = "hover:bg-white/10 text-white", badge }: {
  active: boolean; activeIcon: React.ReactNode; inactiveIcon: React.ReactNode; label: string;
  onClick: () => void; inactiveClass?: string; activeClass?: string; highlight?: boolean; badge?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Button variant="ghost" size="icon" onClick={onClick}
        className={cn("w-12 h-12 rounded-full transition-all relative", active ? activeClass : cn("text-white", inactiveClass))}
      >
        {active ? activeIcon : inactiveIcon}
        {badge && (
          <motion.div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-300 rounded-full border-2 border-slate-900" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
        )}
      </Button>
      <span className="text-[9px] text-white/40 font-medium">{label}</span>
    </div>
  );
}
