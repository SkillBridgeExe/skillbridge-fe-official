import { useEffect, useMemo, useRef, useState } from "react";
import BusinessLayout from "./BusinessLayout";
import {
  Bot,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Star,
  Trash2,
  Users,
  X,
  XCircle,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Video,
  TrendingUp,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  ChevronRight,
  Download,
  SkipForward,
} from "lucide-react";

type Status = "pending" | "approved" | "screening" | "completed" | "rejected";

interface VideoSegment {
  questionIndex: number;
  question: string;
  startTime: number; // seconds
  duration: number;  // seconds
  emotion: "confident" | "nervous" | "neutral" | "hesitant";
  highlight?: string; // key moment note
}

interface SoftSkillScore {
  skill: string;
  score: number;
  note: string;
}

interface Applicant {
  id: string;
  name: string;
  avatar: string;
  role: string;
  score: number;
  appliedAt: string;
  status: Status;
  cvUrl: string;
  skills: string[];
  gpa: number;
  screeningScore?: number;
  screeningFeedback?: string;
  videoUrl?: string;
  videoDuration?: number; // seconds
  videoSegments?: VideoSegment[];
  softSkills?: SoftSkillScore[];
}

const MOCK_APPLICANTS: Applicant[] = [
  { id: "1", name: "Nguyen Minh Anh", avatar: "A", role: "Frontend Developer", score: 94, appliedAt: "2026-03-17T10:30:00", status: "pending", cvUrl: "#", skills: ["React", "TypeScript", "CSS"], gpa: 3.9 },
  { id: "2", name: "Tran Thi Bao", avatar: "B", role: "Data Analyst", score: 88, appliedAt: "2026-03-17T08:00:00", status: "screening", cvUrl: "#", skills: ["SQL", "Python", "BI"], gpa: 3.7 },
  { id: "3", name: "Le Hoang Nam", avatar: "N", role: "Frontend Developer", score: 82, appliedAt: "2026-03-16T15:00:00", status: "approved", cvUrl: "#", skills: ["Vue", "JS", "SCSS"], gpa: 3.5 },
  { id: "4", name: "Pham Khanh Linh", avatar: "L", role: "Product Manager", score: 79, appliedAt: "2026-03-16T11:00:00", status: "completed", cvUrl: "#", skills: ["Agile", "Analytics", "Figma"], gpa: 3.6, screeningScore: 82, screeningFeedback: "Candidate shows strong product thinking and clear communication.",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoDuration: 187,
    videoSegments: [
      { questionIndex: 0, question: "Describe a project you are most proud of and why.", startTime: 0, duration: 58, emotion: "confident", highlight: "Spoke clearly about measurable impact" },
      { questionIndex: 1, question: "How do you handle conflict in a team setting?", startTime: 62, duration: 65, emotion: "neutral", highlight: "Good framework, lacked specific example" },
      { questionIndex: 2, question: "What are your career goals in the next three years?", startTime: 131, duration: 56, emotion: "confident", highlight: "Well-structured answer, showed ambition" },
    ],
    softSkills: [
      { skill: "Communication", score: 88, note: "Speaks clearly and uses structured responses" },
      { skill: "Confidence", score: 84, note: "Maintains eye contact, minimal filler words" },
      { skill: "Critical Thinking", score: 80, note: "Provides logical reasoning with examples" },
      { skill: "Adaptability", score: 74, note: "Answers shift when probed — shows flexibility" },
      { skill: "Professionalism", score: 90, note: "Attire, posture, and tone are excellent" },
    ],
  },
  { id: "9", name: "Doan Gia Huy", avatar: "H", role: "QA Engineer", score: 80, appliedAt: "2026-03-14T09:20:00", status: "completed", cvUrl: "#", skills: ["Cypress", "Playwright", "API Testing"], gpa: 3.5, screeningScore: 78, screeningFeedback: "Solid testing workflow and practical communication.",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    videoDuration: 163,
    videoSegments: [
      { questionIndex: 0, question: "Describe a project you are most proud of and why.", startTime: 0, duration: 52, emotion: "nervous", highlight: "Started hesitant, improved mid-way" },
      { questionIndex: 1, question: "How do you handle conflict in a team setting?", startTime: 56, duration: 60, emotion: "neutral" },
      { questionIndex: 2, question: "What are your career goals in the next three years?", startTime: 120, duration: 43, emotion: "confident", highlight: "Concise and realistic goals" },
    ],
    softSkills: [
      { skill: "Communication", score: 76, note: "Some hesitations but generally clear" },
      { skill: "Confidence", score: 70, note: "Slightly nervous at start, settled later" },
      { skill: "Critical Thinking", score: 82, note: "Shows strong analytical mindset" },
      { skill: "Adaptability", score: 78, note: "Responds well to follow-up questions" },
      { skill: "Professionalism", score: 84, note: "Good presentation and composed demeanor" },
    ],
  },
  { id: "6", name: "Vu Thi Nga", avatar: "N", role: "Data Analyst", score: 86, appliedAt: "2026-03-15T14:00:00", status: "pending", cvUrl: "#", skills: ["Python", "ML", "Statistics"], gpa: 3.8 },
  { id: "7", name: "Bui Quang Dat", avatar: "D", role: "Backend Developer", score: 83, appliedAt: "2026-03-15T12:00:00", status: "pending", cvUrl: "#", skills: ["Node.js", "Postgres", "Docker"], gpa: 3.4 },
  { id: "8", name: "Trinh Minh Chau", avatar: "C", role: "UI Designer", score: 84, appliedAt: "2026-03-14T16:00:00", status: "approved", cvUrl: "#", skills: ["Figma", "Design Systems", "UX"], gpa: 3.6 },
  { id: "5", name: "Hoang Van Duc", avatar: "D", role: "Frontend Developer", score: 75, appliedAt: "2026-03-15T09:00:00", status: "rejected", cvUrl: "#", skills: ["HTML", "CSS", "jQuery"], gpa: 3.2 },
  { id: "10", name: "Pham Ngoc Linh", avatar: "L", role: "Data Analyst", score: 90, appliedAt: "2026-03-13T08:40:00", status: "screening", cvUrl: "#", skills: ["Python", "SQL", "Power BI"], gpa: 3.8 },
  { id: "11", name: "Mai Dinh Tuan", avatar: "T", role: "Mobile Developer", score: 79, appliedAt: "2026-03-12T13:00:00", status: "rejected", cvUrl: "#", skills: ["Kotlin", "Android", "Firebase"], gpa: 3.3 },
  { id: "12", name: "Tran Bao Anh", avatar: "A", role: "Business Analyst", score: 87, appliedAt: "2026-03-11T11:20:00", status: "pending", cvUrl: "#", skills: ["Research", "Data Modeling", "Presentation"], gpa: 3.7 },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; tile: string }> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    tile: "bg-amber-50 border-amber-200 text-amber-700",
  },
  approved: {
    label: "Approved",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    tile: "bg-sky-50 border-sky-200 text-sky-700",
  },
  screening: {
    label: "AI Screening",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    tile: "bg-violet-50 border-violet-200 text-violet-700",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    tile: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    tile: "bg-red-50 border-red-200 text-red-700",
  },
};

