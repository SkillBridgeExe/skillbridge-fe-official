import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  History,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { formatDuration, toInterviewResultViewModel } from "./interview-view-model";

interface ResultsViewProps {
  result: InterviewDetailResponseDto | null;
  onRetry: () => void;
  duration?: number | null;
}

export function ResultsView({ result, onRetry, duration }: ResultsViewProps) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<"strengths" | "improve">("strengths");

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

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <ScoreDonut score={view.overallScore} label={t("interview.stats.overall")} />

            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
              <ScoreCard label={t("interview.results.semantic")} value={view.semanticScore} icon={BarChart3} />
              <ScoreCard label={t("interview.results.llmScore")} value={view.llmScore} icon={Sparkles} />
              <ScoreCard label={t("interview.results.communication")} value={view.communicationScore} icon={Mic} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge variant="secondary" className="rounded-full">
              {view.targetRole.replace(/_/g, " ")}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t("interview.results.duration", { duration: formatDuration(effectiveDuration) })}
            </span>
            <span>{t("interview.results.answeredQuestions", { count: view.questions.length })}</span>
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
                <CardTitle className="text-sm">{t("interview.results.summaryTitle")}</CardTitle>
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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "strengths" | "improve")}>
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
              {(activeTab === "strengths" ? strengths : improvements).length === 0 ? (
                <li className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                  {activeTab === "strengths"
                    ? t("interview.results.emptyStrengths")
                    : t("interview.results.emptyImprove")}
                </li>
              ) : (
                (activeTab === "strengths" ? strengths : improvements).map((item, index) => (
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
                    <span className="leading-relaxed text-slate-700">{item}</span>
                  </li>
                ))
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
        <MetricPanel
          title={t("interview.results.bodyLanguage")}
          description={t("interview.results.bodyLanguageDescription")}
          icon={UserCheck}
          metrics={view.bodyLanguage}
          empty={t("interview.results.bodyLanguageEmpty")}
        />
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-[15px]">{t("interview.results.recommendedNextSteps")}</CardTitle>
            <CardDescription>{t("interview.results.recommendedNextStepsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagList title={t("interview.results.recommendations")} items={view.recommendations} empty={t("interview.results.noItems")} />
            <TagList title={t("interview.results.suggestedModules")} items={view.modules} empty={t("interview.results.noItems")} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white">
              <History className="h-4 w-4 text-slate-600" />
            </div>
            <CardTitle className="text-[15px]">{t("interview.results.questionAnalysis")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {view.questions.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">{t("interview.results.noPersistedAnswers")}</div>
          ) : (
            view.questions.map((question, index) => (
              <div key={`${question.question}-${index}`} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {index + 1}. {question.question}
                    </p>
                    <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      {question.answer}
                    </p>
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
            ))
          )}
        </CardContent>
      </Card>

      <Button size="lg" className="w-full rounded-xl font-bold md:w-auto" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {t("interview.history.startNew")}
      </Button>
    </div>
  );
}

function ScoreDonut({ score, label }: { score: number | null; label: string }) {
  const value = score ?? 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-36 w-36">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
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
      <p className="text-xl font-black text-slate-900">{value == null ? "N/A" : `${value}%`}</p>
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
            <MetricBar key={label} label={formatMetricLabel(label)} value={value} />
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
        <span className="text-[13px] font-semibold text-slate-700">{label}</span>
        <span className={cn("text-sm font-bold tabular-nums", scoreColor(value))}>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function TagList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
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

function collectTurnItems(
  questions: Array<{ strengths: string[]; improvements: string[] }>,
  key: "strengths" | "improvements",
): string[] {
  return Array.from(new Set(questions.flatMap((question) => question[key]))).slice(0, 6);
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
