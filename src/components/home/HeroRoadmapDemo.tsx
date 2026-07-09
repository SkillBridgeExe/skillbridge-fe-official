import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen, Clock, Cpu, GraduationCap, LayoutDashboard, Lock, Search, Sparkles,
} from "lucide-react";
import { useTypewriter } from "@/hooks/useTypewriter";
import DemoShell, { relPoint, type XY } from "@/components/home/demo/DemoShell";
import { ClickRipple, CursorPointer } from "@/components/home/demo/GhostCursor";

/**
 * Hero demo #2 — Learning Roadmap (flow đúng web thật /roadmap-generator):
 * click "Learning Roadmaps" trên sidebar → click ô input → gõ "React Developer"
 * → click "Generate Career Roadmap" → loader → lộ trình 3 chặng hiện ra. Loop.
 * Khung dùng chung DemoShell — sidebar/browser bar y hệt 2 demo còn lại.
 */

type Phase = "nav" | "focus" | "typing" | "generate" | "display";

const PHASE_MS: Record<Phase, number> = { nav: 1800, focus: 1400, typing: 2400, generate: 1800, display: 5000 };
const NEXT_PHASE: Record<Phase, Phase> = { nav: "focus", focus: "typing", typing: "generate", generate: "display", display: "nav" };
const TARGET_ROLE = "React Developer";

interface Coords { nav: XY; input: XY; btn: XY }

