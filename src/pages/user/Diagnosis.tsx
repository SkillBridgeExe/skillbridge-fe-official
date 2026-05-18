import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { CheckCircle2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { LOADING_MESSAGES, JD_LOADING_MESSAGES } from "@/lib/mock-data/diagnosis";
import { DiagnosisStep1Upload, DiagnosisStep2Review, DiagnosisStep3Results } from "@/components/diagnosis";

/* ── Step Indicator Dot ── */
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
        active ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
        : done  ? "bg-emerald-500 text-white border-emerald-500"
        :         "bg-white text-slate-400 border-slate-200"
      )}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className={cn("text-[11px] font-semibold whitespace-nowrap", active ? "text-primary" : done ? "text-emerald-600" : "text-slate-400")}>
        {label}
      </span>
    </div>
  );
}

/* ── Main Diagnosis Page ── */
export default function Diagnosis() {
  const {
    step, isAnalyzing, hasActivatedJdMode,
    targetStep, loadingMsgIdx, loadingProgress,
    setLoadingProgress, setLoadingMsgIdx
  } = useDiagnosisStore();

  const loadingMsgArray = targetStep === "results" ? JD_LOADING_MESSAGES : LOADING_MESSAGES;

  /* Rotate loading messages while async analysis is in-flight */
  useEffect(() => {
    if (!isAnalyzing) return;

    const msgTimer = setInterval(() => setLoadingMsgIdx((i: number) => (i + 1) % loadingMsgArray.length), 1000);
    const progressTimer = setInterval(() => {
      setLoadingProgress((p: number) => (p >= 95 ? 95 : p + 2));
    }, 120);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
    };
  }, [isAnalyzing, loadingMsgArray.length, setLoadingMsgIdx, setLoadingProgress]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12 relative min-h-[calc(100vh-80px)] flex flex-col">

        {/* LOADING OVERLAY */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-2 min-h-[60px] mb-8">
                <h3 className="text-xl font-bold text-slate-900">
                  {targetStep === "results" ? "AI is running Skill Gap Analysis..." : "AI is analyzing CV Quality..."}
                </h3>
                <p className="text-slate-500 transition-all duration-300 animate-in fade-in">
                  {loadingMsgArray[loadingMsgIdx]}
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-100 ease-linear" style={{ width: `${loadingProgress}%` }} />
                </div>
                <p className="text-xs text-center text-slate-500 font-semibold">{loadingProgress}% completed</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">
            <Brain className="w-3.5 h-3.5" /> AI Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-poppins font-black text-slate-900 mb-3">
            Where does your CV stand?
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Upload your resume and get instant AI-powered feedback on format, ATS compatibility, and skill alignment.
          </p>
        </header>

        {/* ── Dynamic Step Indicator ── */}
        <div className="mb-10 flex items-center justify-center gap-1 sm:gap-4">
          <StepDot n={1} label="Upload CV" active={step === "input"} done={step !== "input"} />
          <div className={cn("flex-1 max-w-[60px] h-0.5 transition-colors", step !== "input" ? "bg-primary" : "bg-slate-200")} />
          <StepDot n={2} label="CV Review" active={step === "cv-review"} done={step === "results"} />

          {/* Framer Motion for animating Step 3 in/out based on JD mode */}
          <AnimatePresence>
            {hasActivatedJdMode && (
              <motion.div
                initial={{ opacity: 0, width: 0, x: -20 }}
                animate={{ opacity: 1, width: "auto", x: 0 }}
                exit={{ opacity: 0, width: 0, x: -20 }}
                className="flex items-center gap-1 sm:gap-4 overflow-hidden"
              >
                <div className={cn("flex-1 w-[60px] h-0.5 transition-colors", step === "results" ? "bg-primary" : "bg-slate-200")} />
                <StepDot n={3} label="Gap Results" active={step === "results"} done={false} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 1: INPUT                                  */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "input" && <DiagnosisStep1Upload />}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 2: CV REVIEW                              */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "cv-review" && <DiagnosisStep2Review />}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 3: SKILL GAP RESULTS                      */}
        {/* ═══════════════════════════════════════════════ */}
        {step === "results" && <DiagnosisStep3Results />}

      </div>
    </Layout>
  );
}
