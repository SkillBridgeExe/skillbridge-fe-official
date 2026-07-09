import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Award, CheckCircle2, Cpu, LayoutDashboard, MessageSquare, Mic,
} from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";
import DemoShell, { relPoint, type XY } from "@/components/home/demo/DemoShell";
import { ClickRipple, CursorPointer } from "@/components/home/demo/GhostCursor";

/**
 * Hero demo #3 — AI Mock Interview (flow đúng web thật /interview):
 * click "AI Interview" trên sidebar → click "Start Voice Interview" →
 * AI hỏi (gõ chữ) → trả lời bằng giọng nói (waveform + transcript) →
 * bảng điểm 85% + nhận xét. Loop. Khung dùng chung DemoShell.
 */

type Phase = "nav" | "intro" | "question" | "answer" | "evaluation";

const PHASE_MS: Record<Phase, number> = { nav: 1800, intro: 1600, question: 3400, answer: 3800, evaluation: 4600 };
const NEXT_PHASE: Record<Phase, Phase> = { nav: "intro", intro: "question", question: "answer", answer: "evaluation", evaluation: "nav" };

const QUESTION_TEXT = "Explain the difference between useMemo and useCallback in React.";
const ANSWER_TEXT =
  "useMemo caches a computed value between renders, while useCallback caches the function itself so children that rely on reference equality don't re-render.";

interface Coords { nav: XY; start: XY }

