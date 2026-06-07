import Layout from "@/components/layout/Layout";
import {
  ArrowRight, Zap, Layers, ChevronRight, FileText,
  Search, GraduationCap, Sparkles,
  Users, Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
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
    <div
      ref={ref}
      className="w-full md:w-60 mt-6 md:mt-0 border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-3"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Examiner</span>
      </div>
      <p className="text-[10px] italic text-slate-600 font-medium leading-relaxed bg-white border border-slate-100 p-2.5 rounded-lg min-h-[56px]">
        {typed}
        {!done && (
          <span className="inline-block w-1 h-2.5 ml-0.5 bg-cyan-600 animate-pulse align-middle" />
        )}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Export
───────────────────────────────────────────── */
export default function Index() {
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

  return (
    <Layout hideFooter={true}>
      <GlobalStyles />

      <div
        ref={containerRef}
        className="relative min-h-screen overflow-x-hidden bg-slate-50/50 text-slate-800 font-sans selection:bg-blue-500/20 selection:text-blue-900"
      >
        {/* Subtle background blur meshes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="blob-a will-change-transform absolute top-[2%] left-[10%] w-[32rem] h-[32rem] bg-blue-100/40 rounded-full blur-[100px]" />
          <div className="blob-b will-change-transform absolute top-[20%] right-[5%] w-[36rem] h-[36rem] bg-indigo-100/30 rounded-full blur-[120px]" />
          {/* Spotlight overlay using CSS properties linked directly to motion values */}
          <motion.div
            className="fixed w-[500px] h-[500px] rounded-full blur-[120px] bg-blue-500/[0.02] pointer-events-none z-10 will-change-transform"
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

        <section className="relative min-h-[calc(100vh-76px)] flex items-center pt-24 pb-20 md:pt-28 md:pb-24 px-6 md:px-12 lg:px-16 max-w-[1536px] mx-auto z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
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
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[3.5rem] xl:text-[4rem] font-extrabold tracking-tight leading-[1.22] text-slate-900 [text-wrap:balance]"
              >
                {t("hero.titleLead")}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 italic pr-1 animate-gradient whitespace-nowrap">
                  {t("hero.titleSkills")}
                </span>
                {t("hero.titleMid")}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 italic pr-1 animate-gradient whitespace-nowrap">
                  {t("hero.titleDream")}
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
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link to="/diagnosis">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative group h-16 rounded-2xl px-8 text-base text-white font-bold overflow-hidden shadow-lg flex items-center justify-center gap-2 min-w-[200px] transition-transform"
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

                  <Link to="/diagnosis?mode=builder">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group h-16 rounded-2xl px-8 text-base font-bold border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2 text-slate-700 shadow-sm min-w-[200px]"
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
                className="inline-flex p-1 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/50 shadow-sm relative z-30 overflow-hidden"
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
                        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 select-none",
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
                      <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-600" : "text-slate-400")} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </motion.div>

              {/* Demo Showcase Container with smooth exit/enter animations */}
              <div className="w-full min-h-[420px] flex justify-center items-center">
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
          className="relative px-6 py-20 lg:py-28 z-10 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-20 space-y-4">
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

          {/* 3 Chapters Zigzag */}
          <div className="relative space-y-16">
            
            {/* Chapter 01: CV */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-b border-dashed border-slate-200/60 pb-16">
              {/* Text Left */}
              <div className="lg:col-span-6 space-y-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#787774] mb-3">
                  {t("journey.s1Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s1Title")}
                </h3>
                <p className="text-sm text-[#787774] leading-relaxed max-w-md font-medium">
                  {t("journey.s1Desc")}
                </p>
                <div className="pt-2">
                  <Link 
                    to="/diagnosis" 
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/link"
                  >
                    {t("journey.s1Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Graphic Right */}
              <div className="lg:col-span-6 flex items-center justify-center">
                <div className="w-full max-w-sm bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex items-center justify-center">
                  {/* Clean UI Graphic — score card 84% + rows */}
                  <div className="w-full max-w-[260px] bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500">CV Score</span>
                      <span className="text-emerald-600"><CountUp to={84} suffix="%" /></span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { skill: "TypeScript", verdict: "Match", color: "text-emerald-600" },
                        { skill: "Kubernetes", verdict: "Missing", color: "text-red-500" },
                        { skill: "System Design", verdict: "Missing", color: "text-red-500" },
                      ].map((row, idx) => (
                        <motion.div
                          key={row.skill}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + idx * 0.2, duration: 0.4 }}
                          className="flex justify-between text-[9px] text-slate-400 font-semibold"
                        >
                          <span>{row.skill}</span>
                          <span className={row.color}>{row.verdict}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapter 02: Roadmap (Zigzag: Text Right, Graphic Left) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-b border-dashed border-slate-200/60 pb-16">
              {/* Graphic Left (visual first) */}
              <div className="lg:col-span-6 lg:order-1 flex items-center justify-center">
                <div className="w-full max-w-sm bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex items-center justify-center">
                  {/* Roadmap node preview */}
                  <div className="w-full max-w-[260px] p-2 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0">1</div>
                      <span className="text-xs font-bold text-slate-700">TypeScript Principles</span>
                    </div>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="ml-2.5 h-3.5 w-px bg-indigo-200 origin-top"
                    />
                    <motion.div
                      initial={{ opacity: 0.35 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7, duration: 0.5 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">2</div>
                      <span className="text-xs font-bold text-slate-700">CI/CD Pipeline Setup</span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Text Right */}
              <div className="lg:col-span-6 lg:order-2 space-y-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#787774] mb-3">
                  {t("journey.s2Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s2Title")}
                </h3>
                <p className="text-sm text-[#787774] leading-relaxed max-w-md font-medium">
                  {t("journey.s2Desc")}
                </p>
                <div className="pt-2">
                  <Link 
                    to="/learning" 
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/link"
                  >
                    {t("journey.s2Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Chapter 03: Interview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Text Left */}
              <div className="lg:col-span-6 space-y-5">
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#787774] mb-3">
                  {t("journey.s3Eyebrow")}
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  {t("journey.s3Title")}
                </h3>
                <p className="text-sm text-[#787774] leading-relaxed max-w-md font-medium">
                  {t("journey.s3Desc")}
                </p>
                <div className="pt-2">
                  <Link 
                    to="/interview" 
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/link"
                  >
                    {t("journey.s3Cta")}
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              {/* Graphic Right */}
              <div className="lg:col-span-6 flex items-center justify-center">
                <div className="w-full max-w-sm bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-sm flex items-center justify-center">
                  <ExaminerTypingPreview />
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
          className="relative px-6 pb-20 lg:pb-28 z-10 max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-16 space-y-3">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t("eco.title")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-xs md:text-sm font-medium leading-relaxed">
              {t("eco.subtitle")}
            </p>
          </div>

          {/* Grid 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Card Mentor */}
            <div className="bg-white border border-[#EAEAEA] rounded-2xl p-8 shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EC] flex items-center justify-center text-[#2e7d32] shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {t("eco.mentorTitle")}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {t("eco.mentorDesc")}
                </p>
              </div>
              <div className="pt-6">
                <Link to="/ecosystem">
                  <motion.span
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {t("eco.mentorCta")}
                    <ChevronRight className="w-4 h-4" />
                  </motion.span>
                </Link>
              </div>
            </div>

            {/* Card Jobs */}
            <div className="bg-white border border-[#EAEAEA] rounded-2xl p-8 shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-slate-300 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[#E1F3FE] flex items-center justify-center text-[#0288d1] shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  {t("eco.jobsTitle")}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {t("eco.jobsDesc")}
                </p>
              </div>
              <div className="pt-6">
                <Link to="/jobs">
                  <motion.span
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {t("eco.jobsCta")}
                    <ChevronRight className="w-4 h-4" />
                  </motion.span>
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
          className="relative px-6 pb-20 z-10 max-w-7xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 px-8 py-14 md:px-16 md:py-16 text-center shadow-[0_30px_60px_-15px_rgba(37,99,235,0.35)]">
            {/* Soft glow accents */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-300/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-blue-100 tracking-widest uppercase">
                {t("moat.badge")}
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
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

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link to="/diagnosis">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="h-14 rounded-2xl px-9 bg-white text-blue-700 text-sm font-black flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
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
        <footer className="relative bg-white border-t border-slate-100 py-12 px-6 z-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="font-display font-black text-xs text-white">S</span>
                </div>
                <span className="font-display font-black text-lg text-slate-800 leading-none tracking-tight">SkillBridge</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                {t("footer.tagline")}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-4">{t("footer.product")}</h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                <li><Link to="/diagnosis" className="hover:text-blue-600 transition-colors">{t("footer.linkDiagnosis")}</Link></li>
                <li><Link to="/learning" className="hover:text-blue-600 transition-colors">{t("footer.linkRoadmap")}</Link></li>
                <li><Link to="/interview" className="hover:text-blue-600 transition-colors">{t("footer.linkInterview")}</Link></li>
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkMentor")}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-4">{t("footer.company")}</h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkAbout")}</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkStats")}</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkTestimonials")}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-4">{t("footer.support")}</h4>
              <ul className="space-y-2 text-xs text-slate-500 font-semibold">
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkHelp")}</a></li>
                <li><a href="#" onClick={(e) => e.preventDefault()} className="hover:text-blue-600 transition-colors">{t("footer.linkCommunity")}</a></li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto border-t border-slate-100 mt-12 pt-8 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <p>{t("footer.rights")}</p>
            <div className="flex gap-4">
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-500 transition-colors">{t("footer.privacy")}</a>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-500 transition-colors">{t("footer.terms")}</a>
            </div>
          </div>
        </footer>

      </div>
    </Layout>
  );
}
