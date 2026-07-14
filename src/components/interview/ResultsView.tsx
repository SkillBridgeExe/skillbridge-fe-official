import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  ListChecks,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  BookOpen,
  Eye,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  devPlanTrackKind,
  formatDuration,
  gapSeverityLevel,
  toInterviewResultViewModel,
  type InterviewScoreExplanationViewModel,
} from "./interview-view-model";

const PHASES = [
  { key: "SCREENING", labelVi: "Khởi động", labelEn: "Screening" },
  { key: "SKILL_PROBE", labelVi: "Kỹ năng & JD", labelEn: "Skill probe" },
  { key: "SCENARIO", labelVi: "Tình huống", labelEn: "Scenario" },
  { key: "BEHAVIORAL", labelVi: "Hành vi", labelEn: "Behavioral" },
  { key: "WRAP", labelVi: "Tổng kết", labelEn: "Wrap-up" }
];

interface ResultsViewProps {
  result: InterviewDetailResponseDto | null;
  onRetry: () => void;
  duration?: number | null;
}

export function ResultsView({ result, onRetry, duration }: ResultsViewProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<"strengths" | "improve">(
    "strengths",
  );
  const [highlightedTurnId, setHighlightedTurnId] = useState<string | null>(null);
  const [expandedSignals, setExpandedSignals] = useState<Record<number, boolean>>({});

  const handleScrollToTurn = (turnId: string) => {
    setHighlightedTurnId(turnId);
    const element = document.getElementById(`turn-${turnId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setHighlightedTurnId(null);
      }, 3500);
    }
  };

  const toggleSignalsExpand = (index: number) => {
    setExpandedSignals((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  function highlightEvidence(answer: string, quote: string | null | undefined): React.ReactNode {
    if (!quote || !answer) return answer;
    const trimmedQuote = quote.trim();
    if (!trimmedQuote) return answer;

    const index = answer.toLowerCase().indexOf(trimmedQuote.toLowerCase());
    if (index === -1) return answer;

    const before = answer.slice(0, index);
    const matched = answer.slice(index, index + trimmedQuote.length);
    const after = answer.slice(index + trimmedQuote.length);

    return (
      <>
        {before}
        <mark className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-100 px-1 py-0.5 rounded font-medium border border-yellow-200/40">
          {matched}
        </mark>
        {after}
      </>
    );
  }

  const getDepthSignalLabel = (depth: string | null | undefined) => {
    if (!depth) return null;
    const d = depth.toLowerCase();
    if (d.includes("shallow")) return t("interview.results.depth.shallow");
    if (d.includes("adequate")) return t("interview.results.depth.adequate");
    if (d.includes("deep")) return t("interview.results.depth.deep");
    if (d.includes("evasive")) return t("interview.results.depth.evasive");
    return formatMetricLabel(depth);
  };

  if (!result) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <Alert className="border-slate-200 bg-white">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("interview.results.noResultTitle")}</AlertTitle>
          <AlertDescription>
            {t("interview.results.noResultDescription")}
          </AlertDescription>
        </Alert>
        <Button onClick={onRetry} className="rounded-xl font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("interview.history.startNew")}
        </Button>
      </div>
    );
  }

  const view = toInterviewResultViewModel(result, {
    summary: t("interview.results.noSummary"),
  });
  const effectiveDuration = view.durationSeconds ?? duration ?? null;
  const strengths = collectTurnItems(view.questions, "strengths");
  const improvements = collectTurnItems(view.questions, "improvements");

  const phaseCounts = view.questions.reduce((acc, q) => {
    const rawPhase = q.topicPhase || 'SCREENING';
    const phase = rawPhase.toUpperCase().includes("PROBE") || rawPhase.toUpperCase().includes("JD") || rawPhase.toUpperCase().includes("REQUIREMENT")
      ? "SKILL_PROBE"
      : rawPhase.toUpperCase();
    acc[phase] = (acc[phase] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const isVi = i18n?.language?.startsWith("vi") ?? true;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
      {/* Interview Phase Timeline */}
      <Card className="border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">{t("interview.results.phaseTimelineTitle")}</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
          {PHASES.map((p, idx) => {
            const count = phaseCounts[p.key] || 0;
            const isCompleted = count > 0;
            return (
              <div key={p.key} className="flex-1 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold shrink-0 transition-colors",
                    isCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    {isCompleted ? "✓" : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {isVi ? p.labelVi : p.labelEn}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {count > 0 ? t("interview.results.answeredQuestions", { count }) : t("interview.results.phaseNotReached")}
                    </p>
                  </div>
                </div>
                {idx < PHASES.length - 1 && (
                  <div className="hidden md:block flex-1 h-[2px] bg-slate-100 mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <ScoreDonut
              score={view.overallScore}
              label={t("interview.stats.overall")}
            />

            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <ScoreCard
                label={t("interview.results.semantic")}
                value={view.semanticScore}
                icon={BarChart3}
              />
              <ScoreCard
                label={t("interview.results.llmScore")}
                value={view.llmScore}
                icon={Sparkles}
              />
              <ScoreCard
                label={t("interview.results.communication")}
                value={view.communicationScore}
                icon={Mic}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge variant="secondary" className="rounded-full">
              {view.targetRole.replace(/_/g, " ")}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("interview.results.duration", {
                duration: formatDuration(effectiveDuration),
              })}
            </span>
            <span>
              {t("interview.results.answeredQuestions", {
                count: view.questions.length,
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-5">
        <Card className="border-slate-200 bg-white shadow-sm md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                <Bot className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-sm">
                  {t("interview.results.summaryTitle")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("interview.results.summaryDescription")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {view.summary}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm md:col-span-3">
          <CardHeader className="border-b border-slate-100 pb-3">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "strengths" | "improve")
              }
            >
              <TabsList>
                <TabsTrigger value="strengths" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("interview.results.strengths")}
                </TabsTrigger>
                <TabsTrigger value="improve" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t("interview.results.improve")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {(activeTab === "strengths" ? strengths : improvements).length ===
              0 ? (
                <li className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                  {activeTab === "strengths"
                    ? t("interview.results.emptyStrengths")
                    : t("interview.results.emptyImprove")}
                </li>
              ) : (
                (activeTab === "strengths" ? strengths : improvements).map(
                  (item, index) => (
                    <li
                      key={`${activeTab}-${index}-${item}`}
                      className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                          activeTab === "strengths"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="leading-relaxed text-slate-700">
                        {item}
                      </span>
                    </li>
                  ),
                )
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <MetricPanel
          title={t("interview.results.technicalDelivery")}
          description={t("interview.results.technicalDeliveryDescription")}
          icon={Shield}
          metrics={view.technicalDelivery}
          empty={t("interview.results.noMetrics")}
        />
        <MetricPanel
          title={t("interview.results.communicationFlow")}
          description={t("interview.results.communicationFlowDescription")}
          icon={Mic}
          metrics={view.communicationFlow}
          empty={t("interview.results.noMetrics")}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <RubricPanel
          title={t("interview.results.rubricBreakdown")}
          description={t("interview.results.rubricBreakdownDescription")}
          dimensions={view.rubricDimensions}
          scoreExplanations={view.scoreExplanations}
          handleScrollToTurn={handleScrollToTurn}
          empty={t("interview.results.noMetrics")}
          weightLabel={t("interview.results.weight")}
          t={t}
        />
        <EvidencePanel
          title={t("interview.results.confidenceEvidence")}
          description={t("interview.results.confidenceEvidenceDescription")}
          metrics={view.confidenceEvidence}
          empty={t("interview.results.confidenceEvidenceEmpty")}
        />
      </div>

      {view.gapItems && view.gapItems.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <CardTitle className="text-[15px]">{t("interview.results.gapAnalysisTitle")}</CardTitle>
                <CardDescription>{t("interview.results.gapAnalysisDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 pb-6">
            {view.gapItems.map((gap) => (
              <div
                key={`${gap.weaknessType}-${gap.skillCanonical ?? gap.displayName}`}
                className="rounded-lg border border-slate-150 bg-slate-50/50 p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{gap.displayName}</h4>
                    <Badge className={cn(
                      "rounded-full text-[10px] font-bold shrink-0",
                      gapSeverityLevel(gap.severity) === "critical" ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"
                    )} variant="outline">
                      {gapSeverityLevel(gap.severity) === "critical"
                        ? t("interview.results.gapCritical")
                        : t("interview.results.gapModerate")}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {gap.recommendedAction}
                  </p>
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-100/60 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold rounded-md border-emerald-200 hover:bg-emerald-50 text-emerald-700 bg-white flex-1"
                    onClick={() => navigate("/learning")}
                  >
                    <BookOpen className="mr-1 h-3 w-3 shrink-0" />
                    {t("interview.results.actionLearn")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold rounded-md border-blue-200 hover:bg-blue-50 text-blue-700 bg-white flex-1"
                    onClick={onRetry}
                  >
                    <RefreshCw className="mr-1 h-3 w-3 shrink-0" />
                    {t("interview.results.actionPractice")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px]">
              {t("interview.results.recommendedNextSteps")}
            </CardTitle>
            <CardDescription>
              {t("interview.results.recommendedNextStepsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {view.coachingSummary && (
              <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {view.coachingSummary}
              </p>
            )}
            <TagList
              title={t("interview.results.recommendations")}
              items={view.recommendations}
              empty={t("interview.results.noItems")}
            />
            <TagList
              title={t("interview.results.suggestedModules")}
              items={view.modules}
              empty={t("interview.results.noItems")}
            />
            <TagList
              title={t("interview.results.coachingStrengths")}
              items={view.coachingStrengths}
              empty={t("interview.results.noItems")}
            />
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px]">
              {t("interview.results.developmentPlan")}
            </CardTitle>
            <CardDescription>
              {t("interview.results.developmentPlanDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PriorityList
              title={t("interview.results.coachingPriorities")}
              items={view.coachingPriorities}
              empty={t("interview.results.noItems")}
            />
            <PlanItemList
              title={t("interview.results.devPlanItems")}
              items={view.devPlanItems}
              empty={t("interview.results.noItems")}
              onRetry={onRetry}
              navigate={navigate}
              t={t}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
              <History className="h-4 w-4 text-slate-600" />
            </div>
            <CardTitle className="text-[15px]">
              {t("interview.results.questionAnalysis")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {view.questions.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              {t("interview.results.noPersistedAnswers")}
            </div>
          ) : (
            view.questions.map((question, index) => {
              const explanation = view.scoreExplanations?.find(
                (e) => e.linked_question_id === question.id
              );
              const signals = question.signals;

              return (
                <div
                  key={`${question.question}-${index}`}
                  id={`turn-${question.id}`}
                  className={cn(
                    "p-5 transition-all duration-700 scroll-mt-24",
                    highlightedTurnId === question.id && "bg-amber-50/70 border-l-4 border-l-amber-500 shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">
                        {index + 1}. {question.question}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant={
                            question.isCuratedQuestion ? "default" : "secondary"
                          }
                          className="rounded-full"
                        >
                          {question.isCuratedQuestion
                            ? t("interview.results.curatedQuestion")
                            : t("interview.results.fallbackQuestion")}
                        </Badge>
                        {question.topicPhase && (
                          <Badge variant="outline" className="rounded-full">
                            {t("interview.results.phase")}:{" "}
                            {formatMetricLabel(question.topicPhase)}
                          </Badge>
                        )}
                        {question.skillCanonical && (
                          <Badge variant="outline" className="rounded-full">
                            {t("interview.results.skill")}:{" "}
                            {formatMetricLabel(question.skillCanonical)}
                          </Badge>
                        )}
                        {question.depthSignal && (
                          <Badge variant="outline" className="rounded-full">
                            {t("interview.results.depthSignal")}:{" "}
                            {getDepthSignalLabel(question.depthSignal)}
                          </Badge>
                        )}
                        {question.questionBankKey && (
                          <Badge variant="secondary" className="rounded-full">
                            {t("interview.results.questionBankKey", {
                              key: question.questionBankKey,
                            })}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                        {highlightEvidence(question.answer, explanation?.evidence_quote)}
                      </p>

                      {question.guardAdjustments.length > 0 && (
                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            {t("interview.results.guardTitle")}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {question.guardAdjustments.map((slug) => (
                              <li key={slug} className="text-xs leading-relaxed text-amber-900">
                                {t(`interview.results.guard.${slug}`)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Collapsible Communication Signals Panel */}
                      {signals && (
                        <div className="mt-3 border border-slate-100 rounded-lg overflow-hidden bg-white/40 shadow-sm">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100/75 transition-colors border-b border-slate-100"
                            onClick={() => toggleSignalsExpand(index)}
                          >
                            <div className="flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-slate-500" />
                              <span>{t("interview.results.commPanel")}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {expandedSignals[index]
                                ? `${t("interview.results.commCollapse")} ▴`
                                : `${t("interview.results.commExpand")} ▾`}
                            </span>
                          </button>
                          {expandedSignals[index] && (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs leading-relaxed">
                              {/* Speaking rate */}
                              <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commWpm")}</span>
                                <span className="font-bold text-slate-700">
                                  {question.durationSeconds && question.durationSeconds > 0 && signals.word_count
                                    ? t("interview.results.commWpmVal", { wpm: Math.round((signals.word_count / question.durationSeconds) * 60) })
                                    : t("interview.results.commWpmUnavailable")}
                                </span>
                              </div>

                              {/* Conciseness */}
                              <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commConciseness")}</span>
                                <span className="font-bold text-slate-700">
                                  {signals.conciseness
                                    ? t(`interview.results.commConciseness_${signals.conciseness}`)
                                    : "N/A"}
                                </span>
                              </div>

                              {/* STAR Coverage */}
                              <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commStar")}</span>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {['situation', 'task', 'action', 'result'].map(part => {
                                    const present = signals.star?.[part as keyof typeof signals.star];
                                    return (
                                      <Badge
                                        key={part}
                                        className={cn(
                                          "text-[9px] font-bold px-1 py-0 rounded shrink-0",
                                          present ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                                        )}
                                        variant="outline"
                                      >
                                        {part.toUpperCase().charAt(0)}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Filler words */}
                              {signals.filler && (
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                  <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commFiller")}</span>
                                  <span className="font-bold text-slate-700">{signals.filler.count}</span>
                                  {signals.filler.terms && signals.filler.terms.length > 0 && (
                                    <span className="text-[10px] text-slate-500 block font-medium mt-0.5 truncate">({signals.filler.terms.join(', ')})</span>
                                  )}
                                </div>
                              )}

                              {/* Hedging words */}
                              {signals.hedging && (
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                  <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commHedging")}</span>
                                  <span className="font-bold text-slate-700">{signals.hedging.count}</span>
                                  {signals.hedging.terms && signals.hedging.terms.length > 0 && (
                                    <span className="text-[10px] text-slate-500 block font-medium mt-0.5 truncate">({signals.hedging.terms.join(', ')})</span>
                                  )}
                                </div>
                              )}

                              {/* JD keywords coverage */}
                              {signals.jd_term_hits && (
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100">
                                  <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commJdCoverage")}</span>
                                  <span className="font-bold text-slate-700">{Math.round(signals.jd_term_hits.coverage * 100)}%</span>
                                  {signals.jd_term_hits.hit && signals.jd_term_hits.hit.length > 0 && (
                                    <span className="text-[10px] text-slate-500 block font-medium mt-0.5 truncate">{t("interview.results.commJdHitLabel")}: {signals.jd_term_hits.hit.join(', ')}</span>
                                  )}
                                </div>
                              )}

                              {/* Repeated terms */}
                              {signals.repeated_terms && signals.repeated_terms.length > 0 && (
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 sm:col-span-2 md:col-span-3">
                                  <span className="font-bold text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">{t("interview.results.commRepeated")}</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {signals.repeated_terms.map(item => (
                                      <Badge key={item.term} variant="outline" className="text-[10px] text-slate-600 bg-white">
                                        {item.term} ({item.count})
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {question.confidenceEvidence.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {question.confidenceEvidence.map((metric) => (
                            <div
                              key={`${question.question}-${metric.label}`}
                              className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs"
                            >
                              <span className="font-bold text-slate-500">
                                {metric.label}
                              </span>
                              <span className="ml-2 font-semibold text-slate-800">
                                {metric.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-lg font-black",
                          scoreColor(question.score),
                        )}
                      >
                        {question.score == null ? "N/A" : `${question.score}%`}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatDuration(question.durationSeconds)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Button
        size="lg"
        className="w-full rounded-xl font-bold md:w-auto"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        {t("interview.history.startNew")}
      </Button>
    </div>
  );
}

function RubricPanel({
  title,
  description,
  dimensions,
  scoreExplanations,
  handleScrollToTurn,
  empty,
  weightLabel,
  t,
}: {
  title: string;
  description: string;
  dimensions: Array<{
    dimension: string;
    score: number;
    band: string;
    weight: number;
  }>;
  scoreExplanations: InterviewScoreExplanationViewModel[];
  handleScrollToTurn: (turnId: string) => void;
  empty: string;
  weightLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
            <Gauge className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {dimensions.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            {empty}
          </p>
        ) : (
          dimensions.map((dimension) => {
            const explanation = scoreExplanations?.find(
              (e) => e.dimension.toLowerCase() === dimension.dimension.toLowerCase()
            );

            return (
              <div key={dimension.dimension} className="space-y-1.5 p-2 rounded-lg hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  {explanation ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:text-[#00AEEF] text-slate-700 transition-colors focus:outline-none text-left">
                          <span className="text-[13px] font-semibold">
                            {formatMetricLabel(dimension.dimension)}
                          </span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4 shadow-lg border border-slate-150 bg-white z-50" side="top" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="font-bold text-sm text-slate-800">
                              {formatMetricLabel(dimension.dimension)}
                            </h4>
                            <Badge className="rounded-full bg-indigo-50 border-indigo-150 text-indigo-700" variant="outline">{dimension.score}%</Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">
                            {t("interview.results.popover.band")}: {formatMetricLabel(dimension.band)}
                          </p>
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100/60 text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto font-mono">
                            {explanation.rubric_anchor}
                          </div>
                          {explanation.evidence_quote && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {t("interview.results.popover.evidenceQuote")}
                              </p>
                              <div className="bg-slate-50/50 rounded-lg p-2 border-l-2 border-l-emerald-500 text-xs italic text-slate-600 leading-relaxed">
                                "{explanation.evidence_quote}"
                              </div>
                              {explanation.linked_question_id && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-1.5 w-full text-xs font-semibold gap-1.5 h-8 bg-white"
                                  onClick={() => handleScrollToTurn(explanation.linked_question_id!)}
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  {t("interview.results.popover.viewInTranscript")}
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>{t("interview.results.popover.uncertainty")}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              explanation.uncertainty === "high" ? "bg-rose-50 text-rose-700" :
                              explanation.uncertainty === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                            )}>
                              {t(`interview.results.popover.uncertainty_${explanation.uncertainty}`)}
                            </span>
                          </div>
                          {explanation.improvement_hint && (
                            <div className="bg-amber-50/60 border border-amber-100/60 rounded-lg p-2.5 text-xs text-amber-800 leading-relaxed space-y-0.5">
                              <p className="font-bold">{t("interview.results.popover.improvementHint")}:</p>
                              <p className="font-medium">{explanation.improvement_hint}</p>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-[13px] font-semibold text-slate-700">
                      {formatMetricLabel(dimension.dimension)}
                    </span>
                  )}
                  <span className={cn("text-sm font-bold tabular-nums", scoreColor(dimension.score))}>
                    {dimension.score}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      dimension.score >= 80
                        ? "bg-emerald-500"
                        : dimension.score >= 60
                          ? "bg-amber-500"
                          : "bg-red-500",
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>{formatMetricLabel(dimension.band)}</span>
                  <span>
                    {dimension.weight}% {weightLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function EvidencePanel({
  title,
  description,
  metrics,
  empty,
}: {
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string }>;
  empty: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
            <Target className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {metrics.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2">
            {empty}
          </p>
        ) : (
          metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {metric.value}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ScoreDonut({ score, label }: { score: number | null; label: string }) {
  const value = score ?? 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-36 w-36">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke={value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444"}
          strokeLinecap="round"
          strokeWidth="8"
          strokeDasharray={`${(value / 100) * 327} 327`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-slate-900">
          {score == null ? "N/A" : `${score}%`}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center">
      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <p className="text-xl font-black text-slate-900">
        {value == null ? "N/A" : `${value}%`}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MetricPanel({
  title,
  description,
  icon: Icon,
  metrics,
  empty = "No metrics are available yet.",
}: {
  title: string;
  description: string;
  icon: typeof Shield;
  metrics: Record<string, number> | null;
  empty?: string;
}) {
  const entries = metrics ? Object.entries(metrics) : [];
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            {empty}
          </p>
        ) : (
          entries.map(([label, value]) => (
            <MetricBar
              key={label}
              label={formatMetricLabel(label)}
              value={value}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-700">
          {label}
        </span>
        <span
          className={cn("text-sm font-bold tabular-nums", scoreColor(value))}
        >
          {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 80
              ? "bg-emerald-500"
              : value >= 60
                ? "bg-amber-500"
                : "bg-red-500",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function TagList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="secondary" className="rounded-md">
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ track: string; title: string; why: string }>;
  empty: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.track}-${item.title}`}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <ListChecks className="h-3.5 w-3.5 text-primary" />
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                {item.why}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanItemList({
  title,
  items,
  empty,
  onRetry,
  navigate,
  t,
}: {
  title: string;
  items: Array<{
    track: string;
    title: string;
    priority: number | null;
    rationale: string;
  }>;
  empty: string;
  onRetry: () => void;
  navigate: ReturnType<typeof useNavigate>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => {
            const trackKind = devPlanTrackKind(item.track);
            const isLearn = trackKind === "learn";
            const isPractice = trackKind === "practice";
            const isCv = trackKind === "cv";

            return (
              <div
                key={`${item.track}-${item.title}`}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3 animate-in fade-in duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {item.title}
                    </p>
                    {item.rationale && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {item.rationale}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isLearn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold rounded-md border-emerald-200 hover:bg-emerald-50 text-emerald-700 bg-white"
                          onClick={() => navigate("/learning")}
                        >
                          <BookOpen className="mr-1 h-3 w-3 shrink-0" />
                          {t("interview.results.actionLearn")}
                        </Button>
                      )}
                      {isPractice && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold rounded-md border-blue-200 hover:bg-blue-50 text-blue-700 bg-white"
                          onClick={onRetry}
                        >
                          <RefreshCw className="mr-1 h-3 w-3 shrink-0" />
                          {t("interview.results.actionPractice")}
                        </Button>
                      )}
                      {isCv && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold rounded-md border-purple-200 hover:bg-purple-50 text-purple-700 bg-white"
                          onClick={() => navigate("/cv-studio")}
                        >
                          <FileText className="mr-1 h-3 w-3 shrink-0" />
                          {t("interview.results.actionCvFix")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.priority != null && (
                    <Badge variant="secondary" className="shrink-0 rounded-full">
                      {Math.round(item.priority * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function collectTurnItems(
  questions: Array<{ strengths: string[]; improvements: string[] }>,
  key: "strengths" | "improvements",
): string[] {
  return Array.from(
    new Set(questions.flatMap((question) => question[key])),
  ).slice(0, 6);
}

function formatMetricLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreColor(value: number | null): string {
  if (value == null) return "text-slate-500";
  if (value >= 80) return "text-emerald-600";
  if (value >= 60) return "text-amber-600";
  return "text-red-600";
}
