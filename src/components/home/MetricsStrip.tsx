import { motion } from "framer-motion";
import CountUp from "@/components/shared/CountUp";

export default function MetricsStrip() {
  const metrics = [
    {
      to: 94,
      suffix: "%",
      label: "Scoring Consistency",
      description: "AI grading precision score"
    },
    {
      to: 8,
      label: "IT Roles Configured",
      description: "Supported tech careers"
    },
    {
      to: 3101,
      label: "Vietnam IT JDs",
      description: "Vietnam IT JD repository"
    },
    {
      to: 4,
      label: "AI Agent Modules",
      description: "Autonomous AI modules"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 py-8 md:py-10 px-6 md:px-8 bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-[2rem] shadow-[0_12px_40px_-12px_rgba(15,23,42,0.03)] text-center relative overflow-hidden">
        {/* Subtle inner blur effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.01] to-indigo-500/[0.01] pointer-events-none" />

        {metrics.map((m, idx) => (
          <div 
            key={idx} 
            className="space-y-1.5 flex flex-col justify-center relative z-10 py-2"
          >
            {/* Divider lines between items in desktop */}
            {idx > 0 && (
              <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-12 bg-slate-200" />
            )}
            
            <div className="font-display font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight leading-none">
              <CountUp to={m.to} suffix={m.suffix} />
            </div>
            
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                {m.label}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-normal mt-0.5">
                {m.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