export default function HeroRoadmapDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sidebarTargetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-100px" });

  const [phase, setPhase] = useState<Phase>("nav");
  const [opacity, setOpacity] = useState(1);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [navClicked, setNavClicked] = useState(false);
  const [inputClicked, setInputClicked] = useState(false);
  const [btnClicked, setBtnClicked] = useState(false);
  const [movedToBtn, setMovedToBtn] = useState(false);

  const { typed: typedRole } = useTypewriter(TARGET_ROLE, 80, phase === "typing");

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
      setPhase("display");
      return;
    }
    if (!isInView || isTabHidden) return;

    let fadeTimer: NodeJS.Timeout;
    const timer = setTimeout(() => {
      if (phase === "display") {
        setOpacity(0);
        fadeTimer = setTimeout(() => {
          setNavClicked(false);
          setInputClicked(false);
          setBtnClicked(false);
          setMovedToBtn(false);
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

  // Act 1 — measure all cursor targets at loop start, then click the sidebar item
  useEffect(() => {
    if (phase !== "nav" || reducedMotion) return;

    const card = cardRef.current;
    const nav = sidebarTargetRef.current;
    const input = inputRef.current;
    const btn = buttonRef.current;
    if (card && input && btn) {
      setCoords({
        // Sidebar ẩn trên mobile → cursor mở màn ngay tại ô input
        nav: nav && nav.offsetWidth > 0 ? relPoint(card, nav, 0.6, 0.55) : relPoint(card, input, 0.4, 0.5),
        input: relPoint(card, input, 0.4, 0.5),
        btn: relPoint(card, btn, 0.5, 0.5),
      });
    }

    const clickTimer = setTimeout(() => setNavClicked(true), 1300);
    return () => clearTimeout(clickTimer);
  }, [phase, reducedMotion]);

  // Act 2 — click into the input
  useEffect(() => {
    if (phase !== "focus" || reducedMotion) return;
    const clickTimer = setTimeout(() => setInputClicked(true), 900);
    return () => clearTimeout(clickTimer);
  }, [phase, reducedMotion]);

  // Act 3 — after typing, slide over to the generate button and click it
  useEffect(() => {
    if (phase !== "typing" || reducedMotion) return;
    const moveTimer = setTimeout(() => setMovedToBtn(true), 1400);
    return () => clearTimeout(moveTimer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "generate" || reducedMotion) return;
    setBtnClicked(true);
  }, [phase, reducedMotion]);

  const navDone = navClicked || phase !== "nav";
  const showLoader = phase === "generate";
  const showResults = phase === "display";
  const roleText = phase === "typing" ? typedRole : phase === "generate" || phase === "display" ? TARGET_ROLE : "";

  // Cursor target per act
  const cursorTarget: XY | null = coords
    ? phase === "nav"
      ? coords.nav
      : phase === "focus" || (phase === "typing" && !movedToBtn)
        ? coords.input
        : coords.btn
    : null;

  return (
    <DemoShell
      containerRef={containerRef}
      cardRef={cardRef}
      url={navDone ? "skillbridge.ai/roadmap-generator" : "skillbridge.ai/dashboard"}
      urlIcon={navDone ? GraduationCap : LayoutDashboard}
      activeItem={navDone ? "Learning Roadmaps" : "Dashboard"}
      sidebarItemRef={sidebarTargetRef}
      sidebarItemRefLabel="Learning Roadmaps"
      opacity={opacity}
      overlay={
        coords && cursorTarget && (
          <>
            <motion.div
              className="absolute z-40 pointer-events-none"
              initial={{ x: cardRef.current ? cardRef.current.clientWidth * 0.15 : 0, y: cardRef.current ? cardRef.current.clientHeight * 0.9 : 0, opacity: 0 }}
              animate={{
                x: cursorTarget.x,
                y: cursorTarget.y,
                opacity: showResults ? 0 : 1,
                scale: navClicked && phase === "nav" ? 0.82 : btnClicked && phase === "generate" ? 0.82 : 1,
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
            {inputClicked && phase === "focus" && <ClickRipple x={coords.input.x} y={coords.input.y} />}
            {btnClicked && phase === "generate" && <ClickRipple x={coords.btn.x} y={coords.btn.y} />}
          </>
        )
      }
    >
      {/* Main Content Area */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800">Learning Roadmap Generator</h4>
            <p className="text-[9px] text-slate-400 font-medium">Map out skills step-by-step to target any job role</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[9px] text-slate-400 font-bold">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>AI Engine 2.0</span>
          </div>
        </div>

        {/* Dynamic State Center */}
        <div className="relative my-auto py-4">
          {!showResults && (
            <motion.div
              animate={{ opacity: showLoader ? 0.25 : 1 }}
              className="max-w-md mx-auto space-y-4 text-center"
            >
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">What is your dream job?</div>
                <div
                  ref={inputRef}
                  className={cn(
                    "flex items-center gap-2 max-w-xs mx-auto border bg-slate-50/50 p-2.5 rounded-xl text-left h-10 transition-all",
                    inputClicked ? "border-blue-500 bg-white shadow-sm ring-2 ring-blue-50" : "border-slate-200"
                  )}
                >
                  <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className={cn(
                    "text-xs font-semibold select-none flex-1 truncate",
                    roleText ? "text-slate-800" : "text-slate-400"
                  )}>
                    {roleText || "e.g. Frontend Developer..."}
                  </span>
                  {phase === "typing" && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-0.5 h-3.5 bg-blue-500 inline-block"
                    />
                  )}
                </div>
              </div>

              <div
                ref={buttonRef}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-bold shadow-md shadow-blue-500/10 border border-blue-500/20 cursor-pointer select-none transition-all duration-300",
                  btnClicked ? "scale-95 brightness-90 shadow-none" : "hover:brightness-105"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Career Roadmap</span>
              </div>
            </motion.div>
          )}

          {showLoader && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
              <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-blue-600 animate-spin" />
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[9px] font-bold text-blue-600 mt-2.5 tracking-wider uppercase"
              >
                Analyzing Target Skillsets...
              </motion.p>
            </div>
          )}

          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-3"
            >
              {[
                {
                  title: "1. Core Foundation",
                  desc: "React Router, State & Hooks",
                  duration: "2-3 weeks",
                  icon: BookOpen,
                  status: "completed",
                  color: "border-emerald-100 bg-emerald-50/20 text-emerald-700",
                  badge: "bg-emerald-500"
                },
                {
                  title: "2. TypeScript & Styling",
                  desc: "TS Interfaces, Tailwind CSS",
                  duration: "3 weeks",
                  icon: Clock,
                  status: "learning",
                  color: "border-blue-100 bg-blue-50/20 text-blue-700",
                  badge: "bg-blue-600"
                },
                {
                  title: "3. Build & System Design",
                  desc: "API caching, Next.js optimization",
                  duration: "4 weeks",
                  icon: Lock,
                  status: "locked",
                  color: "border-slate-100 bg-slate-50/40 text-slate-400",
                  badge: "bg-slate-300"
                }
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.18, duration: 0.4, ease: "easeOut" }}
                  className={cn(
                    "border p-3 rounded-xl space-y-2.5 relative overflow-hidden flex flex-col justify-between min-h-[110px] transition-all",
                    step.color,
                    step.status === "learning" && "shadow-[0_4px_16px_rgba(37,99,235,0.06)] border-blue-300 ring-2 ring-blue-500/5 bg-white"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-tight">{step.title}</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", step.status === "completed" ? "bg-emerald-500" : step.status === "learning" ? "bg-blue-600 animate-pulse" : "bg-slate-300")} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight">{step.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[8px] font-semibold">
                    <step.icon className="w-3.5 h-3.5" />
                    <span>{step.duration}</span>
                    <span className={cn("ml-auto px-1.5 py-0.5 text-white font-bold rounded-md text-[6px] uppercase tracking-wider", step.badge)}>
                      {step.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Bottom AI Advice */}
        <div className={cn(
          "border p-3 rounded-xl flex items-center gap-3 transition-all duration-500 min-h-[56px]",
          !showResults
            ? "bg-slate-50 border-slate-100 text-slate-400"
            : "bg-gradient-to-r from-blue-500/[0.02] to-indigo-500/[0.02] border-blue-500/15 text-slate-700 shadow-[0_4px_20px_rgba(37,99,235,0.03)]"
        )}>
          <div className={cn(
            "w-7 h-7 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-500 p-1.5",
            !showResults
              ? "bg-slate-100 border-slate-200 text-slate-400"
              : "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
          )}>
            <Cpu className={cn("w-3.5 h-3.5", showLoader && "animate-spin")} />
          </div>
          <p className="text-xs leading-relaxed font-medium">
            {phase === "nav" && (
              <span className="italic text-slate-400">Ready - open Learning Roadmaps to map a curriculum for your dream role.</span>
            )}
            {(phase === "focus" || phase === "typing") && (
              <span className="italic text-slate-400">Select a target job position to generate a skill-focused curriculum.</span>
            )}
            {showLoader && (
              <span className="italic text-blue-500">Mapping job description requisites against learning node hierarchies...</span>
            )}
            {showResults && (
              <span className="text-slate-600">
                <span className="text-blue-600 font-bold">AI Advisor:</span> 9-week path generated from your skill gaps. Complete Phase 2 to unlock System Design.
              </span>
            )}
          </p>
        </div>
      </div>
    </DemoShell>
  );
}