export default function HeroInterviewDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sidebarTargetRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  const [phase, setPhase] = useState<Phase>("nav");
  const [opacity, setOpacity] = useState(1);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [navClicked, setNavClicked] = useState(false);
  const [startClicked, setStartClicked] = useState(false);

  const { typed: typedQuestion, done: questionDone } = useTypewriter(QUESTION_TEXT, 30, phase === "question" || phase === "answer");
  const { typed: typedAnswer } = useTypewriter(ANSWER_TEXT, 20, phase === "answer");

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
      setPhase("evaluation");
      return;
    }
    if (!isInView || isTabHidden) return;

    let fadeTimer: NodeJS.Timeout;
    const timer = setTimeout(() => {
      if (phase === "evaluation") {
        setOpacity(0);
        fadeTimer = setTimeout(() => {
          setNavClicked(false);
          setStartClicked(false);
          setPhase("nav");
          setOpacity(1);
        }, 400);
      } else {
        setPhase(NEXT_PHASE[phase]);
      }
    }, PHASE_MS[phase]);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [phase, isInView, isTabHidden, reducedMotion]);

  // Act 1 — measure targets at loop start, then click the sidebar item
  useEffect(() => {
    if (phase !== "nav" || reducedMotion) return;

    const card = cardRef.current;
    const nav = sidebarTargetRef.current;
    const start = startButtonRef.current;
    if (card && start) {
      setCoords({
        // Sidebar ẩn trên mobile → cursor mở màn ngay tại nút Start
        nav: nav && nav.offsetWidth > 0 ? relPoint(card, nav, 0.6, 0.55) : relPoint(card, start, 0.5, 0.5),
        start: relPoint(card, start, 0.5, 0.5),
      });
    }

    const clickTimer = setTimeout(() => setNavClicked(true), 1300);
    return () => clearTimeout(clickTimer);
  }, [phase, reducedMotion]);

  // Act 2 — click "Start Voice Interview"
  useEffect(() => {
    if (phase !== "intro" || reducedMotion) return;
    const clickTimer = setTimeout(() => setStartClicked(true), 1000);
    return () => clearTimeout(clickTimer);
  }, [phase, reducedMotion]);

  const navDone = navClicked || phase !== "nav";
  const showIntro = phase === "nav" || phase === "intro";
  const showChat = phase === "question" || phase === "answer";
  const showResult = phase === "evaluation";

  const cursorTarget: XY | null = coords
    ? phase === "nav" ? coords.nav : coords.start
    : null;

  return (
    <DemoShell
      containerRef={containerRef}
      cardRef={cardRef}
      url={navDone ? "skillbridge.ai/interview" : "skillbridge.ai/dashboard"}
      urlIcon={navDone ? MessageSquare : LayoutDashboard}
      activeItem={navDone ? "AI Interview" : "Dashboard"}
      sidebarItemRef={sidebarTargetRef}
      sidebarItemRefLabel="AI Interview"
      opacity={opacity}
      overlay={
        coords && cursorTarget && showIntro && (
          <>
            <motion.div
              className="absolute z-40 pointer-events-none"
              initial={{ x: cardRef.current ? cardRef.current.clientWidth * 0.8 : 0, y: cardRef.current ? cardRef.current.clientHeight * 0.9 : 0, opacity: 0 }}
              animate={{
                x: cursorTarget.x,
                y: cursorTarget.y,
                opacity: 1,
                scale: (navClicked && phase === "nav") || (startClicked && phase === "intro") ? 0.82 : 1,
              }}
              transition={{
                x: { duration: phase === "nav" ? 1.1 : 0.7, ease: "easeInOut" },
                y: { duration: phase === "nav" ? 1.1 : 0.7, ease: "easeInOut" },
                opacity: { duration: 0.35 },
                scale: { duration: 0.12 },
              }}
            >
              <CursorPointer />
            </motion.div>
            {navClicked && phase === "nav" && <ClickRipple x={coords.nav.x} y={coords.nav.y} />}
            {startClicked && phase === "intro" && <ClickRipple x={coords.start.x} y={coords.start.y} />}
          </>
        )
      }
    >
      {/* Main Content Area */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800">AI Mock Interview Practice</h4>
            <p className="text-[9px] text-slate-400 font-medium">Real-time simulation with instant voice analysis</p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 border border-emerald-100 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Voice</span>
          </div>
        </div>

        {/* Dynamic State Center */}
        <div className="relative my-auto py-4">
          {showIntro && (
            <div className="max-w-md mx-auto space-y-4 text-center">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Position</div>
                <div className="text-sm font-bold text-slate-800">React Frontend Developer</div>
                <div className="text-[9px] text-slate-400 font-semibold">10 technical questions / 15 minutes</div>
              </div>
              <div
                ref={startButtonRef}
                className={cn(
                  "inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-md shadow-blue-500/10 border border-blue-500/20 cursor-pointer select-none transition-all duration-300",
                  startClicked ? "scale-95 brightness-90 shadow-none" : "hover:brightness-105"
                )}
              >
                <Mic className="w-3.5 h-3.5 text-white" />
                <span>Start Voice Interview</span>
              </div>
            </div>
          )}

          {showChat && (
            <div className="space-y-3.5 max-w-lg mx-auto">
              {/* Examiner Question Box */}
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="flex-1 bg-indigo-50/40 border border-indigo-100/40 p-2.5 rounded-xl">
                  <div className="text-[8px] font-bold text-indigo-600 uppercase tracking-wide mb-0.5">AI Examiner</div>
                  <p className="text-[10px] font-semibold text-slate-700 leading-relaxed">
                    {typedQuestion}
                    {!questionDone && <span className="inline-block w-1 h-3 ml-0.5 bg-indigo-600 animate-pulse" />}
                  </p>
                </div>
              </div>

              {/* User Answer Box */}
              {phase === "answer" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5 items-start justify-end"
                >
                  <div className="flex-1 bg-blue-50/50 border border-blue-100/30 p-2.5 rounded-xl text-right max-w-sm">
                    <div className="text-[8px] font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center justify-end gap-1.5">
                      {/* Soundwave animation */}
                      <div className="flex items-center gap-0.5 h-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-blue-500 rounded-full"
                            animate={{ height: ["2px", "8px", "2px"] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                      <span>Recording / Transcribing...</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-600 leading-relaxed italic">
                      "{typedAnswer}"
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[9px] text-blue-600 flex-shrink-0">
                    HL
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-12 gap-3.5 max-w-xl mx-auto"
            >
              {/* Score Ring */}
              <div className="col-span-4 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="26" className="stroke-slate-200 fill-none" strokeWidth="4" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="26"
                      className="stroke-emerald-500 fill-none"
                      strokeWidth="4"
                      strokeDasharray={2 * Math.PI * 26}
                      initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - 0.85) }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display font-black text-sm text-slate-800">85%</span>
                    <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest leading-none">Score</span>
                  </div>
                </div>
                <div className="text-[9px] font-bold text-slate-800 leading-none">Strong Answer</div>
              </div>

              {/* Feedback breakdown */}
              <div className="col-span-8 space-y-2 bg-slate-50/50 border border-slate-100 p-3 rounded-2xl">
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-1 flex justify-between">
                  <span>AI Analysis Report</span>
                  <span className="text-emerald-600 font-bold">Mid-Level Fit</span>
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div className="text-[9px] leading-tight text-slate-600">
                      <strong className="text-slate-800 font-bold">Strengths:</strong> Accurate definitions of reference-equality and cache memoization.
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-[9px] leading-tight text-slate-600">
                      <strong className="text-slate-800 font-bold">Gap Tip:</strong> Mention inline functions to contextualize useCallback utility.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom AI Advice */}
        <div className={cn(
          "border p-3 rounded-xl flex items-center gap-3 transition-all duration-500 min-h-[56px]",
          !showResult
            ? "bg-slate-50 border-slate-100 text-slate-400"
            : "bg-gradient-to-r from-blue-500/[0.02] to-indigo-500/[0.02] border-blue-500/15 text-slate-700 shadow-[0_4px_20px_rgba(37,99,235,0.03)]"
        )}>
          <div className={cn(
            "w-7 h-7 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-500 p-1.5",
            !showResult
              ? "bg-slate-100 border-slate-200 text-slate-400"
              : "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
          )}>
            <Cpu className={cn("w-3.5 h-3.5", phase === "question" && "animate-pulse")} />
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {phase === "nav" && (
              <span className="italic text-slate-400">Ready - open AI Interview to practice with the voice examiner.</span>
            )}
            {phase === "intro" && (
              <span className="italic text-slate-400">Start the session to begin the real-time AI voice evaluation.</span>
            )}
            {phase === "question" && (
              <span className="italic text-slate-600">AI Examiner is speaking. Listen to the question carefully...</span>
            )}
            {phase === "answer" && (
              <span className="italic text-blue-500">Listening to your microphone response... Translating speech-to-text.</span>
            )}
            {phase === "evaluation" && (
              <span className="text-slate-600">
                <span className="text-blue-600 font-bold">AI Advisor:</span> Good job! Practice 3 more questions on React hook pitfalls to reach a 95% pass rate.
              </span>
            )}
          </p>
        </div>
      </div>
    </DemoShell>
  );
}
