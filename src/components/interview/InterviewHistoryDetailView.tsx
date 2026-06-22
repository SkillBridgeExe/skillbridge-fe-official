import { AlertCircle, ArrowLeft, RefreshCw, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InterviewDetailResponseDto } from "@/api/interview-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResultsView } from "./ResultsView";
import type { InterviewHistoryDetailState } from "./interview-view-model";

interface InterviewHistoryDetailViewProps {
  state: InterviewHistoryDetailState;
  result: InterviewDetailResponseDto | null;
  isFetching: boolean;
  onRetry: () => void;
  onBackToHistory: () => void;
  onStartNew: () => void;
}

export function InterviewHistoryDetailView({
  state,
  result,
  isFetching,
  onRetry,
  onBackToHistory,
  onStartNew,
}: InterviewHistoryDetailViewProps) {
  const { t } = useTranslation("common");

  return (
    <main className="custom-scrollbar relative flex-1 overflow-y-auto bg-slate-50/30">
      <div className="space-y-5 px-6 py-6 md:px-10 md:py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {t("interview.history.eyebrow")}
            </p>
            <h1 className="mt-1 font-poppins text-2xl font-bold text-slate-900">
              {t("interview.detail.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("interview.detail.subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl font-bold" onClick={onBackToHistory}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("interview.detail.backToHistory")}
            </Button>
            <Button type="button" className="rounded-xl font-bold" onClick={onStartNew}>
              {t("interview.history.startNew")}
            </Button>
          </div>
        </div>

        {state === "loading" || state === "idle" ? (
          <HistoryDetailStateCard
            icon={RefreshCw}
            title={t("interview.detail.loadingTitle")}
            description={t("interview.detail.loadingDescription")}
            spinning
          />
        ) : state === "error" ? (
          <HistoryDetailStateCard
            icon={AlertCircle}
            title={t("interview.detail.errorTitle")}
            description={t("interview.detail.errorDescription")}
            actionLabel={isFetching ? t("interview.sidebar.retrying") : t("interview.sidebar.tryAgain")}
            actionDisabled={isFetching}
            onAction={onRetry}
          />
        ) : state === "not-scored" ? (
          <HistoryDetailStateCard
            icon={AlertCircle}
            title={t("interview.detail.notScoredTitle")}
            description={t("interview.detail.notScoredDescription")}
          />
        ) : (
          <ResultsView result={result} duration={result?.durationSeconds} onRetry={onStartNew} />
        )}
      </div>
    </main>
  );
}

function HistoryDetailStateCard({
  icon: Icon,
  title,
  description,
  spinning = false,
  actionLabel,
  actionDisabled = false,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  spinning?: boolean;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
        <Icon className={cn("h-5 w-5 text-slate-500", spinning && "animate-spin")} />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          className="mt-5 rounded-xl font-bold"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
