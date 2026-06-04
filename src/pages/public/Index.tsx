import Layout from "@/components/layout/Layout";
import {
  ArrowRight, Search, UserCheck, LayoutDashboard,
  Target, TrendingUp, CheckCircle2, Zap,
  Layers, Cpu, Star, Users, Award, ChevronRight, Play, BrainCircuit, Rocket, BadgeCheck, Timer
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useInView, type MotionValue } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Tilt from "react-parallax-tilt";      

/* ─────────────────────────────────────────────
   Helper: cast MotionValue styles to CSSProperties
   Fixes TS2353 errors with framer-motion v11+
───────────────────────────────────────────── */
const ms = (style: Record<string, unknown>) => style as React.CSSProperties;
type AnimatedStyleValue = string | MotionValue<string>;

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  glow: string;
  delay: number;
  cardBg: AnimatedStyleValue;
  borderColor: AnimatedStyleValue;
  textColor: AnimatedStyleValue;
  mutedColor: AnimatedStyleValue;
}

interface StepProps {
  number: string;
  title: string;
  description: string;
  delay: number;
  textColor: AnimatedStyleValue;
  mutedColor: AnimatedStyleValue;
}

/* ─────────────────────────────────────────────
   Global keyframe styles injected once
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

    * { box-sizing: border-box; }

    body { font-family: 'DM Sans', sans-serif; }

    .font-display { font-family: 'Syne', sans-serif; }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes marquee-reverse {
      0% { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }
    .animate-marquee { animation: marquee 30s linear infinite; }
    .animate-marquee-reverse { animation: marquee-reverse 25s linear infinite; }
    .animate-marquee:hover, .animate-marquee-reverse:hover { animation-play-state: paused; }

    @keyframes partner-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-partner {
      animation: partner-scroll 36s linear infinite;
      will-change: transform;
    }
    .animate-partner:hover { animation-play-state: paused; }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-12px) rotate(1deg); }
      66% { transform: translateY(-6px) rotate(-1deg); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }

    @keyframes pulse-ring {
      0% { transform: scale(0.9); opacity: 1; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .animate-pulse-ring { animation: pulse-ring 2s ease-out infinite; }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-shimmer {
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: shimmer 2.5s infinite;
    }

    @keyframes ticker-move {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-ticker { animation: ticker-move 20s linear infinite; }

    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .animate-gradient {
      background-size: 200% 200%;
      animation: gradient-shift 4s ease infinite;
    }

    @keyframes scan-line {
      0% { top: 0%; }
      100% { top: 100%; }
    }

    .perspective-card { perspective: 1200px; transform-style: preserve-3d; }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #020617; }
    ::-webkit-scrollbar-thumb { background: #1e40af; border-radius: 3px; }

    .glow-blue { box-shadow: 0 0 40px rgba(59,130,246,0.4), 0 0 80px rgba(59,130,246,0.2); }
    .glow-cyan { box-shadow: 0 0 40px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.2); }
    .text-glow { text-shadow: 0 0 30px rgba(59,130,246,0.6); }

    .card-3d {
      transform-style: preserve-3d;
      transition: transform 0.5s ease;
    }
    .card-3d:hover { transform: rotateY(-5deg) rotateX(3deg) scale(1.02); }

    .badge-flash {
      position: relative;
      overflow: hidden;
    }
    .badge-flash::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transform: skewX(-20deg) translateX(-100%);
      animation: flash 3s ease-in-out infinite;
    }
    @keyframes flash {
      0%, 70% { transform: skewX(-20deg) translateX(-100%); }
      100% { transform: skewX(-20deg) translateX(300%); }
    }
  `}</style>
);
  // const companies = [
  //   { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
  //   { name: "Meta", logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg", invertLogo: true },
  //   { name: "Amazon", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg", invertLogo: true },
  //   { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg", invertLogo: true },
  //   { name: "Shopee", logo: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopee_logo.svg" },
  //   { name: "Grab", logo: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Grab_Logo.svg" },
  //   { name: "Tiki", logo: "https://salt.tikicdn.com/ts/upload/ae/f5/15/2228f38cf84d1b8451bb49e2c4537081.png", invertLogo: true },
  //   { name: "Zalo", logo: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Zalo_logo_2019.svg" },
  //   { name: "Viettel", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Viettel_logo_2021.svg", invertLogo: true },
  //   { name: "Mastercard", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" },
  //   { name: "Visa", logo: "https://upload.wikimedia.org/wikipedia/commons/9/98/Visa_Inc._logo_%282005%E2%80%932014%29.svg", invertLogo: true },
  //   { name: "PayPal", logo: "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" },
  //   { name: "JPMorgan Chase", logo: "https://upload.wikimedia.org/wikipedia/commons/e/e0/JPMorgan_Chase.svg", invertLogo: true },
  //   { name: "Morgan Stanley", logo: "/logo13.jpg", invertLogo: false },
  //   { name: "FPT", logo: "https://www.skillsbridge.vn/cdn/shop/files/FPT.png?v=1772376038&width=187", invertLogo: true },
  //   { name: "KPMG", logo: "https://upload.wikimedia.org/wikipedia/commons/d/db/KPMG_blue_logo.svg", invertLogo: true },
  //   { name: "Deloitte", logo: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Deloitte_old_blue_logo.svg", invertLogo: true },
  //   { name: "Stripe", logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg", invertLogo: true },
  // ];
/* ─────────────────────────────────────────────
   Floating Particle Background
───────────────────────────────────────────── */
const ParticleField = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/30"
          style={ms({ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size })}
          animate={{
            y: [0, -80, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};



/* ─────────────────────────────────────────────
   CountUp Component
───────────────────────────────────────────── */
const CountUp = ({ 
  to, 
  prefix = "", 
  suffix = "", 
  decimals = 0,
  duration = 2
}: { 
  to: number, 
  prefix?: string, 
  suffix?: string, 
  decimals?: number,
  duration?: number
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-100px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    mass: 1,
    duration: duration * 1000
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(to);
    }
  }, [isInView, motionValue, to]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (nodeRef.current) {
        nodeRef.current.textContent = `${prefix}${Number(latest).toFixed(decimals)}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix, decimals]);

  return <span ref={nodeRef}>{prefix}0{suffix}</span>;
};

/* ─────────────────────────────────────────────
   Main Export
───────────────────────────────────────────── */
export default function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Scroll: white(0) → dark(mid) → white(end)
  const backgroundColor = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.82, 1],
    ["#ffffff", "#0f172a", "#020617", "#020617", "#ffffff"]
  );
  const textColor = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.82, 1],
    ["#0f172a", "#f8fafc", "#f8fafc", "#f8fafc", "#0f172a"]
  );
  const mutedTextColor = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.82, 1],
    ["#475569", "#94a3b8", "#94a3b8", "#94a3b8", "#475569"]
  );
  const borderColor = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.82, 1],
    ["rgba(0,0,0,0.1)", "rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.05)", "rgba(0,0,0,0.1)"]
  );
  const cardBg = useTransform(
    scrollYProgress,
    [0, 0.12, 0.45, 0.82, 1],
    ["rgba(255,255,255,0.85)", "rgba(15,23,42,0.85)", "rgba(2,6,23,0.65)", "rgba(2,6,23,0.65)", "rgba(255,255,255,0.85)"]
  );

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -60]);
  const dashboardScale = useTransform(scrollYProgress, [0, 0.2], [0.88, 1]);
  const dashboardY = useTransform(scrollYProgress, [0, 0.2], [120, 0]);

  const gradientLeft = useTransform(backgroundColor, (bg: string) => `linear-gradient(to right, ${bg}, transparent)`);
  const gradientRight = useTransform(backgroundColor, (bg: string) => `linear-gradient(to left, ${bg}, transparent)`);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <Layout>
      <GlobalStyles />

      <motion.div
        ref={containerRef}
        style={ms({ backgroundColor, color: textColor })}
        className="relative min-h-screen overflow-hidden transition-colors duration-300"
      >
        {/* ── Animated Background Blobs ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: [0, -40, 0], scale: [1, 1.15, 1], rotate: [0, 6, -4, 0] }}
            transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
            className="absolute top-[5%] left-[5%] w-[36rem] h-[36rem] bg-blue-400/25 rounded-full blur-[130px]"
          />
          <motion.div
            animate={{ y: [0, 60, 0], scale: [1, 1.25, 1], rotate: [0, -12, 6, 0] }}
            transition={{ repeat: Infinity, duration: 22, ease: "easeInOut", delay: 2 }}
            className="absolute top-[35%] right-[0%] w-[44rem] h-[44rem] bg-cyan-400/20 rounded-full blur-[150px]"
          />
          <motion.div
            animate={{ x: [0, 60, 0], scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 28, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-15%] left-[15%] w-[40rem] h-[40rem] bg-blue-500/15 rounded-full blur-[160px]"
          />
          {/* Dynamic cursor glow */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full blur-[120px] bg-blue-500/10 pointer-events-none"
            animate={{
              x: mousePos.x * window.innerWidth - 300,
              y: mousePos.y * window.innerHeight - 300,
            }}
            transition={{ type: "spring", damping: 30, stiffness: 80 }}
          />
          <ParticleField />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* ── Role Marquee — flush below navbar ── */}
        <motion.div
          className="relative w-full overflow-hidden py-3 mt-16 z-20"
          style={ms({ borderBottom: "1px solid", borderBottomColor: borderColor })}
        >
          <motion.div className="absolute left-0 top-0 h-full w-24 z-10 pointer-events-none" style={ms({ background: gradientLeft })} />
          <motion.div className="absolute right-0 top-0 h-full w-24 z-10 pointer-events-none" style={ms({ background: gradientRight })} />
          <div className="flex w-max animate-marquee gap-0 whitespace-nowrap items-center">
            {[
              "React Developer", "AI Engineer", "Data Analyst", "Fullstack Dev",
              "Cloud Engineer", "Mobile Developer", "UI/UX Designer", "ML Engineer",
              "DevSecOps", "Backend Engineer", "Product Manager", "Data Scientist",
              "React Developer", "AI Engineer", "Data Analyst", "Fullstack Dev",
              "Cloud Engineer", "Mobile Developer", "UI/UX Designer", "ML Engineer",
              "DevSecOps", "Backend Engineer", "Product Manager", "Data Scientist",
            ].map((label, i) => (
              <span key={i} className="inline-flex items-center">
                <motion.span
                  className="px-6 text-sm font-semibold tracking-wide transition-colors cursor-default"
                  style={ms({ color: mutedTextColor })}
                >
                  {label}
                </motion.span>
                <motion.span className="select-none text-xs" style={ms({ color: mutedTextColor, opacity: 0.35 })}>·</motion.span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-6 flex flex-col items-center justify-center text-center z-10">

          {/* ── Hero Content ── */}
          <motion.div style={{ y: heroY }} className="max-w-5xl mx-auto space-y-8">

            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="badge-flash inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/5 backdrop-blur-md border shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transition-all cursor-default"
              style={ms({ borderColor })}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <span className="bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold text-sm tracking-wide">
                AI-Powered Career Matching 2.0
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: "easeOut" }}
              className="font-display text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.15]"
            >
              Bridge Your{" "}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 italic pr-1 animate-gradient">
                  Skills
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
              </span>
              {" "}to Your{" "}
              <span className="relative">
                Dream Job                
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={ms({ color: mutedTextColor })}
              className="text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-medium"
            >
              Analyze your CV, build a professional resume from scratch, and get a personalized roadmap to reach your dream job.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6"
            >
              <Link to="/diagnosis">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative group h-16 rounded-full px-12 text-lg text-white font-bold overflow-hidden"
                  style={ms({
                    background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                    boxShadow: "0 8px 32px rgba(59,130,246,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
                  })}
                >
                  <span className="animate-shimmer absolute inset-0" />
                  <span className="relative flex items-center gap-3">
                    <Search className="w-5 h-5" />
                    Scan My CV Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </span>
                </motion.button>
              </Link>

              {/* <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="group h-16 rounded-full px-12 text-lg font-semibold border-2 backdrop-blur-sm flex items-center gap-3 transition-all duration-300"
                  style={ms({
                    borderColor: "rgba(99,102,241,0.4)",
                    background: "rgba(99,102,241,0.05)",
                    color: "inherit",
                  })}
                >
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/40">
                    <Play className="w-3.5 h-3.5 text-blue-400 ml-0.5" />
                  </span>
                  Watch Demo
                </motion.button>
              </Link> */}

              <Link to="/cv-builder">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="group h-16 rounded-full px-12 text-lg font-semibold border-2 backdrop-blur-sm flex items-center gap-3 transition-all duration-300"
                  style={ms({
                    borderColor: "rgba(99,102,241,0.4)",
                    background: "rgba(99,102,241,0.05)",
                    color: "inherit",
                  })}
                >
                  <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/40">
                    <BrainCircuit className="w-4 h-4 text-blue-400" />
                  </span>
                  Create CV with AI
                </motion.button>
              </Link>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-medium mt-4 text-center"
              style={ms({ color: mutedTextColor })}
            >
              Already have a CV? Scan it. No CV yet? Build one with AI.
            </motion.p>

            {/* Social proof mini row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-8 pt-4"
              style={ms({ color: mutedTextColor })}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="flex -space-x-2">
                  {["bg-blue-400", "bg-cyan-400", "bg-indigo-400", "bg-sky-400"].map((c, i) => (
                    <div key={i} className={cn("w-7 h-7 rounded-full ring-2 ring-white", c)} />
                  ))}
                </div>
                <span>12,000+ users</span>
              </div>
              <div className="h-4 w-px bg-current opacity-20" />
              <div className="flex items-center gap-1 text-sm font-medium">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1">4.9/5</span>
              </div>
              <div className="h-4 w-px bg-current opacity-20" />
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <BadgeCheck className="w-4 h-4 text-blue-400" />
                <span>Free forever plan</span>
              </div>
            </motion.div>
          </motion.div>
        </section>



        {/* ══════════════════════════════════════
            STATS BANNER
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-20 z-20">
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: <CountUp to={98} suffix="%" />, label: "Placement Rate", icon: <Rocket className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-500" />, glow: "rgba(59,130,246,0.4)" },
              { value: <CountUp to={12} suffix="K+" />, label: "Active Learners", icon: <Users className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-500" />, glow: "rgba(34,211,238,0.4)" },
              { value: <CountUp to={500} suffix="+" />, label: "Partner Companies", icon: <Award className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />, glow: "rgba(99,102,241,0.4)" },
              { value: <CountUp to={3.2} decimals={1} suffix="×" />, label: "Salary Increase", icon: <TrendingUp className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-500" />, glow: "rgba(52,211,153,0.4)" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                style={ms({ backgroundColor: cardBg, borderColor, boxShadow: `0 8px 32px ${stat.glow}` })}
                className="p-8 rounded-3xl border backdrop-blur-xl text-center group relative overflow-hidden transition-all duration-300"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${stat.glow} 0%, transparent 70%)` }} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4 ring-1 ring-white/10 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-shadow duration-300">
                    {stat.icon}
                  </div>
                  <div className="font-sans text-5xl font-extrabold tabular-nums bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-1 drop-shadow-sm">
                    {stat.value}
                  </div>
                  <motion.div style={ms({ color: mutedTextColor })} className="text-sm font-semibold uppercase tracking-wider">
                    {stat.label}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            PARTNER COMPANIES
        ══════════════════════════════════════ */}
        {/* <section className="relative px-6 pb-20 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                style={ms({ color: mutedTextColor })} 
                className="text-sm font-bold tracking-widest uppercase mb-4"
              >
                Industry Leaders & Experts from Top Companies
              </motion.p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {companies.map((company, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  whileHover={{ y: -4, scale: 1.05 }}
                  style={ms({ backgroundColor: cardBg, borderColor })}
                  className="flex items-center justify-center p-6 h-[100px] lg:h-[120px] rounded-2xl border backdrop-blur-md group transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] cursor-pointer"
                >
                  <img
                    src={company.logo}
                    alt={company.name}
                    className={`w-auto h-auto max-w-full max-h-[40px] lg:max-h-[50px] object-contain filter transition-all duration-300 opacity-50 group-hover:opacity-100 ${
                      company.invertLogo 
                        ? 'grayscale group-hover:brightness-0 group-hover:invert drop-shadow-sm' 
                        : 'grayscale group-hover:grayscale-0 drop-shadow-sm'
                    }`}
                    title={company.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="hidden text-xs font-bold text-slate-400">{company.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section> */}

        {/* ══════════════════════════════════════
            3D DASHBOARD PREVIEW
        ══════════════════════════════════════ */}
        <section className="relative px-6 pb-32 z-20">
          <motion.div
            style={{ scale: dashboardScale, y: dashboardY }}
            className="max-w-[1200px] mx-auto relative"
          >
            {/* Floating annotations */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={ms({ backgroundColor: cardBg, borderColor })}
              className="absolute -left-8 md:-left-20 top-1/4 hidden xl:flex flex-col gap-3 backdrop-blur-2xl p-5 rounded-2xl border shadow-2xl z-30 card-3d"
            >
              <div className="flex items-center gap-2.5 bg-indigo-500/10 w-fit px-3 py-1.5 rounded-full">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400 font-bold text-xs uppercase tracking-wider">Target Match</span>
              </div>
              <motion.p style={ms({ color: mutedTextColor })} className="text-sm font-medium w-44 leading-relaxed">
                Neural matching between your CV and JD requirements.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30, y: -20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              style={ms({ backgroundColor: cardBg, borderColor })}
              className="absolute -right-8 md:-right-20 bottom-1/3 hidden xl:flex flex-col gap-3 backdrop-blur-2xl p-5 rounded-2xl border shadow-2xl z-30 card-3d"
            >
              <div className="flex items-center gap-2.5 bg-cyan-500/10 w-fit px-3 py-1.5 rounded-full">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">AI Learning Path</span>
              </div>
              <motion.p style={ms({ color: mutedTextColor })} className="text-sm font-medium w-44 leading-relaxed">
                Generates adaptive roadmap based on missing skills.
              </motion.p>
            </motion.div>

            {/* Main Tilt Card */}
            <Tilt
              glareEnable={true}
              glareMaxOpacity={0.12}
              glarePosition="all"
              tiltMaxAngleX={4}
              tiltMaxAngleY={4}
              scale={1.015}
              transitionSpeed={2500}
              className="w-full relative z-20 rounded-[2rem] p-[3px] shadow-[0_0_100px_rgba(59,130,246,0.2),0_0_50px_rgba(0,0,0,0.3)]"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(6,182,212,0.3), rgba(99,102,241,0.2))" }}
            >
              <div className="rounded-[1.85rem] overflow-hidden bg-slate-950 flex flex-col w-full aspect-[16/10] md:aspect-[16/9] shadow-inner ring-1 ring-white/10 relative">
                {/* Scan line effect */}
                <motion.div
                  className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-30 pointer-events-none"
                  animate={{ top: ["0%", "100%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                />

                {/* Browser bar */}
                <div className="bg-slate-900/90 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div className="bg-slate-800/80 px-6 py-2 rounded-xl text-xs text-slate-400 font-medium tracking-wide flex items-center gap-2 ring-1 ring-white/5">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    skillbridge.ai/dashboard
                  </div>
                  <div className="w-16" />
                </div>

                {/* Dashboard inner UI */}
                <div className="flex-1 flex overflow-hidden bg-[radial-gradient(ellipse_at_top,#0f172a,#020617)] relative">
                  {/* Sidebar */}
                  <aside className="w-16 lg:w-60 border-r border-white/5 flex flex-col p-5 bg-slate-900/40 backdrop-blur-sm">
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                        <div className="hidden lg:block h-3 w-20 bg-slate-700/50 rounded-full" />
                      </div>
                      <div className="space-y-2 pt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <div className={cn("w-6 h-6 rounded-lg ring-1 transition-all", i === 1 ? "bg-cyan-400 ring-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.7)]" : "bg-slate-800 ring-slate-700")} />
                            <div className={cn("hidden lg:block h-2.5 rounded-full transition-all", i === 1 ? "w-16 bg-cyan-400" : "w-20 bg-slate-700")} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>

                  {/* Main content */}
                  <main className="flex-grow p-8 space-y-8 overflow-hidden">
                    <div className="flex justify-between items-end">
                      <div className="space-y-2">
                        <div className="h-2.5 w-28 bg-cyan-500/30 rounded-full" />
                        <div className="h-7 w-56 bg-slate-200/20 rounded-xl" />
                      </div>
                      <div className="hidden md:flex gap-3">
                        <div className="h-9 w-28 bg-slate-800/80 rounded-2xl ring-1 ring-white/10" />
                        <div className="h-9 w-36 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Match Score */}
                      <div className="bg-slate-900/60 p-6 rounded-2xl ring-1 ring-white/10 flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">
                            <circle className="text-slate-800" strokeWidth="8" stroke="currentColor" fill="transparent" r="48" cx="56" cy="56" />
                            <motion.circle
                              initial={{ strokeDashoffset: 301 }}
                              whileInView={{ strokeDashoffset: 301 - (301 * 84) / 100 }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                              className="text-cyan-400"
                              strokeWidth="8"
                              strokeDasharray={301}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="48"
                              cx="56"
                              cy="56"
                            />
                          </svg>
                          <span className="absolute text-2xl font-black text-white">84%</span>
                        </div>
                        <div className="h-2.5 w-20 bg-slate-700 rounded-full mx-auto" />
                      </div>

                      {/* Skills */}
                      <div className="bg-slate-900/60 p-6 rounded-2xl ring-1 ring-white/10 lg:col-span-2 space-y-5">
                        <div className="flex justify-between items-center">
                          <div className="h-3.5 w-36 bg-slate-200/20 rounded-full" />
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                          </div>
                        </div>
                        {[92, 68, 45].map((v, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between">
                              <div className="h-2 w-28 bg-slate-600 rounded-full" />
                              <span className="text-xs font-bold text-slate-400">{v}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${v}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                                className={cn("h-full", i === 0 ? "bg-emerald-400" : i === 1 ? "bg-blue-400" : "bg-cyan-400")}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI Roadmap */}
                      <div className="bg-slate-900/60 p-6 rounded-2xl ring-1 ring-white/10 lg:col-span-3">
                        <div className="flex items-center justify-between gap-3">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-3 flex-1">
                              <motion.div
                                whileHover={{ scale: 1.15 }}
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                  i < 4
                                    ? "bg-cyan-400 text-white ring-2 ring-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]"
                                    : "bg-slate-800 text-slate-500 ring-1 ring-white/5"
                                )}
                              >
                                {i < 4 ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                              </motion.div>
                              <div className="hidden lg:block h-1.5 w-14 bg-slate-700/50 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
            </Tilt>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════
            FEATURES GRID
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-200 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700 text-slate-300 font-semibold text-xs tracking-widest uppercase"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                Platform Capabilities
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-tight"
              >
                Everything you need to{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                  scale your skills
                </span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                style={ms({ color: mutedTextColor })}
                className="text-xl max-w-2xl mx-auto font-medium"
              >
                A unified ecosystem built from the ground up to accelerate your transition from learning to earning.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: <Search className="w-7 h-7" />, title: "Deep AI Diagnosis", desc: "Upload your CV and get an instant neural-matched job score and granular gap analysis.", color: "text-indigo-400", glow: "bg-indigo-500/20", delay: 0 },
                { icon: <Zap className="w-7 h-7" />, title: "Adaptive Learning", desc: "A dynamic, continuously evolving roadmap tailored to fill your skill gaps interactively.", color: "text-cyan-400", glow: "bg-cyan-500/20", delay: 0.1 },
                { icon: <BrainCircuit className="w-7 h-7" />, title: "Real-time Practice", desc: "AI-powered mock interviews with real-time feedback on speaking delivery and expression.", color: "text-violet-400", glow: "bg-violet-500/20", delay: 0.2 },
                { icon: <UserCheck className="w-7 h-7" />, title: "Verified Ecosystem", desc: "Connect instantly with vetted mentors, top recruiters, and exclusive curated resources.", color: "text-emerald-400", glow: "bg-emerald-500/20", delay: 0.3 },
              ].map((f, i) => (
                <FeatureCard key={i} {...f} cardBg={cardBg} borderColor={borderColor} textColor={textColor} mutedColor={mutedTextColor} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-32 overflow-hidden z-20">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-20" />

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div className="space-y-12">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
                    Your Journey in{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                      3 Optimized Steps
                    </span>
                  </h2>
                  <motion.p style={ms({ color: mutedTextColor })} className="text-lg">
                    Our proprietary AI engine handles the complexity, leaving you with a clear, actionable path to your next role.
                  </motion.p>
                </motion.div>

                <div className="space-y-14 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0 before:bg-gradient-to-b before:from-cyan-400 before:via-blue-400 before:to-transparent">
                  <Step number="01" title="Upload & Analyze" description="Upload your CV and target JD. Our neural engine performs a deep scan for exact skill matching and requirement extraction." delay={0} textColor={textColor} mutedColor={mutedTextColor} />
                  <Step number="02" title="Learn & Upskill" description="Follow your auto-generated roadmap. Each micro-module is algorithmically selected to bridge your specific technical gaps." delay={0.2} textColor={textColor} mutedColor={mutedTextColor} />
                  <Step number="03" title="Practice & Get Hired" description="Refine your interview techniques with AI avatars and connect seamlessly into our active recruiter ecosystem." delay={0.4} textColor={textColor} mutedColor={mutedTextColor} />
                </div>
              </div>

              {/* 3D Skill Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-12 bg-indigo-500/15 blur-[100px] rounded-full" />
                <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} scale={1.04} transitionSpeed={2000}>
                  <motion.div
                    style={ms({ backgroundColor: cardBg, borderColor })}
                    className="rounded-3xl p-10 relative border shadow-2xl space-y-8 backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden"
                  >
                    {/* bg accent */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 rounded-full blur-[60px]" />

                    <div className="flex items-center gap-5 border-b border-white/10 pb-8 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-[2px] shadow-lg glow-cyan">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white font-black text-xl">
                          92%
                        </div>
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-xl mb-1">Synergy Score</h4>
                        <motion.p style={ms({ color: mutedTextColor })} className="text-sm">Highly optimized for target role</motion.p>
                      </div>
                      <div className="ml-auto">
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={cn("w-2 h-6 rounded-full", i < 4 ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-slate-700")} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      {[
                        { label: "Core React Setup", pct: 100, color: "bg-emerald-400", shadow: "rgba(52,211,153,0.5)", text: "text-emerald-400" },
                        { label: "System Design", pct: 65, color: "bg-amber-400", shadow: "rgba(251,191,36,0.5)", text: "text-amber-400" },
                        { label: "Cloud Infrastructure", pct: 30, color: "bg-red-400", shadow: "rgba(248,113,113,0.5)", text: "text-red-400" },
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="font-semibold">{s.label}</span>
                            <span className={cn("font-bold", s.text)}>{s.pct}%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden ring-1 ring-inset ring-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${s.pct}%` }}
                              transition={{ duration: 1.2, delay: 0.5 + i * 0.2 }}
                              className={cn("h-full rounded-full relative", s.color)}
                              style={ms({ boxShadow: `0 0 12px ${s.shadow}` })}
                            >
                              <div className="absolute inset-0 animate-shimmer rounded-full" />
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 relative z-10">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-2xl h-14 font-semibold text-white relative overflow-hidden"
                        style={ms({ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" })}
                      >
                        <span className="animate-shimmer absolute inset-0" />
                        <span className="relative flex items-center justify-center gap-2">
                          Generate Action Plan
                          <ChevronRight className="w-5 h-5" />
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                </Tilt>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-280 z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/30 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-xs tracking-widest uppercase"
              >
                <Star className="w-4 h-4 fill-amber-400" />
                Success Stories
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl md:text-5xl font-bold"
              >
                Loved by{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  12,000+ learners
                </span>
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Nguyen Minh Tu", role: "→ Senior React Dev at Shopee", avatar: "MT", review: "SkillBridge analyzed my CV in great detail. After just 3 months following the roadmap, I passed the Shopee interview process.", stars: 5, color: "from-blue-600 to-blue-400" },
                { name: "Tran Phuong Linh", role: "→ AI Engineer at VNG", avatar: "PL", review: "The AI mock interview feature is incredibly useful. The feedback is practical and more detailed than many human mentoring sessions.", stars: 5, color: "from-purple-600 to-purple-400" },
                { name: "Le Hoang Nam", role: "→ Cloud Architect at FPT", avatar: "HN", review: "The platform helped me identify the right skill gaps with a clear learning path. I achieved a 2.5x salary increase after 6 months.", stars: 5, color: "from-cyan-600 to-cyan-400" },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  style={ms({ backgroundColor: cardBg, borderColor })}
                  className="p-8 rounded-3xl border backdrop-blur-xl shadow-xl transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-bl from-blue-500/10 to-transparent rounded-3xl" />
                  <div className="flex gap-1 mb-5">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <motion.p style={ms({ color: mutedTextColor })} className="text-base leading-relaxed mb-6 font-medium">"{t.review}"</motion.p>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10", t.color)}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-xs text-blue-400 font-semibold">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CTA SECTION
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-28 z-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center relative"
          >
            {/* Background glow */}
            <div className="absolute inset-0 -z-10 blur-[80px] bg-gradient-to-r from-blue-600/30 via-cyan-500/20 to-indigo-600/30 rounded-full" />

            <div
              className="relative rounded-[2.5rem] p-16 overflow-hidden border"
              style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.1), rgba(99,102,241,0.15))",
                borderColor: "rgba(59,130,246,0.3)",
                boxShadow: "0 0 60px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-[2.5rem]" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyan-500/20 to-transparent rounded-[2.5rem]" />

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold">
                  <Timer className="w-4 h-4 text-cyan-400" />
                  <span>Start in less than 60 seconds</span>
                </div>

                <h2 className="font-display text-5xl md:text-6xl font-black">
                  Ready to land your
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 animate-gradient">
                    dream job?
                  </span>
                </h2>

                <motion.p style={ms({ color: mutedTextColor })} className="text-xl font-medium max-w-xl mx-auto">
                  Upload your CV now and get your personalized AI career roadmap in under 2 minutes.
                </motion.p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link to="/diagnosis">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative group h-16 rounded-full px-14 text-lg text-white font-bold overflow-hidden"
                      style={ms({
                        background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                        boxShadow: "0 8px 40px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
                      })}
                    >
                      <span className="animate-shimmer absolute inset-0" />
                      <span className="relative flex items-center gap-3">
                        Get Started Free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </span>
                    </motion.button>
                  </Link>
                  <motion.span style={ms({ color: mutedTextColor })} className="text-sm font-medium flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-emerald-400" />
                    No credit card required
                  </motion.span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ══════════════════════════════════════
            MENTOR SECTION
        ══════════════════════════════════════ */}
        <section className="relative px-6 py-28 z-20 overflow-hidden">
          {/* Subtle divider */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />

          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest uppercase"
                  style={ms({ borderColor, background: "rgba(99,102,241,0.08)", color: "#818cf8" })}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Expert Mentors
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-4xl md:text-5xl font-black tracking-tight leading-tight"
                >
                  Learn from those who
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
                    already made it
                  </span>
                </motion.h2>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Link to="/ecosystem">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="group flex items-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-sm border transition-all duration-300"
                    style={ms({
                      borderColor: "rgba(99,102,241,0.4)",
                      background: "rgba(99,102,241,0.08)",
                      color: "#a5b4fc",
                    })}
                  >
                    View all mentors
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Mentor Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  name: "Nguyen Anh Khoa",
                  title: "Staff Engineer",
                  company: "Google",
                  companyColor: "#4285F4",
                  avatar: "AK",
                  avatarGrad: "from-blue-600 to-blue-400",
                  specialty: "System Design · DSA",
                  sessions: "320+",
                  rating: 4.9,
                  badge: "Top Mentor",
                  badgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
                  delay: 0,
                },
                {
                  name: "Tran Thi Mai Anh",
                  title: "Senior ML Engineer",
                  company: "Meta",
                  companyColor: "#1877F2",
                  avatar: "MA",
                  avatarGrad: "from-purple-600 to-violet-400",
                  specialty: "Machine Learning · Python",
                  sessions: "210+",
                  rating: 4.8,
                  badge: "AI Expert",
                  badgeColor: "text-violet-400 bg-violet-400/10 border-violet-400/20",
                  delay: 0.1,
                },
                {
                  name: "Le Minh Duc",
                  title: "Principal Engineer",
                  company: "Shopee",
                  companyColor: "#F97316",
                  avatar: "MD",
                  avatarGrad: "from-orange-500 to-amber-400",
                  specialty: "React · Node.js · Cloud",
                  sessions: "180+",
                  rating: 4.9,
                  badge: "Fullstack",
                  badgeColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
                  delay: 0.2,
                },
                {
                  name: "Pham Hong Phuc",
                  title: "DevOps Lead",
                  company: "VNG",
                  companyColor: "#06B6D4",
                  avatar: "HP",
                  avatarGrad: "from-cyan-600 to-teal-400",
                  specialty: "AWS · K8s · CI/CD",
                  sessions: "145+",
                  rating: 4.7,
                  badge: "Cloud Pro",
                  badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                  delay: 0.3,
                },
              ].map((mentor, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.55, delay: mentor.delay }}
                  whileHover={{ y: -8 }}
                  className="group relative rounded-3xl border overflow-hidden cursor-pointer transition-all duration-300"
                  style={ms({
                    backgroundColor: cardBg,
                    borderColor,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                  })}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 70%)` }}
                  />

                  <div className="p-7 space-y-5 relative z-10">
                    {/* Top row: avatar + badge */}
                    <div className="flex items-start justify-between">
                      {/* Avatar */}
                      <div className="relative">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-lg ring-2 ring-white/10",
                            mentor.avatarGrad
                          )}
                        >
                          {mentor.avatar}
                        </div>
                        {/* Online dot */}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-current shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                      </div>

                      {/* Badge */}
                      <span
                        className={cn(
                          "text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border",
                          mentor.badgeColor
                        )}
                      >
                        {mentor.badge}
                      </span>
                    </div>

                    {/* Name & title */}
                    <div>
                      <h3 className="font-display font-bold text-base leading-tight mb-0.5">{mentor.name}</h3>
                      <motion.p className="text-xs font-semibold" style={ms({ color: mutedTextColor })}>
                        {mentor.title}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span style={{ color: mentor.companyColor }}>{mentor.company}</span>
                      </motion.p>
                    </div>

                    {/* Specialty tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.specialty.split(" · ").map((tag, j) => (
                        <span
                          key={j}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                    {/* Stats row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="flex">
                          {[...Array(5)].map((_, k) => (
                            <Star
                              key={k}
                              className={cn("w-3 h-3", k < Math.floor(mentor.rating) ? "fill-amber-400 text-amber-400" : "fill-slate-700 text-slate-700")}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-amber-400">{mentor.rating}</span>
                      </div>
                      <motion.div className="text-xs font-semibold" style={ms({ color: mutedTextColor })}>
                        <span className="text-blue-400 font-bold">{mentor.sessions}</span> sessions
                      </motion.div>
                    </div>

                    {/* Book CTA */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full h-10 rounded-xl text-sm font-bold text-white relative overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={ms({
                        background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                        boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                      })}
                    >
                      <span className="animate-shimmer absolute inset-0" />
                      <span className="relative flex items-center justify-center gap-1.5">
                        Book a Session
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom social proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-semibold"
              style={ms({ color: mutedTextColor })}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2.5">
                  {["from-blue-500 to-blue-400","from-purple-500 to-violet-400","from-cyan-500 to-teal-400","from-orange-500 to-amber-400","from-emerald-500 to-green-400"].map((g, i) => (
                    <div key={i} className={cn("w-8 h-8 rounded-full bg-gradient-to-br ring-2 ring-current flex items-center justify-center text-white text-xs font-bold", g)} />
                  ))}
                </div>
                <span>50+ expert mentors available</span>
              </div>
              <span className="hidden sm:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>Average response within 2 hours</span>
              </div>
              <span className="hidden sm:block opacity-30">|</span>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-blue-400" />
                <span>All mentors are industry-verified</span>
              </div>
            </motion.div>
          </div>
        </section>

      </motion.div>
    </Layout>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, glow, delay, cardBg, borderColor, textColor, mutedColor }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      style={ms({ backgroundColor: cardBg, borderColor })}
      className="p-8 rounded-3xl border backdrop-blur-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] transition-all duration-300 group relative overflow-hidden"
    >
      <div className={cn("absolute -right-10 -top-10 w-36 h-36 blur-[60px] rounded-full transition-opacity opacity-0 group-hover:opacity-100", glow)} />
      <div className={cn("w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500", color)}>
        {icon}
      </div>
      <h3 style={ms({ color: textColor })} className="font-display text-xl font-bold mb-3">{title}</h3>
      <p style={ms({ color: mutedColor })} className="text-sm leading-relaxed font-medium">{desc}</p>
      <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold" style={ms({ color: mutedColor })}>
        Learn more <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.div>
  );
}

function Step({ number, title, description, delay, textColor, mutedColor }: StepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
      className="flex gap-7 group relative"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-lg font-black text-slate-400 group-hover:border-cyan-500 group-hover:text-cyan-400 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.8)] transition-all duration-300 relative z-10">
        {number}
      </div>
      <div className="space-y-2.5 pt-2">
        <h3 style={ms({ color: textColor })} className="font-display text-2xl font-bold tracking-tight group-hover:text-cyan-400 transition-colors">{title}</h3>
        <p style={ms({ color: mutedColor })} className="text-base leading-relaxed font-medium">{description}</p>
      </div>
    </motion.div>
  );
}