const AVATAR_GRADIENTS = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
] as const;

const PAGE_SIZE = 10;

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (value: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold ${
                p === page ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

interface ScreeningModalProps {
  applicant: Applicant;
  onClose: () => void;
  onSend: (applicantId: string, questions: string[]) => void;
}

function ScreeningModal({ applicant, onClose, onSend }: ScreeningModalProps) {
  const [questions, setQuestions] = useState([
    "Describe a project you are most proud of and why.",
    "How do you handle conflict in a team setting?",
    "What are your career goals in the next three years?",
  ]);
  const [newQ, setNewQ] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const addQ = () => {
    if (newQ.trim()) {
      setQuestions([...questions, newQ.trim()]);
      setNewQ("");
    }
  };

  const removeQ = (index: number) => setQuestions(questions.filter((_, idx) => idx !== index));

  const handleSend = async () => {
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      onSend(applicant.id, questions);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Bot size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AI Screening Questions</h3>
              <p className="text-xs text-slate-500">Send to {applicant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
            <p className="text-xs text-violet-700">
              AI will run the interview with these prompts and return a scored report.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-700 mb-2">Question List ({questions.length})</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {questions.map((question, index) => (
                <div key={index} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2.5 group">
                  <span className="text-xs text-sky-600 font-bold mt-0.5 flex-shrink-0">Q{index + 1}</span>
                  <p className="flex-1 text-xs text-slate-700 leading-relaxed">{question}</p>
                  <button
                    onClick={() => removeQ(index)}
                    className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a new screening question..."
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQ()}
              className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-50"
            />
            <button
              onClick={addQ}
              className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || sent}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              sent
                ? "bg-emerald-500 text-white"
                : sending
                ? "bg-violet-400 text-white"
                : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
            }`}
          >
            {sent ? (
              <><CheckCircle size={16} /> Sent successfully</>
            ) : sending ? (
              <><Loader2 size={16} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={16} /> Send AI Screening</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ResultModalProps {
  applicant: Applicant;
  onClose: () => void;
}

const EMOTION_CONFIG = {
  confident: { label: "Confident", icon: Smile, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  neutral:   { label: "Neutral",   icon: Meh,   color: "text-sky-600",     bg: "bg-sky-50 border-sky-200" },
  nervous:   { label: "Nervous",   icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  hesitant:  { label: "Hesitant", icon: Frown,  color: "text-orange-600",  bg: "bg-orange-50 border-orange-200" },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ResultModal({ applicant, onClose }: ResultModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(applicant.videoDuration || 0);
  const [activeTab, setActiveTab] = useState<"overview" | "video" | "softskills">("overview");
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const seekTo = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const jumpToSegment = (seg: VideoSegment, idx: number) => {
    seekTo(seg.startTime);
    setActiveSegment(idx);
    setActiveTab("video");
    if (videoRef.current) { videoRef.current.play(); setPlaying(true); }
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const overallSoftScore = applicant.softSkills
    ? Math.round(applicant.softSkills.reduce((sum, s) => sum + s.score, 0) / applicant.softSkills.length)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 680, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {applicant.avatar}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{applicant.name}</h3>
              <p className="text-xs text-slate-500">{applicant.role} · AI Interview Result</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex border-b border-slate-100 px-5 flex-shrink-0">
          {[
            { id: "overview",   label: "Overview" },
            { id: "video",      label: "Interview Recording" },
            { id: "softskills", label: "Soft Skills" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ OVERVIEW TAB ══ */}
          {activeTab === "overview" && (
            <div className="p-5 space-y-4">
              {/* Score cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-black text-emerald-600">{applicant.screeningScore}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">AI Score</p>
                  <p className="text-[11px] text-slate-400">/100</p>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-center">
                  <div className="flex justify-center gap-0.5 mt-1 mb-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= Math.round((applicant.screeningScore || 0) / 20) ? "text-yellow-400 fill-yellow-400" : "text-slate-200"} />
                    ))}
                  </div>
                  <p className="text-xs text-sky-700 font-semibold">Rating</p>
                  <p className="text-[11px] text-slate-500">
                    {(applicant.screeningScore || 0) >= 80 ? "Excellent" : (applicant.screeningScore || 0) >= 60 ? "Good" : "Needs review"}
                  </p>
                </div>
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5 text-center">
                  <p className="text-2xl font-black text-violet-600">{overallSoftScore}</p>
                  <p className="text-xs text-violet-700 font-semibold mt-0.5">Soft Skills</p>
                  <p className="text-[11px] text-slate-400">/100</p>
                </div>
              </div>

              {/* AI Feedback */}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-slate-400" /> AI Feedback
                </p>
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs text-slate-600 leading-relaxed">{applicant.screeningFeedback}</p>
                </div>
              </div>

              {/* Interview segments summary */}
              {applicant.videoSegments && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Video size={12} className="text-slate-400" /> Interview Segments
                    <span className="ml-auto text-[11px] text-slate-400 font-normal">Click to jump to recording</span>
                  </p>
                  <div className="space-y-2">
                    {applicant.videoSegments.map((seg, i) => {
                      const em = EMOTION_CONFIG[seg.emotion];
                      const EmIcon = em.icon;
                      return (
                        <div
                          key={i}
                          onClick={() => jumpToSegment(seg, i)}
                          className="flex items-start gap-3 bg-slate-50 hover:bg-sky-50 border border-transparent hover:border-sky-200 rounded-xl p-3 cursor-pointer transition-all group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 group-hover:border-sky-300">
                            Q{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-1">{seg.question}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-400">{formatTime(seg.startTime)} – {formatTime(seg.startTime + seg.duration)}</span>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${em.bg} ${em.color}`}>
                                <EmIcon size={10} /> {em.label}
                              </span>
                            </div>
                            {seg.highlight && (
                              <p className="text-[11px] text-sky-600 mt-1 flex items-center gap-1">
                                <ChevronRight size={10} />{seg.highlight}
                              </p>
                            )}
                          </div>
                          <SkipForward size={13} className="text-slate-300 group-hover:text-sky-500 flex-shrink-0 mt-1 transition-colors" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button className="flex-1 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                  <Download size={13} /> Save Report
                </button>
                <button className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                  Contact Candidate
                </button>
              </div>
            </div>
          )}

          {/* ══ VIDEO TAB ══ */}
          {activeTab === "video" && (
            <div className="p-5 space-y-4">
              {applicant.videoUrl ? (
                <>
                  {/* Video Player */}
                  <div className="rounded-2xl overflow-hidden bg-slate-900 relative group">
                    <video
                      ref={videoRef}
                      src={applicant.videoUrl}
                      className="w-full aspect-video object-cover"
                      onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                      onLoadedMetadata={() => setDuration(videoRef.current?.duration || applicant.videoDuration || 0)}
                      onEnded={() => setPlaying(false)}
                    />

                    {/* Segment marker overlay on timeline */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}>

                      {/* Progress bar with segment markers */}
                      <div className="relative mb-2">
                        {/* Clickable track */}
                        <div
                          className="h-1.5 bg-white/20 rounded-full cursor-pointer relative overflow-hidden"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            seekTo(pct * duration);
                          }}
                        >
                          <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                        </div>

                        {/* Segment markers */}
                        {applicant.videoSegments?.map((seg, i) => (
                          <button
                            key={i}
                            title={`Q${i + 1}: ${seg.question}`}
                            onClick={() => jumpToSegment(seg, i)}
                            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white transition-transform hover:scale-125 ${
                              activeSegment === i ? "scale-125 ring-2 ring-white/60" : ""
                            } ${
                              seg.emotion === "confident" ? "bg-emerald-400" :
                              seg.emotion === "nervous"   ? "bg-amber-400" :
                              seg.emotion === "hesitant"  ? "bg-orange-400" : "bg-sky-400"
                            }`}
                            style={{ left: `${(seg.startTime / duration) * 100}%` }}
                          />
                        ))}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="text-white hover:text-sky-300 transition-colors">
                          {playing ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <span className="text-white/70 text-xs font-mono ml-1">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {/* Active segment badge */}
                          {activeSegment !== null && applicant.videoSegments && (
                            <span className="text-[11px] text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                              Q{activeSegment + 1} playing
                            </span>
                          )}
                          <button
                            onClick={() => videoRef.current?.requestFullscreen()}
                            className="text-white/70 hover:text-white transition-colors"
                          >
                            <Maximize2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium">Segment markers:</span>
                    {(["confident","neutral","nervous","hesitant"] as const).map(e => {
                      const cfg = EMOTION_CONFIG[e];
                      return (
                        <span key={e} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-2 h-2 rounded-full ${
                            e === "confident" ? "bg-emerald-400" :
                            e === "nervous"   ? "bg-amber-400" :
                            e === "hesitant"  ? "bg-orange-400" : "bg-sky-400"
                          }`} /> {cfg.label}
                        </span>
                      );
                    })}
                  </div>

                  {/* Jump-to-question list */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Jump to question</p>
                    <div className="space-y-1.5">
                      {applicant.videoSegments?.map((seg, i) => {
                        const em = EMOTION_CONFIG[seg.emotion];
                        const EmIcon = em.icon;
                        const isActive = activeSegment === i;
                        return (
                          <button
                            key={i}
                            onClick={() => jumpToSegment(seg, i)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              isActive
                                ? "bg-sky-50 border-sky-200"
                                : "bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white"
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                              isActive ? "bg-sky-500 text-white" : "bg-white border border-slate-200 text-slate-500"
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 font-medium line-clamp-1">{seg.question}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{formatTime(seg.startTime)} · {seg.duration}s</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${em.bg} ${em.color}`}>
                              <EmIcon size={10} /> {em.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Video size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No recording available</p>
                  <p className="text-xs text-slate-400 mt-1">The AI interview for this candidate has no video.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ SOFT SKILLS TAB ══ */}
          {activeTab === "softskills" && (
            <div className="p-5 space-y-4">
              {applicant.softSkills ? (
                <>
                  {/* Overall soft skill score */}
                  <div className="bg-gradient-to-br from-violet-50 to-sky-50 border border-violet-100 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-violet-200 flex items-center justify-center shadow-sm flex-shrink-0">
                      <p className="text-xl font-black text-violet-600">{overallSoftScore}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Overall Soft Skills Score</p>
                      <p className="text-xs text-slate-500 mt-0.5">Evaluated from video interview behaviour and communication analysis</p>
                      <div className="mt-2 w-40 h-2 bg-violet-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-400 to-sky-400 rounded-full transition-all" style={{ width: `${overallSoftScore}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Individual skill bars */}
                  <div className="space-y-3">
                    {applicant.softSkills.map((s) => (
                      <div key={s.skill} className="bg-white border border-slate-100 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={13} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-800">{s.skill}</span>
                          </div>
                          <span className={`text-sm font-black ${
                            s.score >= 85 ? "text-emerald-600" :
                            s.score >= 70 ? "text-sky-600" : "text-amber-600"
                          }`}>{s.score}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              s.score >= 85 ? "bg-gradient-to-r from-emerald-400 to-teal-400" :
                              s.score >= 70 ? "bg-gradient-to-r from-sky-400 to-blue-400" :
                              "bg-gradient-to-r from-amber-400 to-orange-400"
                            }`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{s.note}</p>
                      </div>
                    ))}
                  </div>

                  {/* Emotion distribution from video */}
                  {applicant.videoSegments && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                        <Smile size={12} className="text-slate-400" /> Emotion detected per segment
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {applicant.videoSegments.map((seg, i) => {
                          const em = EMOTION_CONFIG[seg.emotion];
                          const EmIcon = em.icon;
                          return (
                            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${em.bg} ${em.color}`}>
                              <EmIcon size={12} />
                              <span>Q{i + 1}</span>
                              <span className="opacity-70">·</span>
                              <span>{em.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all">
                      <Download size={13} /> Export Report
                    </button>
                    <button className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                      Contact Candidate
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <TrendingUp size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-500">No soft skill data</p>
                  <p className="text-xs text-slate-400 mt-1">Complete an AI video interview to generate this analysis.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessApplicants() {
  const [applicants, setApplicants] = useState<Applicant[]>(MOCK_APPLICANTS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [screeningTarget, setScreeningTarget] = useState<Applicant | null>(null);
  const [resultTarget, setResultTarget] = useState<Applicant | null>(null);
  const [page, setPage] = useState(1);

  const statusOptions = ["all", ...Object.keys(STATUS_CONFIG)];

  const filtered = useMemo(
    () => applicants.filter((applicant) => filterStatus === "all" || applicant.status === filterStatus),
    [applicants, filterStatus],
  );

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  const approve = (id: string) => {
    setApplicants((prev) => prev.map((applicant) => (applicant.id === id ? { ...applicant, status: "approved" } : applicant)));
  };

  const reject = (id: string) => {
    setApplicants((prev) => prev.map((applicant) => (applicant.id === id ? { ...applicant, status: "rejected" } : applicant)));
  };

  const sendScreening = (id: string, _questions: string[]) => {
    setApplicants((prev) => prev.map((applicant) => (applicant.id === id ? { ...applicant, status: "screening" } : applicant)));
  };

  const counts = {
    pending: applicants.filter((applicant) => applicant.status === "pending").length,
    approved: applicants.filter((applicant) => applicant.status === "approved").length,
    screening: applicants.filter((applicant) => applicant.status === "screening").length,
    completed: applicants.filter((applicant) => applicant.status === "completed").length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <BusinessLayout title="Applicants" subtitle="Review, shortlist, and run AI interviews efficiently.">
      {screeningTarget && (
        <ScreeningModal
          applicant={screeningTarget}
          onClose={() => setScreeningTarget(null)}
          onSend={sendScreening}
        />
      )}

      {resultTarget && (
        <ResultModal
          applicant={resultTarget}
          onClose={() => setResultTarget(null)}
        />
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`rounded-xl border p-3 text-center ${STATUS_CONFIG.pending.tile}`}>
            <p className="text-xl font-black">{counts.pending}</p>
            <p className="text-xs font-medium mt-0.5">Pending</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${STATUS_CONFIG.approved.tile}`}>
            <p className="text-xl font-black">{counts.approved}</p>
            <p className="text-xs font-medium mt-0.5">Approved</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${STATUS_CONFIG.screening.tile}`}>
            <p className="text-xl font-black">{counts.screening}</p>
            <p className="text-xs font-medium mt-0.5">AI Screening</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${STATUS_CONFIG.completed.tile}`}>
            <p className="text-xl font-black">{counts.completed}</p>
            <p className="text-xs font-medium mt-0.5">Completed</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  filterStatus === status
                    ? "bg-sky-500 text-white border-sky-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                }`}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status as Status]?.label || status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {visible.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No applicants found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {visible.map((applicant) => {
                const status = STATUS_CONFIG[applicant.status];
                const colorIndex = applicant.name.charCodeAt(0) % AVATAR_GRADIENTS.length;
                return (
                  <div key={applicant.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[colorIndex]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                        {applicant.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">{applicant.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-xs text-slate-500">{applicant.role}</p>
                          <span className="text-xs text-sky-600 font-medium">{applicant.score} points</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(applicant.appliedAt).toLocaleDateString("en-US")}
                          </span>
                        </div>

                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {applicant.skills.map((skill) => (
                            <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>

                        {applicant.status === "completed" && applicant.screeningScore && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                              <Bot size={12} className="text-emerald-600" />
                              <span className="text-xs text-emerald-700 font-semibold">
                                AI: {applicant.screeningScore}/100
                              </span>
                            </div>
                            <button
                              onClick={() => setResultTarget(applicant)}
                              className="text-xs text-sky-600 hover:text-sky-700 font-medium underline"
                            >
                              View details
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="View CV">
                          <FileText size={15} />
                        </button>

                        {applicant.status === "pending" && (
                          <>
                            <button
                              onClick={() => approve(applicant.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Approve"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => reject(applicant.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}

                        {applicant.status === "approved" && (
                          <button
                            onClick={() => setScreeningTarget(applicant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg shadow-sm"
                          >
                            <Bot size={13} />
                            AI Screening
                          </button>
                        )}

                        {applicant.status === "screening" && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium rounded-lg">
                            <Loader2 size={12} className="animate-spin" />
                            In progress...
                          </div>
                        )}

                        {applicant.status === "completed" && (
                          <button
                            onClick={() => setResultTarget(applicant)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200"
                          >
                            <Eye size={13} />
                            Result
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </BusinessLayout>
  );
}