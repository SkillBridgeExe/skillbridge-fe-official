import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, ChevronLeft, ChevronRight, Flag, AlertCircle,
  CheckCircle2, XCircle, Code, HelpCircle, ToggleLeft,
  Layers, ArrowLeft, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SAMPLE_QUESTIONS, ASSESSMENT_MODULES, SAMPLE_RESULT,
} from "@/lib/mock-data/assessment";

/* ═══════════════════════════════════════════════════════════ */
/*  Question Type Icon                                        */
/* ═══════════════════════════════════════════════════════════ */
const QUESTION_TYPE_ICONS: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  "multiple-choice": { icon: HelpCircle, label: "Multiple Choice", color: "text-blue-600 bg-blue-50 border-blue-200" },
  "code-output":     { icon: Code,       label: "Code Output",     color: "text-violet-600 bg-violet-50 border-violet-200" },
  "true-false":      { icon: ToggleLeft, label: "True / False",    color: "text-amber-600 bg-amber-50 border-amber-200" },
  "scenario":        { icon: Layers,     label: "Scenario",        color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard:   "bg-red-50 text-red-700 border-red-200",
};

/* ═══════════════════════════════════════════════════════════ */
/*  Assessment Detail Component                               */
/* ═══════════════════════════════════════════════════════════ */
interface AssessmentDetailProps {
  assessmentId: string;
  onBack: () => void;
  onComplete: () => void;
}

