import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Cpu, FileText, GraduationCap, LayoutDashboard, MessageSquare,
  MousePointer2, UploadCloud, Users, Briefcase,
} from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";
import Tilt from "react-parallax-tilt";

/**
 * Auto-play product demo — TestGorilla-style "GIF", built in code.
 * A ghost cursor replays a real user session, on loop.
 * Upgraded to Premium Light Theme with 3D Parallax Tilt, soft scan lines, and high-end widescreen aesthetics.
 */

type Phase = "idle" | "upload" | "scan" | "score" | "advice";
type UploadStep = "enter" | "carry" | "dropped";

const PHASE_MS: Record<Phase, number> = { idle: 2000, upload: 3400, scan: 2500, score: 3500, advice: 5000 };
const NEXT_PHASE: Record<Phase, Phase> = { idle: "upload", upload: "scan", scan: "score", score: "advice", advice: "idle" };
const ADVICE_TEXT =
  "Study System Design Essentials in your roadmap to increase your synergy match to 98%.";

interface XY { x: number; y: number }
interface UploadCoords { deskChip: XY; deskGrab: XY; dropCursor: XY; dropChip: XY }

function TypingAdvice({ active }: { active: boolean }) {
  const { typed, done } = useTypewriter(ADVICE_TEXT, 20, active);
  return (
    <>
      <span className="text-blue-600 font-bold">AI Recommendation:</span> {typed}
      {!done && <span className="inline-block w-1.5 h-3 ml-0.5 bg-blue-600 animate-pulse" />}
    </>
  );
}

