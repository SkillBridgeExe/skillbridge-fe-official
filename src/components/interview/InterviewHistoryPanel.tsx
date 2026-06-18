import { Award, BarChart3, CalendarDays, History, RefreshCw, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InterviewSessionDto } from "@/api/interview-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getInterviewSessionStatusKey,
  type InterviewHistoryState,
} from "./interview-view-model";
import { AVAILABLE_TARGET_ROLES } from "./types";

interface InterviewHistoryPanelProps {
  state: InterviewHistoryState;
  sessions: InterviewSessionDto[];
  selectedSessionId: string | null;
  isFetching: boolean;
  canSelectHistory: boolean;
  onRetry: () => void;
  onSelectSession: (sessionId: string) => void;
  onStartNew: () => void;
}

export function InterviewHistoryPanel({
  state,
  sessions,
  selectedSessionId,
  isFetching,
  canSelectHistory,
  onRetry,
  onSelectSession,
  onStartNew,
}: InterviewHistoryPanelProps) {
  const { t, i18n } = useTranslation("common");
  const dateLocale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const scoredSessions = sessions.filter((session) => session.overallScore != null);
  const averageScore =
    scoredSessions.length > 0
      ? Math.round(
          scoredSessions.reduce((sum, session) => sum + Number(session.overallScore), 0) /
            scoredSessions.length,
        )
      : null;
  const bestScore =
    scoredSessions.length > 0
      ? Math.max(...scoredSessions.map((session) => Math.round(Number(session.overallScore))))
      : null;
  const roleLabel = (value: string): string =>
    t(`interview.roles.${value}`, {
      defaultValue: AVAILABLE_TARGET_ROLES.find((role) => role.value === value)?.label ?? value.replace(/_/g, " "),
    });
  const formatDate = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("interview.history.unknownDate");
    return new Intl.DateTimeFormat(dateLocale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <main className="custom-scrollbar relative flex-1 overflow-y-auto bg-slate-50/30">
      <div className="space-y-6 px-6 py-6 md:px-10 md:py-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {t("interview.history.eyebrow")}
            </p>
            <h1 className="mt-1 font-poppins text-2xl font-bold text-slate-900">
              {t("interview.history.title")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("interview.history.subtitle")}</p>
          </div>

          <Button type="button" className="rounded-xl font-bold" onClick={onStartNew}>
            {t("interview.history.startNew")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <HistoryStat label={t("interview.stats.total")} value={String(sessions.length)} icon={Video} />
          <HistoryStat label={t("interview.stats.completed")} value={String(scoredSessions.length)} icon={History} />
          <HistoryStat
            label={t("interview.stats.avgScore")}
            value={averageScore == null ? "N/A" : `${averageScore}%`}
            icon={BarChart3}
          />
          <HistoryStat
            label={t("interview.stats.best")}
            value={bestScore == null ? "N/A" : `${bestScore}%`}
            icon={Award}
          />
        </div>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base">{t("interview.history.sessionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {state === "signed-out" ? (
              <HistoryPanelState
                title={t("interview.history.signedOutTitle")}
                description={t("interview.history.signedOutDescription")}
              />
            ) : state === "loading" ? (
              <HistoryPanelState
                title={t("interview.history.loadingTitle")}
                description={t("interview.history.loadingDescription")}
                spinning
              />
            ) : state === "error" ? (
              <HistoryPanelState
                title={t("interview.history.errorTitle")}
                description={t("interview.history.errorDescription")}
                actionLabel={
                  isFetching ? t("interview.sidebar.retrying") : t("interview.sidebar.tryAgain")
                }
                actionDisabled={isFetching}
                onAction={onRetry}
              />
            ) : state === "empty" ? (
              <HistoryPanelState
                title={t("interview.history.emptyTitle")}
                description={t("interview.history.emptyDescription")}
                actionLabel={t("interview.history.startNew")}
                onAction={onStartNew}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.slice(0, 10).map((session) => {
                  const selected = session.id === selectedSessionId;
                  const score = session.overallScore == null ? null : Math.round(session.overallScore);
                  const statusKey = getInterviewSessionStatusKey(session.status);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      disabled={!canSelectHistory}
                      className={cn(
                        "flex w-full flex-col gap-3 p-4 text-left transition-colors md:flex-row md:items-center md:justify-between",
                        selected ? "bg-primary/10" : "hover:bg-slate-50",
                        !canSelectHistory && "cursor-not-allowed opacity-60 hover:bg-transparent",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {roleLabel(session.targetRole)}
                          </p>
                          <Badge variant="secondary" className="rounded-full">
                            {t(`interview.status.${statusKey}`)}
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(session.createdAt)}
                          {session.interviewType ? ` · ${formatInterviewType(session.interviewType, t)}` : ""}
                        </p>
                      </div>

                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-lg font-black text-primary">
                          {score == null ? "N/A" : `${score}%`}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {t("interview.stats.overall")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function HistoryStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Video;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="mb-2 h-4 w-4 text-slate-400" />
      <p className="text-xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
    </div>
  );
}

function HistoryPanelState({
  title,
  description,
  spinning = false,
  actionLabel,
  actionDisabled = false,
  onAction,
}: {
  title: string;
  description: string;
  spinning?: boolean;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
        <RefreshCw className={cn("h-5 w-5 text-slate-500", spinning && "animate-spin")} />
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

function formatInterviewType(type: string, t: (key: string, options?: { defaultValue?: string }) => string): string {
  const normalized = type.toLowerCase();
  if (normalized === "technical" || normalized === "hr" || normalized === "mixed") {
    return t(`interview.setup.type.${normalized}`);
  }
  return type;
}