export default function AssessmentDetail({ assessmentId, onBack, onComplete }: AssessmentDetailProps) {
  const module = ASSESSMENT_MODULES.find(m => m.id === assessmentId);
  const questions = SAMPLE_QUESTIONS;
  const totalQuestions = questions.length;

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState((module?.timeMinutes || 15) * 60);
  const [showResult, setShowResult] = useState(false);

  // Timer
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleAnswer = useCallback((optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [currentQuestion]: optionIndex }));
    setShowExplanation(false);
  }, [currentQuestion, isSubmitted]);

  const handleNext = () => {
    setShowExplanation(false);
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setShowExplanation(false);
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    setShowExplanation(true);
    setTimeout(() => setShowResult(true), 500);
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / totalQuestions) * 100;
  const question = questions[currentQuestion];
  const selectedAnswer = answers[currentQuestion];
  const isCorrect = selectedAnswer === question.correctIndex;
  const timeWarning = timeLeft < 120;

  const typeInfo = QUESTION_TYPE_ICONS[question.type] || QUESTION_TYPE_ICONS["multiple-choice"];
  const TypeIcon = typeInfo.icon;

  // ─── Result Screen ───────────────────────────────────────
  if (showResult) {
    const result = SAMPLE_RESULT;
    const gradeColors: Record<string, string> = {
      "A+": "from-emerald-400 to-green-500",
      "A":  "from-emerald-400 to-green-500",
      "B":  "from-blue-400 to-cyan-500",
      "C":  "from-amber-400 to-yellow-500",
      "F":  "from-red-400 to-rose-500",
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score Hero */}
        <Card className="p-8 text-center border-slate-100 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-50/30 to-transparent" />
          <div className="relative z-10">
            <div className={cn(
              "w-24 h-24 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br text-white text-4xl font-black shadow-lg",
              gradeColors[result.grade] || "from-slate-400 to-slate-500"
            )}>
              {result.grade}
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-1">{result.score}%</h2>
            <p className="text-slate-500 font-medium text-sm mb-4">
              {module?.title || "Assessment"} — {result.correct}/{result.totalQuestions} correct
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {result.timeSpent}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {result.correct} correct
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400" /> {result.wrong} wrong
              </span>
            </div>
          </div>
        </Card>

        {/* Score Breakdown */}
        <Card className="p-5 border-slate-100">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
            <Layers className="w-4 h-4 text-primary" /> Score Breakdown
          </h3>
          <div className="space-y-3">
            {result.breakdown.map((b, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{b.skill}</span>
                  <span className={cn("font-bold", b.percentage >= 80 ? "text-emerald-600" : b.percentage >= 50 ? "text-amber-600" : "text-red-500")}>
                    {b.correct}/{b.total} ({b.percentage}%)
                  </span>
                </div>
                <Progress value={b.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </Card>

        {/* AI Recommendations */}
        {result.recommendations.length > 0 && (
          <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-violet-50">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" /> AI Recommendations
            </h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessments
          </Button>
          <Button
            className="rounded-xl font-semibold bg-primary text-white"
            onClick={onComplete}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Done
          </Button>
        </div>
      </div>
    );
  }

  // ─── Assessment UI ────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h2 className="font-bold text-slate-900 text-sm">{module?.title || "Assessment"}</h2>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold",
          timeWarning ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-50 text-slate-600"
        )}>
          <Clock className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400 font-medium">
          <span>Question {currentQuestion + 1} of {totalQuestions}</span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* ── Question Navigation Dots ── */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentQuestion(i); setShowExplanation(false); }}
            className={cn(
              "w-7 h-7 rounded-lg text-[11px] font-bold transition-all",
              i === currentQuestion
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : answers[i] !== undefined
                  ? isSubmitted
                    ? answers[i] === questions[i].correctIndex
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* ── Question Card ── */}
      <Card className="p-6 border-slate-100">
        {/* Type + Difficulty badges */}
        <div className="flex items-center gap-2 mb-4">
          <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold", typeInfo.color)}>
            <TypeIcon className="w-3 h-3 mr-1" /> {typeInfo.label}
          </Badge>
          <Badge className={cn("text-[10px] px-2 py-0.5 border font-semibold capitalize", DIFFICULTY_COLORS[question.difficulty])}>
            {question.difficulty}
          </Badge>
        </div>

        {/* Question text */}
        <h3 className="text-base font-bold text-slate-900 leading-relaxed mb-4">
          {question.question}
        </h3>

        {/* Code block (if code-output) */}
        {question.code && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 mb-5 overflow-x-auto text-sm font-mono leading-relaxed">
            <pre className="whitespace-pre-wrap">{question.code}</pre>
          </div>
        )}

        {/* Options */}
        <div className="space-y-2.5">
          {question.options.map((option, i) => {
            const isSelected = selectedAnswer === i;
            const isCorrectOption = i === question.correctIndex;
            const showFeedback = isSubmitted || (showExplanation && isSelected);

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isSubmitted}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium",
                  !showFeedback && isSelected && "border-primary bg-primary/5 text-primary",
                  !showFeedback && !isSelected && "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700",
                  showFeedback && isCorrectOption && "border-emerald-400 bg-emerald-50 text-emerald-800",
                  showFeedback && isSelected && !isCorrectOption && "border-red-400 bg-red-50 text-red-800",
                  showFeedback && !isSelected && !isCorrectOption && "border-slate-200 text-slate-400 opacity-60",
                  isSubmitted && "cursor-default"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                    !showFeedback && isSelected && "bg-primary text-white",
                    !showFeedback && !isSelected && "bg-slate-200 text-slate-500",
                    showFeedback && isCorrectOption && "bg-emerald-500 text-white",
                    showFeedback && isSelected && !isCorrectOption && "bg-red-500 text-white",
                    showFeedback && !isSelected && !isCorrectOption && "bg-slate-200 text-slate-400",
                  )}>
                    {showFeedback && isCorrectOption ? "✓" : showFeedback && isSelected && !isCorrectOption ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation (after submission or check answer) */}
        {(isSubmitted || showExplanation) && selectedAnswer !== undefined && (
          <div className={cn(
            "mt-4 p-4 rounded-xl border text-sm leading-relaxed",
            isCorrect
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            <p className="font-bold mb-1 flex items-center gap-1.5">
              {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p>{question.explanation}</p>
          </div>
        )}
      </Card>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentQuestion === 0}
          className="rounded-xl font-semibold"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Prev
        </Button>

        {!isSubmitted && selectedAnswer !== undefined && !showExplanation && (
          <Button
            variant="ghost"
            onClick={() => setShowExplanation(true)}
            className="text-primary font-semibold text-sm"
          >
            Check Answer
          </Button>
        )}

        {currentQuestion < totalQuestions - 1 ? (
          <Button
            onClick={handleNext}
            className="rounded-xl font-semibold bg-primary text-white"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions || isSubmitted}
            className={cn(
              "rounded-xl font-semibold",
              answeredCount >= totalQuestions
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-400"
            )}
          >
            <Flag className="w-4 h-4 mr-1" /> Submit
          </Button>
        )}
      </div>

      {/* Unanswered warning */}
      {currentQuestion === totalQuestions - 1 && answeredCount < totalQuestions && !isSubmitted && (
        <p className="text-center text-xs text-amber-600 font-medium">
          ⚠️ Answer all {totalQuestions} questions to submit ({totalQuestions - answeredCount} remaining)
        </p>
      )}
    </div>
  );
}