export default function HeroDashboardDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sidebarTargetRef = useRef<HTMLDivElement>(null);
  const mainPanelRef = useRef<HTMLDivElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  const [phase, setPhase] = useState<Phase>("idle");
  const [opacity, setOpacity] = useState(1);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("enter");
  const [cursorPath, setCursorPath] = useState<{ from: XY; to: XY } | null>(null);
  const [uploadCoords, setUploadCoords] = useState<UploadCoords | null>(null);

  // Check visibility state and prefers-reduced-motion
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === "hidden");
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Phase controller loop
  useEffect(() => {
    if (reducedMotion) {
      setPhase("advice");
      return;
    }

    if (!isInView || isTabHidden) return;

    const duration = phase === "idle" && !cursorPath ? 700 : PHASE_MS[phase];

    let fadeTimer: NodeJS.Timeout;
    const timer = setTimeout(() => {
      if (phase === "advice") {
        setOpacity(0);
        fadeTimer = setTimeout(() => {
          setClicked(false);
          setUploadStep("enter");
          setPhase("idle");
          setOpacity(1);
        }, 400);
      } else {
        setPhase(NEXT_PHASE[phase]);
      }
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [phase, isInView, isTabHidden, reducedMotion, cursorPath]);

  // Act 1 — cursor clicks the sidebar item
  useEffect(() => {
    if (phase !== "idle" || reducedMotion) return;

    const card = cardRef.current;
    const target = sidebarTargetRef.current;
    if (!card || !target || target.offsetWidth === 0) {
      setCursorPath(null);
      return;
    }

    const c = card.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    setCursorPath({
      from: { x: c.width * 0.72, y: c.height * 0.88 },
      to: { x: t.left - c.left + t.width * 0.6, y: t.top - c.top + t.height * 0.55 },
    });

    const clickTimer = setTimeout(() => setClicked(true), 1300);
    return () => clearTimeout(clickTimer);
  }, [phase, reducedMotion]);

  // Act 2 — drag & drop CV file
  useEffect(() => {
    if (phase !== "upload" || reducedMotion) return;

    const card = cardRef.current;
    const panel = mainPanelRef.current;
    const drop = dropzoneRef.current;
    if (card && panel && drop) {
      const c = card.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      const d = drop.getBoundingClientRect();

      const deskChip = { x: p.left - c.left + 18, y: p.bottom - c.top - 52 };
      const dropCenter = { x: d.left - c.left + d.width / 2, y: d.top - c.top + d.height / 2 };

      setUploadCoords({
        deskChip,
        deskGrab: { x: deskChip.x + 56, y: deskChip.y + 16 },
        dropCursor: { x: dropCenter.x + 30, y: dropCenter.y + 6 },
        dropChip: { x: dropCenter.x - 52, y: dropCenter.y - 14 },
      });
    }

    const timers = [
      setTimeout(() => setUploadStep("carry"), 1100),
      setTimeout(() => setUploadStep("dropped"), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase, reducedMotion]);

  const diagnosisActive = clicked || phase !== "idle";
  const scored = phase === "score" || phase === "advice";

  const radius = 48;
  const circumference = 2 * Math.PI * radius;

  return (
    <div ref={containerRef} className="w-full relative z-10 px-2">
      {/* Glow background effects */}
      <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-[120px] rounded-full z-0 opacity-40 pointer-events-none" />

      {/* Parallax Tilt Container */}
      <Tilt
        glareEnable={true}
        glareMaxOpacity={0.04}
        glarePosition="all"
        tiltMaxAngleX={2.5}
        tiltMaxAngleY={2.5}
        scale={1.008}
        transitionSpeed={2500}
        className="w-full relative z-20 rounded-[2.2rem] p-[3px] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.12),0_30px_60px_-30px_rgba(0,0,0,0.15)] transition-all duration-300"
        style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(56,189,248,0.1), rgba(99,102,241,0.08))" }}
      >
        <motion.div
          ref={cardRef}
          animate={{ opacity }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-[2rem] bg-white/95 backdrop-blur-md overflow-hidden relative"
        >
          {/* Subtle light scan line effect running over the dashboard */}
          <motion.div
            className="absolute w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent z-30 pointer-events-none"
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          {/* ── Ghost cursor, act 1: fly in + click the sidebar item ── */}
          {cursorPath && phase === "idle" && (
            <>
              <motion.div
                className="absolute z-40 pointer-events-none"
                initial={{ x: cursorPath.from.x, y: cursorPath.from.y, opacity: 0 }}
                animate={{
                  x: cursorPath.to.x,
                  y: cursorPath.to.y,
                  opacity: 1,
                  scale: clicked ? 0.82 : 1,
                }}
                transition={{
                  x: { duration: 1.1, ease: "easeInOut" },
                  y: { duration: 1.1, ease: "easeInOut" },
                  opacity: { duration: 0.35 },
                  scale: { duration: 0.12 },
                }}
              >
                <MousePointer2 className="w-5 h-5 text-slate-900 fill-white drop-shadow-md" />
              </motion.div>
              {clicked && (
                <motion.span
                  className="absolute z-30 w-8 h-8 rounded-full border-2 border-blue-500/60 pointer-events-none"
                  style={{ left: cursorPath.to.x - 16, top: cursorPath.to.y - 16 }}
                  initial={{ scale: 0.3, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </>
          )}

          {/* ── Ghost cursor + CV file, act 2: grab the file, drag it into the dropzone ── */}
          {uploadCoords && phase === "upload" && (
            <>
              <motion.div
                className="absolute z-40 pointer-events-none"
                initial={{
                  x: cursorPath ? cursorPath.to.x : uploadCoords.deskGrab.x + 90,
                  y: cursorPath ? cursorPath.to.y : uploadCoords.deskGrab.y + 70,
                  opacity: cursorPath ? 1 : 0,
                }}
                animate={{
                  x: uploadStep === "enter" ? uploadCoords.deskGrab.x
                    : uploadStep === "carry" ? uploadCoords.dropCursor.x
                    : uploadCoords.dropCursor.x + 30,
                  y: uploadStep === "enter" ? uploadCoords.deskGrab.y
                    : uploadStep === "carry" ? uploadCoords.dropCursor.y
                    : uploadCoords.dropCursor.y + 26,
                  opacity: uploadStep === "dropped" ? 0 : 1,
                  scale: uploadStep === "carry" ? 0.9 : 1,
                }}
                transition={{
                  x: { duration: uploadStep === "carry" ? 1.3 : 0.6, ease: "easeInOut" },
                  y: { duration: uploadStep === "carry" ? 1.3 : 0.6, ease: "easeInOut" },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.15 },
                }}
              >
                <MousePointer2 className="w-5 h-5 text-slate-900 fill-white drop-shadow-md" />
              </motion.div>

              {/* The CV file being dragged */}
              <motion.div
                className="absolute z-30 pointer-events-none"
                initial={{ x: uploadCoords.deskChip.x, y: uploadCoords.deskChip.y, opacity: 0, scale: 0.9 }}
                animate={{
                  x: uploadStep === "carry" || uploadStep === "dropped" ? uploadCoords.dropChip.x : uploadCoords.deskChip.x,
                  y: uploadStep === "carry" || uploadStep === "dropped" ? uploadCoords.dropChip.y : uploadCoords.deskChip.y,
                  opacity: uploadStep === "dropped" ? 0 : 1,
                  scale: uploadStep === "dropped" ? 0.6 : uploadStep === "carry" ? 1.05 : 1,
                  rotate: uploadStep === "carry" ? -4 : 0,
                }}
                transition={{
                  x: { duration: 1.3, ease: "easeInOut" },
                  y: { duration: 1.3, ease: "easeInOut" },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.25 },
                  rotate: { duration: 0.3 },
                }}
              >
                <div className={cn(
                  "bg-white border border-slate-200/80 rounded-xl px-3 py-2 flex items-center gap-2 transition-shadow duration-300 text-slate-700 shadow-lg"
                )}>
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-slate-700">CV_HoangLongAnh.pdf</span>
                </div>
              </motion.div>
            </>
          )}

          {/* Browser top-bar */}
          <div className="bg-slate-50/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-white px-6 py-1.5 rounded-lg border border-slate-100/80 shadow-inner flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
              skillbridge.ai/dashboard
            </div>
            <div className="w-12" />
          </div>

          {/* UI Inner body - Split Layout: Sidebar + Content */}
          <div className="flex min-h-[360px] text-left">
            {/* Mock Sidebar (Left) */}
            <div className="hidden sm:flex flex-col w-48 bg-slate-50/50 border-r border-slate-100 p-3.5 space-y-5 flex-shrink-0">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.2)]">
                  <span className="font-display font-black text-xs text-white">S</span>
                </div>
                <span className="font-display font-black text-sm text-slate-800">SkillBridge</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: "Dashboard", icon: LayoutDashboard },
                  { label: "CV Diagnosis", icon: FileText },
                  { label: "Learning Roadmaps", icon: GraduationCap },
                  { label: "AI Interview", icon: MessageSquare },
                  { label: "Mentorship", icon: Users },
                  { label: "Job Matching", icon: Briefcase },
                ].map((item) => {
                  const isActive =
                    item.label === "CV Diagnosis" ? diagnosisActive : item.label === "Dashboard" && !diagnosisActive;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer",
                        isActive
                          ? "bg-blue-50 text-blue-600 border border-blue-100/30 shadow-[0_2px_10px_rgba(37,99,235,0.05)]"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4 text-inherit" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Dashboard content (Right) */}
            <div ref={mainPanelRef} className="flex-1 p-5 md:p-6 space-y-5 flex flex-col justify-between">
              {/* Header Profile Row */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  {/* Mock Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md border border-white/10">
                    LA
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Candidate Profile</div>
                    <h4 className="text-sm font-bold text-slate-800">Hoang Long Anh</h4>
                    <p className="text-xs text-slate-500 font-medium">Target: Frontend Engineer</p>
                  </div>
                </div>

                {/* Dynamic Status Tag */}
                <div className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-bold shadow-sm transition-all duration-500 border backdrop-blur-sm",
                  phase === "idle"
                    ? "bg-slate-100 border-slate-200 text-slate-500"
                    : phase === "upload"
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-600"
                      : phase === "scan"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 animate-pulse"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                )}>
                  {phase === "idle" ? "Ready" : phase === "upload" ? "Awaiting CV" : phase === "scan" ? "Analyzing CV..." : "Active Match"}
                </div>
              </div>

              {/* Main stage: the results grid / dropzone overlay */}
              <div className="relative flex-1 flex flex-col justify-center min-h-[150px]">
                {/* Dropzone overlay (upload act) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: phase === "upload" ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn("absolute inset-0 z-10 w-full h-full", phase !== "upload" && "pointer-events-none")}
                  aria-hidden={phase !== "upload"}
                >
                  <div
                    ref={dropzoneRef}
                    className={cn(
                      "h-full min-h-[150px] border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-1.5 transition-all duration-300",
                      uploadStep === "carry"
                        ? "border-blue-400 bg-blue-50/60 shadow-[0_0_15px_rgba(37,99,235,0.05)]"
                        : uploadStep === "dropped"
                          ? "border-emerald-300 bg-emerald-50/60"
                          : "border-slate-200 bg-slate-50/40"
                    )}
                  >
                    {uploadStep !== "dropped" ? (
                      <>
                        <UploadCloud className={cn(
                          "w-8 h-8 transition-colors duration-300",
                          uploadStep === "carry" ? "text-blue-500" : "text-slate-300"
                        )} />
                        <div className="text-xs font-bold text-slate-700">Drag & drop your CV here</div>
                        <div className="text-[9px] text-slate-400 font-semibold">PDF · DOCX — max 5MB</div>
                      </>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="w-full max-w-xs bg-white border border-emerald-200 rounded-xl p-2.5 flex items-center gap-3 shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate">CV_HoangLongAnh.pdf</div>
                          <div className="h-1 mt-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full bg-emerald-500 origin-left rounded-full"
                            />
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Results grid */}
                <motion.div
                  initial={false}
                  animate={{ opacity: phase === "upload" ? 0 : 1 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-5"
                >
                  {/* Synergy Score Card */}
                  <div className="md:col-span-5 bg-slate-50/60 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden backdrop-blur-sm">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          className="stroke-slate-200 fill-none"
                          strokeWidth="6"
                        />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r="40"
                          className="stroke-blue-600 fill-none"
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 40}
                          animate={{
                            strokeDashoffset: scored ? (2 * Math.PI * 40) * (1 - 0.92) : (2 * Math.PI * 40)
                          }}
                          transition={{
                            duration: scored ? 1.5 : 0.3,
                            ease: "easeOut"
                          }}
                          style={{
                            filter: scored ? "drop-shadow(0 0 6px rgba(37,99,235,0.45))" : "none"
                          }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display font-black text-2xl text-slate-800">
                          {scored ? "92%" : "0%"}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Match</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800">Synergy Score</div>
                      <p className="text-[9px] text-slate-400 font-medium max-w-[140px] mx-auto leading-tight">
                        {phase === "idle"
                          ? "Awaiting analysis run..."
                          : phase === "scan"
                            ? "Calculating compatibility..."
                            : "Highly compatible setup"}
                      </p>
                    </div>
                  </div>

                  {/* Skill Matrix details */}
                  <div className="md:col-span-7 bg-slate-50/60 border border-slate-100 p-4 rounded-2xl space-y-3 backdrop-blur-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1.5 flex justify-between">
                      <span>Skill Alignment Matrix</span>
                      <span className="text-[8px] text-blue-600 font-bold lowercase">Analyzed by SkillBridge</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                      {[
                        { skill: "React JS", status: "match" },
                        { skill: "TailwindCSS", status: "match" },
                        { skill: "TypeScript", status: "match" },
                        { skill: "System Design", status: "missing" },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 border bg-slate-55/40 p-2.5 rounded-xl transition-all duration-500",
                            !scored ? "opacity-45 scale-98 border-slate-100" : "opacity-100 scale-100 border-slate-200/60 bg-white shadow-sm",
                            scored && s.status === "missing" && phase === "advice"
                              ? "border-amber-400 bg-amber-50/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                              : ""
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                            !scored
                              ? "bg-slate-300"
                              : s.status === "match"
                                ? "bg-emerald-500"
                                : "bg-amber-500 animate-pulse"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-slate-700 truncate">{s.skill}</div>
                            <div className={cn(
                              "text-[8px] font-bold uppercase tracking-wider transition-colors duration-500",
                              !scored
                                ? "text-slate-400"
                                : s.status === "match"
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                            )}>
                              {phase === "idle" ? "Queued" : phase === "scan" ? "Scanning..." : s.status === "match" ? "Verified Match" : "Gap Identified"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* AI Advisor Panel */}
              <div className={cn(
                "border p-3 rounded-xl flex items-center gap-3 transition-all duration-500 min-h-[56px]",
                !scored
                  ? "bg-slate-50 border-slate-100 text-slate-400"
                  : "bg-gradient-to-r from-blue-500/[0.02] to-indigo-500/[0.02] border-blue-500/15 text-slate-700 shadow-[0_4px_20px_rgba(37,99,235,0.03)]"
              )}>
                <div className={cn(
                  "w-7.5 h-7.5 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-500 p-1.5",
                  !scored
                    ? "bg-slate-100 border-slate-200 text-slate-400"
                    : "bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/5"
                )}>
                  <Cpu className={cn("w-3.5 h-3.5", phase === "scan" && "animate-spin")} />
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  {phase === "idle" && (
                    <span className="italic text-slate-400">Ready — open CV Diagnosis to benchmark this profile against real job descriptions.</span>
                  )}
                  {phase === "upload" && (
                    <span className="italic text-slate-400">
                      {uploadStep === "dropped"
                        ? "CV received. Preparing the analysis engine..."
                        : "Waiting for a CV file — drag & drop to start the scan..."}
                    </span>
                  )}
                  {phase === "scan" && (
                    <span className="italic text-blue-500">AI Engine is analyzing CV keywords against targeted Job Descriptions...</span>
                  )}
                  {phase === "score" && (
                    <span className="text-slate-600">Analysis complete. <span className="text-amber-600 font-bold">1 skill gap</span> identified. Formulating optimization strategy...</span>
                  )}
                  {phase === "advice" && <TypingAdvice active />}
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </Tilt>
    </div>
  );
}
