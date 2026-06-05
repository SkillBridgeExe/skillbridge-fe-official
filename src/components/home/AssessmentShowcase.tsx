import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, MessageSquare, Timer, Users } from "lucide-react";

// Tab state lives HERE so switching tabs re-renders only this section,
// not the whole homepage.

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
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

type TabId = "fe" | "be" | "ai" | "soft";

const ASSESSMENTS: Record<TabId, { title: string; duration: string; questions: number; completions: string; level: string }[]> = {
  fe: [
    { title: "React Core Capabilities", duration: "15 mins", questions: 20, completions: "4.2k", level: "Intermediate" },
    { title: "JavaScript Fundamentals", duration: "10 mins", questions: 15, completions: "8.5k", level: "Beginner" },
    { title: "Tailwind CSS & Styling", duration: "12 mins", questions: 18, completions: "2.1k", level: "Intermediate" }
  ],
  be: [
    { title: "System Design Essentials", duration: "25 mins", questions: 10, completions: "3.1k", level: "Advanced" },
    { title: "SQL Query Optimization", duration: "15 mins", questions: 20, completions: "5.4k", level: "Intermediate" },
    { title: "RESTful API Best Practices", duration: "12 mins", questions: 15, completions: "6.2k", level: "Beginner" }
  ],
  ai: [
    { title: "Prompt Engineering Principles", duration: "15 mins", questions: 12, completions: "1.9k", level: "Beginner" },
    { title: "Python for Data Analysis", duration: "20 mins", questions: 25, completions: "4.8k", level: "Intermediate" },
    { title: "Machine Learning Concepts", duration: "30 mins", questions: 15, completions: "1.2k", level: "Advanced" }
  ],
  soft: [
    { title: "Critical Thinking & Logic", duration: "12 mins", questions: 15, completions: "9.2k", level: "Beginner" },
    { title: "Product Strategy Case Studies", duration: "20 mins", questions: 8, completions: "2.5k", level: "Advanced" },
    { title: "Effective Collaboration", duration: "10 mins", questions: 12, completions: "6.1k", level: "Beginner" }
  ]
};

const TABS: { id: TabId; label: string }[] = [
  { id: "fe", label: "Frontend Development" },
  { id: "be", label: "Backend Systems" },
  { id: "ai", label: "AI & Data Science" },
  { id: "soft", label: "Core Competencies" },
];

export default function AssessmentShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("fe");

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className="relative px-6 py-16 z-10 max-w-7xl mx-auto"
    >
      <div className="border border-slate-100 bg-white rounded-[2rem] p-8 md:p-12 shadow-sm hover:shadow-md">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          {/* Left Column: Title and tabs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5" />
              Capability Library
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 font-display leading-tight">
              Verify your core skills
            </h3>
            <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
              Try our standardized skill tests matching leading enterprise requirements to verify your current standing.
            </p>

            {/* Tab selections */}
            <div className="flex flex-col gap-2 pt-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border",
                    activeTab === tab.id
                      ? "bg-blue-600 text-white border-blue-500 shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
                      : "bg-slate-50/60 text-slate-500 border-slate-100 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  {tab.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Mini cards showing test items */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {ASSESSMENTS[activeTab].map((item, idx) => (
              <motion.div
                key={idx}
                variants={cardVariants}
                className="border border-slate-100 bg-white rounded-2xl p-6 space-y-4 hover:border-slate-200 transition-all duration-300 flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded">
                      {item.level}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {item.completions} taken
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.title}</h4>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5 text-blue-500" /> {item.duration}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> {item.questions} questions</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 animate-shimmer"
                  >
                    Start Test <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
