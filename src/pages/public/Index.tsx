import Layout from "@/components/layout/Layout";
import {
  ArrowRight, Zap, Layers, ChevronRight, FileText,
  Search, GraduationCap, Sparkles,
  Users, Briefcase, CheckCircle2
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import ParticleField from "@/components/shared/ParticleField";
import HeroDashboardDemo from "@/components/home/HeroDashboardDemo";
import HeroRoadmapDemo from "@/components/home/HeroRoadmapDemo";
import HeroInterviewDemo from "@/components/home/HeroInterviewDemo";
import MetricsStrip from "@/components/home/MetricsStrip";
import LogoMarquee from "@/components/home/LogoMarquee";
import CountUp from "@/components/shared/CountUp";
import { useTypewriter } from "@/hooks/useTypewriter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";



/* ─────────────────────────────────────────────
   Global keyframe styles injected once (Light Mode)
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    .font-display { 
      font-family: 'Outfit', sans-serif; 
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(0.5deg); }
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    /* Background blobs drift on the compositor thread (no JS per frame) */
    @keyframes blob-drift-a {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-20px) scale(1.05); }
    }
    @keyframes blob-drift-b {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(30px) scale(1.08); }
    }
    @media (prefers-reduced-motion: reduce) {
      .blob-a, .blob-b { animation: none !important; }
    }
    .blob-a { animation: blob-drift-a 15s ease-in-out infinite; }
    .blob-b { animation: blob-drift-b 18s ease-in-out 1s infinite; }

    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.2; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    .animate-pulse-ring { 
      animation: pulse-ring 2.5s ease-out infinite; 
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-shimmer {
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: shimmer 3s infinite;
    }

    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .animate-gradient {
      background-size: 200% 200%;
      animation: gradient-shift 4s ease infinite;
    }

    /* Voice equalizer bars — chỉ chạy khi hover panel phỏng vấn */
    @keyframes eq-bounce {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
    .eq-bar {
      animation: eq-bounce 0.9s ease-in-out infinite;
      animation-play-state: paused;
      transform-origin: bottom;
    }
    .group\\/voice:hover .eq-bar { animation-play-state: running; }
    /* Mobile/touch không có hover → equalizer luôn chạy cho sống động */
    @media (hover: none) {
      .eq-bar { animation-play-state: running; }
    }
  `}</style>
);

/* ─────────────────────────────────────────────
   Animation variants for scroll-reveal & stagger
───────────────────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};



/* ─────────────────────────────────────────────
   Bento cell graphic: AI examiner question types
   itself out when scrolled into view (runs once).
───────────────────────────────────────────── */
function ExaminerTypingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const { typed, done } = useTypewriter(
    '"Explain how you manage state optimization in large scale applications?"',
    18,
    isInView,
  );

  return (
    <p
      ref={ref}
      className="text-[11px] italic text-slate-600 font-medium leading-relaxed bg-slate-50/70 border border-slate-100 p-3 rounded-xl min-h-[60px] w-full"
    >
      {typed}
      {!done && (
        <span className="inline-block w-1 h-2.5 ml-0.5 bg-cyan-600 animate-pulse align-middle" />
      )}
    </p>
  );
}

/* ─────────────────────────────────────────────
   Main Export
───────────────────────────────────────────── */
export default function Index() {
  const { isAuthenticated, currentUser } = useAuthStore();
  const { t } = useTranslation("home");
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"cv" | "roadmap" | "interview">("cv");
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play loop to rotate between different feature demos
  useEffect(() => {
    if (!isAutoPlaying) return;

    const tabs: ("cv" | "roadmap" | "interview")[] = ["cv", "roadmap", "interview"];
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const nextIndex = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 18000); // 18 seconds switch to allow full simulation sequence to play

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Spotlight properties using Framer Motion values to prevent component-wide re-renders
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 35, stiffness: 60 });
  const springY = useSpring(mouseY, { damping: 35, stiffness: 60 });
  const spotlightX = useTransform(springX, (latest) => latest - 250);
  const spotlightY = useTransform(springY, (latest) => latest - 250);

  useEffect(() => {
    // Set initial position to center of screen
    mouseX.set(window.innerWidth / 2);
    mouseY.set(window.innerHeight / 2);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Logged-in users land in their app shell, not the marketing page.
  // (Placed AFTER all hooks — an early return above them breaks rules-of-hooks.)
  if (isAuthenticated && currentUser) {
    const dashboardPath =
      currentUser.role === "business" ? "/business"
      : currentUser.role === "mentor" ? "/mentor-dashboard"
      : currentUser.role === "admin" ? "/admin"
      : "/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <Layout hideFooter={true}>
      <GlobalStyles />

      <div
        ref={containerRef}
        className="relative min-h-dvh overflow-x-hidden bg-slate-50/50 text-slate-800 font-sans selection:bg-blue-500/20 selection:text-blue-900"
      >
        {/* Subtle background blur meshes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="blob-a will-change-transform absolute top-[2%] -left-24 h-[20rem] w-[20rem] rounded-full bg-blue-100/40 blur-[90px] sm:left-[10%] sm:h-[32rem] sm:w-[32rem] sm:blur-[100px]" />
          <div className="blob-b will-change-transform absolute top-[20%] -right-28 h-[22rem] w-[22rem] rounded-full bg-indigo-100/30 blur-[100px] sm:right-[5%] sm:h-[36rem] sm:w-[36rem] sm:blur-[120px]" />
          {/* Spotlight overlay using CSS properties linked directly to motion values */}
          <motion.div
            className="fixed h-[360px] w-[360px] rounded-full bg-blue-500/[0.02] blur-[100px] pointer-events-none z-10 will-change-transform sm:h-[500px] sm:w-[500px] sm:blur-[120px]"
            style={{
              left: 0,
              top: 0,
              x: spotlightX,
              y: spotlightY,
            }}
          />
          <ParticleField />
          
          {/* Hexagonal Mesh Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(59,130,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,241,0.3) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>

        <section className="relative min-h-[calc(100dvh-76px)] flex items-center px-4 pb-14 pt-24 sm:px-6 md:px-12 md:pb-24 md:pt-28 lg:px-16 max-w-[1600px] mx-auto z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center w-full">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 md:space-y-8">
              {/* Top Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-600 tracking-wider uppercase"
              >
                <Zap className="w-3.5 h-3.5 fill-blue-100" />
                {t("hero.badge")}
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="font-display text-[2.25rem] sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-extrabold tracking-tight leading-[1.14] sm:leading-[1.22] text-slate-900 [text-wrap:balance] break-words"
              >
                {t("hero.titleLead")}
                <span className="inline-block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 italic pr-1 animate-gradient">
                  {t("hero.titleSkills")}
                </span>
                <br className="hidden lg:inline" />
                <span className="inline-block sm:inline">
                  {t("hero.titleMid")}
                  <span className="inline-block whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 italic pr-1 animate-gradient">
                    {t("hero.titleDream")}
                  </span>
                </span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-base md:text-lg text-slate-500 leading-relaxed font-medium max-w-xl"
              >
                {t("hero.subtitle")}
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-full space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                  <Link to="/diagnosis" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group h-14 w-full rounded-xl px-6 text-base text-white font-bold overflow-hidden shadow-lg flex items-center justify-center gap-2 transition-transform sm:h-16 sm:w-auto sm:min-w-[200px] sm:rounded-2xl sm:px-8"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                        boxShadow: "0 10px 30px -5px rgba(37,99,235,0.3)"
                      }}
                    >
                      <span className="animate-shimmer absolute inset-0" />
                      <span className="relative flex items-center justify-center gap-2">
                        <Search className="w-5 h-5" />
                        {t("hero.ctaScan")}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </motion.button>
                  </Link>

                  <Link to="/diagnosis?mode=builder" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group h-14 w-full rounded-xl px-6 text-base font-bold border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2 text-slate-700 shadow-sm sm:h-16 sm:w-auto sm:min-w-[200px] sm:rounded-2xl sm:px-8"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
                      {t("hero.ctaBuild")}
                    </motion.button>
                  </Link>
                </div>
                <p className="text-xs text-slate-400 font-semibold">
                  {t("hero.helper")}
                </p>
              </motion.div>
            </div>

            {/* Right Column: Hero Demos Showcase with interactive switching tabs */}
            <div className="lg:col-span-7 w-full flex flex-col items-center gap-6">
              {/* Tab Selector (Premium Floating Glassmorphism design) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative z-30 inline-flex w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200/50 bg-white/70 p-1 shadow-sm backdrop-blur-md sm:w-auto"
              >
                {[
                  { id: "cv", label: t("hero.tabs.cv"), icon: FileText },
                  { id: "roadmap", label: t("hero.tabs.roadmap"), icon: GraduationCap },
                  { id: "interview", label: t("hero.tabs.interview"), icon: Search },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as "cv" | "roadmap" | "interview");
                        setIsAutoPlaying(false); // Stop autoplay on user click
                      }}
                      className={cn(
                        "relative flex shrink-0 items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 select-none",
                        isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-hero-tab"
                          className="absolute inset-0 bg-blue-50/70 border border-blue-100/50 rounded-xl -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                      <span className="whitespace-nowrap">{tab.label}</span>
                    </button>
                  );
                })}
              </motion.div>

              {/* Demo Showcase Container with smooth exit/enter animations */}
              <div className="w-full min-h-[360px] sm:min-h-[420px] flex justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    {activeTab === "cv" && <HeroDashboardDemo />}
                    {activeTab === "roadmap" && <HeroRoadmapDemo />}
                    {activeTab === "interview" && <HeroInterviewDemo />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          </div>
        </section>

        {/* Logo Marquee & Metrics Strip Section */}
        <div className="relative z-10 space-y-16 pb-16">
          <LogoMarquee />
          <MetricsStrip />
        </div>

        {/* ══════════════════════════════════════
            JOURNEY SECTION (How It Works Redesign)
            ══════════════════════════════════════ */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="relative px-4 py-16 sm:px-6 sm:py-20 lg:py-28 z-10 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-14 space-y-4 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold tracking-widest text-blue-600 uppercase">
              <Layers className="w-3.5 h-3.5" />
              {t("journey.badge")}
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t("journey.title")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base font-medium leading-relaxed">
              {t("journey.subtitle")}
            </p>
          </div>

          {/* 3 Chapters Zigzag — landing-grade: màu identity/chương + watermark số + panel glow */}
          <div className="relative space-y-20 lg:space-y-32">

            {/* Chapter 01: CV — identity BLUE */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Text Left */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {t("journey.s1Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s1Title")}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md font-medium">
                  {t("journey.s1Desc")}
                </p>
                <div className="pt-2">
                  <Link
                    to="/diagnosis"
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white border border-blue-200 text-blue-700 text-sm font-bold shadow-sm hover:bg-blue-50 hover:shadow transition-all duration-300 active:scale-[0.98] group/link"
                  >
                    {t("journey.s1Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Graphic Right — INTERACTIVE: stack 3 CV xòe quạt khi hover (khôi phục từ process cũ) */}
              <div className="lg:col-span-6 relative flex items-center justify-center group/stack">
                <span aria-hidden className="pointer-events-none select-none absolute -top-14 -right-2 font-display font-black text-[120px] lg:text-[150px] leading-none text-transparent bg-clip-text bg-gradient-to-b from-blue-100 to-transparent z-0">
                  01
                </span>
                {/* Glow nền theo identity */}
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-200/25 blur-3xl sm:h-[340px] sm:w-[340px]" />

                <div className="relative z-10 flex h-[340px] w-full max-w-[290px] items-center justify-center select-none sm:h-[360px] sm:max-w-[320px] md:h-[400px] md:max-w-[340px]">
                  {/* CV nền trái — xòe ra khi hover */}
                  <div className="absolute h-[320px] w-[220px] -translate-x-[28px] translate-y-[14px] -rotate-[6deg] rounded-2xl border border-slate-100 bg-white p-4 opacity-50 shadow-[0_4px_20px_rgba(15,23,42,0.05)] scale-[0.9] transition-all duration-500 ease-out sm:h-[350px] sm:w-[250px] sm:-translate-x-[40px] sm:p-5 sm:group-hover/stack:-translate-x-[68px] sm:group-hover/stack:-rotate-[13deg] sm:group-hover/stack:translate-y-[22px] sm:group-hover/stack:opacity-70">
                    <div className="w-10 h-10 rounded-full bg-slate-100 mb-4" />
                    <div className="h-4 w-2/3 bg-slate-100 rounded-md mb-6" />
                    <div className="space-y-3">
                      <div className="h-2.5 w-full bg-slate-50 rounded" />
                      <div className="h-2.5 w-5/6 bg-slate-50 rounded" />
                      <div className="h-2.5 w-4/5 bg-slate-50 rounded" />
                      <div className="h-2.5 w-full bg-slate-50 rounded" />
                    </div>
                  </div>

                  {/* CV nền phải */}
                  <div className="absolute h-[320px] w-[220px] translate-x-[28px] translate-y-[20px] rotate-[6deg] rounded-2xl border border-slate-100 bg-white p-4 opacity-50 shadow-[0_4px_20px_rgba(15,23,42,0.05)] scale-[0.85] transition-all duration-500 ease-out sm:h-[350px] sm:w-[250px] sm:translate-x-[40px] sm:p-5 sm:group-hover/stack:translate-x-[68px] sm:group-hover/stack:rotate-[13deg] sm:group-hover/stack:translate-y-[28px] sm:group-hover/stack:opacity-70">
                    <div className="h-4 w-1/2 bg-slate-100 rounded-md mb-6" />
                    <div className="space-y-3">
                      <div className="h-2.5 w-full bg-slate-50 rounded" />
                      <div className="h-2.5 w-full bg-slate-50 rounded" />
                      <div className="h-2.5 w-3/4 bg-slate-50 rounded" />
                      <div className="h-2.5 w-5/6 bg-slate-50 rounded" />
                    </div>
                  </div>

                  {/* CV CHÍNH — đã được AI chấm */}
                  <div className="absolute z-10 h-[350px] w-[246px] rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all duration-500 ease-out sm:h-[375px] sm:w-[270px] sm:p-6 sm:group-hover/stack:-translate-y-2.5 sm:group-hover/stack:scale-[1.04] sm:group-hover/stack:shadow-[0_30px_60px_rgba(37,99,235,0.15)]">
                    {/* Score chip */}
                    <div className="absolute -right-2 -top-3.5 z-20 flex h-11 w-11 flex-col items-center justify-center rounded-full border-2 border-[#DCE9D7] bg-white shadow-[0_6px_16px_rgba(15,23,42,0.1)] sm:-right-3.5 sm:h-12 sm:w-12">
                      <span className="font-mono tabular-nums text-sm font-extrabold text-[#346538] leading-none">94</span>
                      <span className="text-[7px] font-bold text-slate-400 leading-none mt-0.5">/100</span>
                    </div>
                    {/* ATS pill */}
                    <div className="absolute -left-1 -top-3 z-20 flex items-center gap-1 rounded-full border border-[#DCE9D7] bg-[#EDF3EC] px-2 py-1 shadow-sm sm:-left-2 sm:px-2.5">
                      <CheckCircle2 className="w-3 h-3 text-[#346538]" />
                      <span className="text-[9px] font-bold text-[#346538] whitespace-nowrap">{t("journey.atsPill")}</span>
                    </div>
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">LA</div>
                      <div>
                        <div className="h-3.5 w-24 bg-slate-900 rounded-sm mb-1" />
                        <div className="h-2 w-16 bg-slate-400 rounded-sm" />
                      </div>
                    </div>
                    {/* Body */}
                    <div className="space-y-4">
                      <div>
                        <div className="h-2 w-1/3 bg-blue-600/20 rounded-sm mb-2" />
                        <div className="space-y-1.5">
                          <div className="h-2 w-full bg-slate-100 rounded-sm" />
                          <div className="h-2 w-11/12 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                      <div>
                        <div className="h-2 w-1/4 bg-blue-600/20 rounded-sm mb-2" />
                        <div className="space-y-1.5">
                          <div className="h-2 w-full bg-slate-100 rounded-sm" />
                          <div className="h-2 w-5/6 bg-slate-100 rounded-sm" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <div className="h-2 w-1/4 bg-blue-600/20 rounded-sm mb-2" />
                        <div className="flex flex-wrap gap-1.5">
                          <span className="h-5 px-2 rounded-md bg-blue-50/60 border border-blue-100/40 text-[9px] font-bold text-blue-600 flex items-center justify-center">React</span>
                          <span className="h-5 px-2 rounded-md bg-indigo-50/60 border border-indigo-100/40 text-[9px] font-bold text-indigo-600 flex items-center justify-center">TypeScript</span>
                          <span className="h-5 px-2 rounded-md bg-slate-50 border border-slate-100/50 text-[9px] font-bold text-slate-500 flex items-center justify-center">Tailwind</span>
                        </div>
                      </div>
                      {/* Match bar */}
                      <div className="pt-3 mt-1 border-t border-slate-100 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-[#F1F1EF] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                            className="h-full w-[94%] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full origin-left"
                          />
                        </div>
                        <span className="text-[9px] font-mono tabular-nums font-bold text-blue-600 shrink-0">94%</span>
                      </div>
                    </div>
                  </div>

                  {/* Floating chip gap */}
                  <div className="animate-float absolute bottom-2 left-0 z-20 flex max-w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-full border border-red-100 bg-white px-3 py-1.5 shadow-[0_10px_24px_-8px_rgba(239,68,68,0.35)] sm:-left-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-red-500">Gap: 2 skills</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter 02: Roadmap (Zigzag: Text Right, Graphic Left) — identity INDIGO */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Graphic Left (visual first) */}
              <div className="lg:col-span-6 lg:order-1 relative flex items-center justify-center group/road">
                <span aria-hidden className="pointer-events-none select-none absolute -top-14 -left-2 font-display font-black text-[120px] lg:text-[150px] leading-none text-transparent bg-clip-text bg-gradient-to-b from-indigo-100 to-transparent z-0">
                  02
                </span>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/25 blur-3xl sm:h-[320px] sm:w-[320px]" />

                {/* Card lộ trình — HOVER ĐỂ MỞ KHOÁ node 3 */}
                <div className="relative z-10 w-full max-w-[min(100%,340px)] rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all duration-500 sm:p-6 sm:group-hover/road:-translate-y-2 sm:group-hover/road:scale-[1.03] sm:group-hover/road:shadow-[0_30px_60px_rgba(99,102,241,0.18)]">
                  {/* Node 1 — done */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="min-w-0 truncate text-xs font-bold text-slate-700 line-through decoration-emerald-300">TypeScript Principles</span>
                  </div>
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="ml-3 h-4 w-px bg-indigo-200 origin-top"
                  />
                  {/* Node 2 — đang học */}
                  <motion.div
                    initial={{ opacity: 0.35 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]">2</div>
                    <span className="min-w-0 truncate text-xs font-bold text-slate-800">CI/CD Pipeline Setup</span>
                    <span className="ml-auto shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-[9px] font-bold text-indigo-500">65%</span>
                  </motion.div>
                  {/* Connector mọc dài khi hover */}
                  <div className="ml-3 h-4 w-px bg-slate-200 origin-top transition-all duration-500 group-hover/road:bg-indigo-300" />
                  {/* Node 3 — khoá → MỞ khi hover */}
                  <div className="flex min-w-0 items-center gap-3 opacity-40 transition-all duration-500 group-hover/road:opacity-100">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-500 group-hover/road:bg-indigo-100 group-hover/road:text-indigo-600 group-hover/road:shadow-[0_0_0_4px_rgba(99,102,241,0.1)]">3</div>
                    <span className="min-w-0 truncate text-xs font-bold text-slate-500 transition-colors duration-500 group-hover/road:text-slate-800">System Design Basics</span>
                    <span className="ml-auto shrink-0 text-[9px] font-bold text-slate-300 transition-all duration-500 group-hover/road:text-indigo-400">{"unlocked ->"}</span>
                  </div>
                </div>

                {/* Floating chip */}
                <div className="animate-float absolute right-0 top-6 z-20 flex max-w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1.5 shadow-[0_10px_24px_-8px_rgba(99,102,241,0.35)] sm:right-2">
                  <Zap className="w-3 h-3 text-indigo-500 fill-indigo-100" />
                  <span className="text-[10px] font-bold text-indigo-600">20/80 focus</span>
                </div>
              </div>

              {/* Text Right */}
              <div className="lg:col-span-6 lg:order-2 space-y-5">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {t("journey.s2Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s2Title")}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md font-medium">
                  {t("journey.s2Desc")}
                </p>
                <div className="pt-2">
                  <Link
                    to="/learning"
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white border border-indigo-200 text-indigo-700 text-sm font-bold shadow-sm hover:bg-indigo-50 hover:shadow transition-all duration-300 active:scale-[0.98] group/link"
                  >
                    {t("journey.s2Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Chapter 03: Interview — identity CYAN */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Text Left */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600 text-[10px] font-bold uppercase tracking-[0.14em]">
                  {t("journey.s3Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s3Title")}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md font-medium">
                  {t("journey.s3Desc")}
                </p>
                <div className="pt-2">
                  <Link
                    to="/interview"
                    className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white border border-cyan-200 text-cyan-700 text-sm font-bold shadow-sm hover:bg-cyan-50 hover:shadow transition-all duration-300 active:scale-[0.98] group/link"
                  >
                    {t("journey.s3Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Graphic Right — HOVER: equalizer giọng nói chạy */}
              <div className="lg:col-span-6 relative flex items-center justify-center group/voice">
                <span aria-hidden className="pointer-events-none select-none absolute -top-14 -right-2 font-display font-black text-[120px] lg:text-[150px] leading-none text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-transparent z-0">
                  03
                </span>
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200/25 blur-3xl sm:h-[320px] sm:w-[320px]" />

                {/* Phòng phỏng vấn AI */}
                <div className="relative z-10 w-full max-w-[min(100%,340px)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] transition-all duration-500 sm:group-hover/voice:-translate-y-2 sm:group-hover/voice:scale-[1.03] sm:group-hover/voice:shadow-[0_30px_60px_rgba(6,182,212,0.18)]">
                  {/* Title bar kiểu cửa sổ app */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Examiner</span>
                    </div>
                    <span className="shrink-0 rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-600">REC 02:14</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <ExaminerTypingPreview />
                    {/* Voice equalizer — chạy khi hover */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-end gap-[3px] h-6">
                        {[0.5, 0.9, 0.65, 1, 0.45, 0.8, 0.6].map((h, i) => (
                          <span
                            key={i}
                            className="eq-bar w-[3px] rounded-full bg-gradient-to-t from-cyan-500 to-blue-400"
                            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        <span className="hidden group-hover/voice:inline text-cyan-600">Listening...</span>
                        <span className="group-hover/voice:hidden">Hover to answer</span>
                      </span>
                      <div className="ml-auto flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-400">
                        <span className="text-emerald-600">8.5</span>/10
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating chip */}
                <div className="animate-float absolute bottom-2 right-0 z-20 flex max-w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-full border border-cyan-100 bg-white px-3 py-1.5 shadow-[0_10px_24px_-8px_rgba(6,182,212,0.35)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-cyan-700">Voice / Realtime</span>
                </div>
              </div>
            </div>

          </div>
        </motion.section>

        {/* ══════════════════════════════════════
            ECOSYSTEM SECTION
            ══════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative px-4 pb-16 sm:px-6 sm:pb-20 lg:pb-28 z-10 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12 space-y-3 sm:mb-16">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t("eco.title")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-xs md:text-sm font-medium leading-relaxed">
              {t("eco.subtitle")}
            </p>
          </div>

          {/* Grid 2 Cards */}
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:gap-8">
            {/* Card Mentor — identity EMERALD, gradient wash + avatar row */}
            <div className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[1.5rem] border border-emerald-100/70 bg-gradient-to-br from-emerald-50/80 via-white to-white p-5 shadow-[0_20px_48px_-34px_rgba(16,185,129,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(16,185,129,0.45)] sm:rounded-[1.75rem] sm:p-8">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 min-w-0 space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {t("eco.mentorTitle")}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {t("eco.mentorDesc")}
                </p>
                {/* Avatar row — artwork */}
                <div className="flex items-center pt-1">
                  <div className="flex -space-x-2.5">
                    {[
                      { ch: "M", cls: "from-emerald-500 to-teal-400" },
                      { ch: "T", cls: "from-blue-500 to-cyan-400" },
                      { ch: "H", cls: "from-indigo-500 to-violet-400" },
                    ].map((a) => (
                      <div key={a.ch} className={cn("w-8 h-8 rounded-full bg-gradient-to-br border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm", a.cls)}>
                        {a.ch}
                      </div>
                    ))}
                  </div>
                  <span className="ml-3 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">+24</span>
                </div>
              </div>
              <div className="pt-6 relative z-10">
                <Link
                  to="/ecosystem"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-white px-5 text-sm font-bold text-emerald-700 shadow-sm transition-all duration-300 hover:bg-emerald-50 hover:shadow active:scale-[0.98] sm:w-auto"
                >
                  {t("eco.mentorCta")}
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* Card Jobs — identity SKY, gradient wash + job chips */}
            <div className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[1.5rem] border border-sky-100/70 bg-gradient-to-br from-sky-50/80 via-white to-white p-5 shadow-[0_20px_48px_-34px_rgba(14,165,233,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(14,165,233,0.45)] sm:rounded-[1.75rem] sm:p-8">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-200/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 min-w-0 space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-sky-100/80 border border-sky-200/60 flex items-center justify-center text-sky-700 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {t("eco.jobsTitle")}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {t("eco.jobsDesc")}
                </p>
                {/* Job chips — artwork */}
                <div className="flex flex-col gap-2 pt-1">
                  {[
                    { title: "Frontend Intern - HCMC", match: 86 },
                    { title: "Fresher Backend - Remote", match: 78 },
                  ].map((j) => (
                    <div key={j.title} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                      <span className="min-w-0 truncate text-[11px] font-bold text-slate-700">{j.title}</span>
                      <span className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-sky-700">{j.match}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-6 relative z-10">
                <Link
                  to="/jobs"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-white px-5 text-sm font-bold text-sky-700 shadow-sm transition-all duration-300 hover:bg-sky-50 hover:shadow active:scale-[0.98] sm:w-auto"
                >
                  {t("eco.jobsCta")}
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════
            MEASURED OUTCOMES — quantified-results band
            ══════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative px-4 pb-16 sm:px-6 sm:pb-20 z-10 max-w-7xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 px-5 py-12 text-center shadow-[0_24px_52px_-24px_rgba(37,99,235,0.35)] sm:rounded-[2.5rem] sm:px-8 sm:py-14 md:px-16 md:py-16">
            {/* Soft glow accents */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-300/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-blue-100 tracking-widest uppercase">
                {t("moat.badge")}
              </div>
              <h2 className="break-words font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl md:text-5xl">
                {t("moat.title1")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
                  {t("moat.title2")}
                </span>
              </h2>
              <p className="text-blue-100/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto">
                {t("moat.body1")}
                <span className="font-bold text-white">
                  <CountUp to={94} suffix="%" />
                  {t("moat.body2")}
                </span>
                {t("moat.body3")}
                <span className="font-bold text-white">{t("moat.jds")}</span>
                {t("moat.body4")}
              </p>

              <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
                <Link to="/diagnosis" className="w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 text-sm font-black text-blue-700 shadow-lg transition-shadow hover:shadow-xl sm:w-auto sm:px-9"
                  >
                    {t("hero.ctaScan")} <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <span className="text-[11px] text-blue-200/80 font-semibold">
                  {t("moat.note")}
                </span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Divider and spacer before footer */}
        <div className="py-8" />

        {/* ══════════════════════════════════════
            CUSTOM LIGHT FOOTER
            ══════════════════════════════════════ */}
        <footer className="relative z-10 border-t border-slate-100 bg-white px-4 py-12 sm:px-6">
          {/* Tasteskill T3: footer chỉ giữ link có đích thật — không href="#" giả vờ.
              Privacy/Terms quay lại khi có trang pháp lý (backlog legal). */}
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="font-display font-black text-xs text-white">S</span>
                </div>
                <span className="font-display font-black text-lg text-slate-800 leading-none tracking-tight">SkillBridge</span>
              </div>
              <p className="break-words text-xs font-medium leading-relaxed text-slate-400">
                {t("footer.tagline")}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-4">{t("footer.product")}</h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                <li><Link to="/diagnosis" className="hover:text-blue-600 transition-colors">{t("footer.linkDiagnosis")}</Link></li>
                <li><Link to="/learning" className="hover:text-blue-600 transition-colors">{t("footer.linkRoadmap")}</Link></li>
                <li><Link to="/interview" className="hover:text-blue-600 transition-colors">{t("footer.linkInterview")}</Link></li>
                <li><Link to="/ecosystem" className="hover:text-blue-600 transition-colors">{t("footer.linkMentor")}</Link></li>
                <li><Link to="/pricing" className="hover:text-blue-600 transition-colors">{t("footer.linkPricing")}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-4">{t("footer.company")}</h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                <li><Link to="/about" className="hover:text-blue-600 transition-colors">{t("footer.linkAbout")}</Link></li>
                <li><Link to="/ecosystem" className="hover:text-blue-600 transition-colors">{t("footer.linkEcosystem")}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-7xl border-t border-slate-100 pt-8 text-xs font-semibold text-slate-400">
            <p className="break-words">{t("footer.rights")}</p>
          </div>
        </footer>

      </div>
    </Layout>
  );
}
