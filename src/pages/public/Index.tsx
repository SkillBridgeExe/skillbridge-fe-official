import Layout from "@/components/layout/Layout";
import {
  ArrowRight, Zap, Layers, ChevronRight, FileText,
  Search, GraduationCap, Sparkles, CheckCircle2
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
import AssessmentShowcase from "@/components/home/AssessmentShowcase";
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const }
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

        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="relative px-6 py-16 z-10 max-w-7xl mx-auto"
        >
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold tracking-widest text-blue-600 uppercase">
              <Layers className="w-3.5 h-3.5" />
              {t("bento.badge")}
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t("bento.title")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm md:text-base font-medium">
              {t("bento.subtitle")}
            </p>
          </div>

          {/* Asymmetric Bento Grid (No floating stickers, clean UI mockups instead) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Cell 1: Diagnosis (Span 2 col) */}
            <motion.div 
              variants={cardVariants}
              className="md:col-span-2 border border-slate-100 bg-white rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300 min-h-[300px] shadow-sm hover:shadow-md"
            >
              <div className="space-y-4 max-w-[60%] z-10">
                <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">{t("bento.diagEyebrow")}</div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">{t("bento.diagTitle")}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {t("bento.diagDesc")}
                </p>
                <Link to="/diagnosis" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 pt-2 hover:text-blue-700 transition-colors">
                  {t("bento.diagCta")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {/* Clean UI Graphic — rows tick in one by one, as if being scored live */}
              <div className="w-full md:w-56 mt-6 md:mt-0 bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 shadow-inner">
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
                      transition={{ delay: 0.5 + idx * 0.25, duration: 0.4 }}
                      className="flex justify-between text-[9px] text-slate-400 font-semibold"
                    >
                      <span>{row.skill}</span>
                      <span className={row.color}>{row.verdict}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="absolute right-0 top-0 w-48 h-48 bg-blue-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            </motion.div>

            {/* Cell 2: Learning Roadmaps (Span 1 col) */}
            <motion.div 
              variants={cardVariants}
              className="border border-slate-100 bg-white rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300 min-h-[300px] shadow-sm hover:shadow-md"
            >
              <div className="space-y-4 z-10">
                <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{t("bento.roadmapEyebrow")}</div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">{t("bento.roadmapTitle")}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {t("bento.roadmapDesc")}
                </p>
              </div>

              {/* Roadmap nodes unlock in sequence when scrolled into view */}
              <div className="mt-4 pt-4 border-t border-slate-100 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">1</div>
                  <span className="text-xs font-bold text-slate-700">TypeScript Principles</span>
                </div>
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="ml-2.5 h-3 w-px bg-indigo-200 origin-top"
                />
                <motion.div
                  initial={{ opacity: 0.35 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">2</div>
                  <span className="text-xs font-bold text-slate-700">CI/CD Pipeline Setup</span>
                </motion.div>
              </div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/[0.01] rounded-full blur-2xl pointer-events-none" />
            </motion.div>

            {/* Cell 3: Mock Interview (Span 2 col) */}
            <motion.div 
              variants={cardVariants}
              className="md:col-span-2 border border-slate-100 bg-white rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden group hover:border-cyan-500/20 transition-all duration-300 min-h-[300px] shadow-sm hover:shadow-md"
            >
              <div className="space-y-4 max-w-[60%] z-10">
                <div className="text-xs text-cyan-600 font-bold uppercase tracking-wider">{t("bento.interviewEyebrow")}</div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">{t("bento.interviewTitle")}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {t("bento.interviewDesc")}
                </p>
                <Link to="/interview" className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 pt-2 hover:text-cyan-700 transition-colors">
                  {t("bento.interviewCta")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Simulator preview — question types itself out on scroll */}
              <ExaminerTypingPreview />
              <div className="absolute left-0 bottom-0 w-48 h-48 bg-cyan-500/[0.01] rounded-full blur-3xl pointer-events-none" />
            </motion.div>

            {/* Cell 4: CV Builder (Span 1 col) */}
            <motion.div 
              variants={cardVariants}
              className="border border-slate-100 bg-white rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300 min-h-[300px] shadow-sm hover:shadow-md"
            >
              <div className="space-y-4 z-10">
                <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">{t("bento.builderEyebrow")}</div>
                <h3 className="text-2xl font-bold text-slate-900 font-display">{t("bento.builderTitle")}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  {t("bento.builderDesc")}
                </p>
              </div>

              {/* Clean CV Builder Node Preview */}
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 z-10">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">ATS Template Selected</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 1.1, ease: "easeOut" }}
                    className="h-full w-[70%] bg-emerald-500 rounded-full origin-left"
                  />
                </div>
              </div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-500/[0.01] rounded-full blur-2xl pointer-events-none" />
            </motion.div>

          </div>
        </motion.section>

        {/* ══════════════════════════════════════
            INTERACTIVE ASSESSMENT SHOWCASE
            (own component — tab state stays local)
            ══════════════════════════════════════ */}
        <AssessmentShowcase />

        {/* ══════════════════════════════════════
            JOURNEY PROCESS (How It Works)
            ══════════════════════════════════════ */}
        <motion.section 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="relative px-6 py-20 lg:py-28 z-10 max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Stacked Mockup CVs */}
            <motion.div
              variants={cardVariants}
              className="lg:col-span-5 relative flex items-center justify-center min-h-[460px] md:min-h-[500px] w-full rounded-[2.5rem] bg-gradient-to-br from-blue-50/50 via-indigo-50/20 to-transparent border border-slate-100/50 p-6 md:p-12 overflow-hidden shadow-inner group"
            >
              {/* Soft decorative background circles */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />
              <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-indigo-100/20 blur-xl pointer-events-none" />

              {/* Stacked CV Cards */}
              <div className="relative w-[280px] md:w-[320px] h-[380px] flex items-center justify-center select-none pointer-events-none">
                {/* CV 1 (Bottom Left) */}
                <div className="absolute w-[240px] md:w-[260px] h-[340px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 p-5 transform -rotate-[6deg] -translate-x-[40px] translateY-[15px] opacity-40 scale-[0.9] transition-transform duration-500 ease-out group-hover:-rotate-[12deg] group-hover:-translate-x-[65px] group-hover:translate-y-[20px]">
                  <div className="w-10 h-10 rounded-full bg-slate-100 mb-4" />
                  <div className="h-4 w-2/3 bg-slate-100 rounded-md mb-6" />
                  <div className="space-y-3">
                    <div className="h-2.5 w-full bg-slate-50 rounded" />
                    <div className="h-2.5 w-5/6 bg-slate-50 rounded" />
                    <div className="h-2.5 w-4/5 bg-slate-50 rounded" />
                    <div className="h-2.5 w-full bg-slate-50 rounded" />
                  </div>
                </div>

                {/* CV 3 (Bottom Right) */}
                <div className="absolute w-[240px] md:w-[260px] h-[340px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 p-5 transform rotate-[6deg] translate-x-[40px] translateY-[20px] opacity-40 scale-[0.85] transition-transform duration-500 ease-out group-hover:rotate-[12deg] group-hover:translate-x-[65px] group-hover:translate-y-[25px]">
                  <div className="h-4 w-1/2 bg-slate-100 rounded-md mb-6" />
                  <div className="space-y-3">
                    <div className="h-2.5 w-full bg-slate-50 rounded" />
                    <div className="h-2.5 w-full bg-slate-50 rounded" />
                    <div className="h-2.5 w-3/4 bg-slate-50 rounded" />
                    <div className="h-2.5 w-5/6 bg-slate-50 rounded" />
                  </div>
                </div>

                {/* CV 2 (Top Center - Main) */}
                <div className="absolute w-[260px] md:w-[280px] h-[360px] bg-white rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.06)] border border-slate-100/80 p-6 z-10 transform scale-100 transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-[0_25px_50px_rgba(15,23,42,0.08)]">
                  {/* Score chip — kể chuyện sản phẩm: CV này ĐÃ được AI chấm */}
                  <div className="absolute -top-3.5 -right-3.5 w-12 h-12 rounded-full bg-white border-2 border-[#DCE9D7] shadow-[0_6px_16px_rgba(15,23,42,0.08)] flex flex-col items-center justify-center z-20">
                    <span className="font-mono tabular-nums text-sm font-extrabold text-[#346538] leading-none">94</span>
                    <span className="text-[7px] font-bold text-slate-400 leading-none mt-0.5">/100</span>
                  </div>
                  {/* ATS pill */}
                  <div className="absolute -top-3 -left-2 z-20 bg-[#EDF3EC] border border-[#DCE9D7] rounded-full px-2.5 py-1 shadow-sm flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#346538]" />
                    <span className="text-[9px] font-bold text-[#346538] whitespace-nowrap">{t("process.atsPill")}</span>
                  </div>
                  {/* CV Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                      LA
                    </div>
                    <div>
                      <div className="h-3.5 w-24 bg-slate-900 rounded-sm mb-1">
                        <div className="h-full w-full bg-slate-900 rounded-sm" />
                      </div>
                      <div className="h-2 w-16 bg-slate-400 rounded-sm" />
                    </div>
                  </div>
                  {/* CV Content */}
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
                    {/* Simulated Skill Tags */}
                    <div className="pt-2">
                      <div className="h-2 w-1/4 bg-blue-600/20 rounded-sm mb-2.5" />
                      <div className="flex flex-wrap gap-1.5">
                        <span className="h-5 px-2 rounded-md bg-blue-50/60 border border-blue-100/40 text-[9px] font-bold text-blue-600 flex items-center justify-center">React</span>
                        <span className="h-5 px-2 rounded-md bg-indigo-50/60 border border-indigo-100/40 text-[9px] font-bold text-indigo-600 flex items-center justify-center">TypeScript</span>
                        <span className="h-5 px-2 rounded-md bg-slate-50 border border-slate-100/50 text-[9px] font-bold text-slate-500 flex items-center justify-center">Tailwind</span>
                      </div>
                    </div>
                    {/* Match bar — điểm khớp như màn kết quả thật */}
                    <div className="pt-3 mt-1 border-t border-slate-100 flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-[#F1F1EF] rounded-full overflow-hidden">
                        <div className="h-full w-[94%] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                      </div>
                      <span className="text-[9px] font-mono tabular-nums font-bold text-blue-600 shrink-0">94%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Black Badge — KHÔNG dùng framer whileHover ở đây:
                  motion ghi đè inline transform sẽ nuốt mất -translate-x-1/2 (badge nhảy phải).
                  Tailwind transform utilities compose qua CSS vars nên hover:scale an toàn. */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-950 text-white rounded-2xl shadow-[0_12px_24px_-6px_rgba(0,0,0,0.3)] border border-slate-800 px-5 py-3.5 flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03] hover:border-slate-700 justify-center">
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-3 h-3 text-slate-950 fill-slate-950" />
                </div>
                <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                  {t("process.badge")}
                </span>
              </div>
            </motion.div>

            {/* Right Column: Steps & CTA */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-10">
              <div className="space-y-4">
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  {t("process.title")}
                </h2>
                <p className="text-slate-500 max-w-xl text-sm md:text-base font-medium leading-relaxed">
                  {t("process.subtitle")}
                </p>
              </div>

              {/* Vertical Steps */}
              <div className="relative pl-3 space-y-8">
                {/* Connecting Vertical Line */}
                <div className="absolute left-[23px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-200" />

                {[
                  {
                    num: "01",
                    title: t("process.step1Title"),
                    desc: t("process.step1Desc"),
                    colorClass: "bg-blue-50/70 text-blue-600 border-blue-100/50",
                  },
                  {
                    num: "02",
                    title: t("process.step2Title"),
                    desc: t("process.step2Desc"),
                    colorClass: "bg-blue-50/70 text-blue-600 border-blue-100/50",
                  },
                  {
                    num: "03",
                    title: t("process.step3Title"),
                    desc: t("process.step3Desc"),
                    colorClass: "bg-blue-50/70 text-blue-600 border-blue-100/50",
                  },
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    variants={cardVariants}
                    className="flex items-start gap-5 relative group"
                  >
                    {/* Circle Indicator */}
                    <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-sm font-bold border shadow-sm z-10 shrink-0 transition-transform duration-300 group-hover:scale-105 ${step.colorClass}`}>
                      {step.num}
                    </div>
                    {/* Step Description */}
                    <div className="space-y-1.5 pt-1.5">
                      <h3 className="text-base md:text-lg font-bold text-slate-800 transition-colors duration-300 group-hover:text-slate-950">
                        {step.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-lg">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="pt-4 flex justify-start">
                <Link to="/diagnosis">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative group h-14 rounded-2xl px-8 text-sm text-white font-bold overflow-hidden shadow-[0_10px_25px_-5px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
                    }}
                  >
                    <span className="animate-shimmer absolute inset-0" />
                    <span className="relative flex items-center justify-center gap-2">
                      {t("process.cta")}
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </motion.button>
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
