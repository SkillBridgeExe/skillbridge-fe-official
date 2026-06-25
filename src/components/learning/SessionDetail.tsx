import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  GraduationCap,
  Clock,
  Star,
  Lock,
  ArrowLeft,
  PlayCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  FileText,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Code,
  Terminal,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { LearningSession } from "./types";
import { AIChatPanel } from "./AIChatPanel";
import { useActiveWeekPlans, useRoadmapStore } from "@/components/learning/roadmap-store";
import { hasApiAuthSession } from "@/services/auth-session.service";
import {
  getLearningSessionProgress,
  saveLearningSessionProgress,
} from "@/services/learning-roadmap.service";
import { buildInternalResourceTask } from "./internal-resource-content";
import { getActiveSessionResource } from "./session-content";
import { getNextLearningSectionId, selectLearningSection } from "./session-navigation";
import {
  applyProgressToSession,
  createInitialSessionProgress,
  isSessionReadyToComplete,
  setExerciseProof,
  toggleChecklistItem,
  readStoredSessionProgress,
  writeStoredSessionProgress,
  toggleSavedCourse,
  type SessionProgressState,
} from "./session-progress";

// ─── Helpers ─────────────────────────────────────────
// Build timeline from session sections dynamically
function buildTimeline(session: LearningSession) {
  let mins = 0;
  const perSection = Math.round(session.estimatedMinutes / Math.max(session.sections.length, 1));
  return session.sections.map(sec => {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    const label = sec.title;
    mins += perSection;
    return { time: `${h}:${m}`, label };
  });
}

function buildQuiz(session: LearningSession) {
  if (session.lessonContent?.quiz && session.lessonContent.quiz.length) {
    return session.lessonContent.quiz.map((item) => ({
      question: item.question,
      options: item.options,
      correct: item.correctOptionIndex,
      explanation: item.explanation,
    }));
  }

  return [];
}

function buildResourceSummary(session: LearningSession): string[] {
  if (session.lessonContent?.summary) {
    return [
      session.lessonContent.summary,
      ...session.lessonContent.sections.map((section) => `${section.title}: ${section.body}`),
    ];
  }

  return [];
}

function displayScore(value?: number): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function fallbackOutcomeLabel(value?: string): string {
  return value?.replace(/_/g, " ").trim() || "practice";
}

type SessionResource = LearningSession["resources"][number];
type RecommendedCourse = NonNullable<LearningSession["recommendedCourses"]>[number];



function ResourceMetaBadges({ resource }: { resource: SessionResource }) {
  const { t } = useTranslation("common");

  const getScoreBadgeClass = (key: string) => {
    if (key.includes("matchScore")) {
      return "border-emerald-100 bg-emerald-50 text-emerald-700 font-semibold";
    }
    if (key.includes("qualityScore")) {
      return "border-violet-100 bg-violet-50 text-violet-700 font-semibold";
    }
    return "border-sky-100 bg-sky-50 text-sky-700 font-semibold";
  };

  const scores = [
    ["learning.common.matchScore", displayScore(resource.matchScore)],
    ["learning.common.qualityScore", displayScore(resource.qualityScore)],
    ["learning.common.freshnessScore", displayScore(resource.freshnessScore)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium capitalize">
        {resource.platform ?? resource.type}
      </Badge>
      {resource.duration && (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
          <Clock className="mr-1 h-3 w-3 text-slate-400" /> {resource.duration}
        </Badge>
      )}
      {resource.outcomeType && (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
          {fallbackOutcomeLabel(resource.outcomeType)}
        </Badge>
      )}
      {resource.lowConfidence && (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-xs text-amber-700 font-medium">
          {t("learning.common.pendingSource")}
        </Badge>
      )}
      {scores.map(([labelKey, score]) => (
        <Badge key={labelKey} variant="outline" className={cn("text-xs", getScoreBadgeClass(labelKey))}>
          {t(labelKey, { score })}
        </Badge>
      ))}
    </div>
  );
}

function ResourceCard({
  resource,
  primary = false,
  onToggleSaveCourse,
  progress,
}: {
  resource: SessionResource;
  primary?: boolean;
  onToggleSaveCourse?: (courseId: string) => void;
  progress?: SessionProgressState;
}) {
  const { t } = useTranslation("common");
  const outcomeTypeKey = resource.outcomeType?.replace(/-/g, "_") || "practice";
  const outcomeLabel = t(`learning.internal.outcomeType.${outcomeTypeKey}`, {
    defaultValue: fallbackOutcomeLabel(resource.outcomeType),
  });
  const internalTask = buildInternalResourceTask(resource, {
    label: t("learning.internal.label"),
    defaultProof: t("learning.internal.defaultProof"),
    defaultDescription: t("learning.internal.defaultDescription", {
      outcome: outcomeLabel,
      title: resource.title,
    }),
    genericCriteria: [
      t("learning.internal.genericCriteria.complete"),
      t("learning.internal.genericCriteria.evidence"),
      t("learning.internal.genericCriteria.reflection"),
    ],
    outcomeCriteria: {
      interview_answer: [
        t("learning.internal.outcomeCriteria.interviewAnswer.answer"),
        t("learning.internal.outcomeCriteria.interviewAnswer.star"),
        t("learning.internal.outcomeCriteria.interviewAnswer.close"),
      ],
      project: [
        t("learning.internal.outcomeCriteria.project.build"),
        t("learning.internal.outcomeCriteria.project.readme"),
        t("learning.internal.outcomeCriteria.project.proof"),
      ],
      portfolio: [
        t("learning.internal.outcomeCriteria.portfolio.create"),
        t("learning.internal.outcomeCriteria.portfolio.explain"),
        t("learning.internal.outcomeCriteria.portfolio.attach"),
      ],
      cv_bullet: [
        t("learning.internal.outcomeCriteria.cvBullet.rewrite"),
        t("learning.internal.outcomeCriteria.cvBullet.impact"),
        t("learning.internal.outcomeCriteria.cvBullet.match"),
      ],
    },
  });

  const getBorderAccent = (type: string) => {
    switch (type) {
      case "course": return "border-l-4 border-l-emerald-500";
      case "video": return "border-l-4 border-l-rose-500";
      case "mini_project":
      case "exercise": return "border-l-4 border-l-indigo-500";
      case "official_doc": return "border-l-4 border-l-amber-500";
      default: return "border-l-4 border-l-slate-400";
    }
  };

  return (
    <div className={cn(
      "rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 bg-gradient-to-br from-white to-slate-50/40",
      getBorderAccent(resource.type),
      primary ? "border-primary/20 bg-primary/[0.02]" : "border-slate-200 bg-white",
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">{resource.title}</h3>
          <ResourceMetaBadges resource={resource} />
        </div>
        {resource.isInternal ? (
          <Badge className="w-fit bg-primary/10 text-primary">{internalTask?.label ?? t("learning.common.internal")}</Badge>
        ) : (
          <div className="flex gap-2 shrink-0">
            {progress?.savedCourseIds?.includes(resource.id) && onToggleSaveCourse && (
              <button
                type="button"
                onClick={() => onToggleSaveCourse(resource.id)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-bold text-red-600 shadow-sm hover:shadow hover:bg-red-50 hover:border-red-300 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" /> {t("learning.common.unsave")}
              </button>
            )}
            {resource.url ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:shadow hover:bg-slate-50 hover:border-slate-300 hover:text-primary transition-all duration-200 active:scale-95"
              >
                {t("learning.common.openResource")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        )}
      </div>
      {internalTask && (
        <div className="mt-4 rounded-lg border border-primary/15 bg-white/80 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{internalTask.description}</p>
          <ul className="mt-3 space-y-1.5">
            {internalTask.criteria.map((criterion) => (
              <li key={criterion} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-slate-600">
            {t("learning.session.proof", { proof: internalTask.proofOfCompletion })}
          </p>
        </div>
      )}
      {resource.proofOfCompletion && !internalTask && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {t("learning.session.proof", { proof: resource.proofOfCompletion })}
        </p>
      )}
    </div>
  );
}

function RecommendedCourseCard({
  course,
  onToggleSaveCourse,
}: {
  course: RecommendedCourse;
  onToggleSaveCourse?: (courseId: string) => void;
}) {
  const { t } = useTranslation("common");
  const matchScore = displayScore(course.matchScore);

  const getProviderAccent = (provider?: string) => {
    const prov = provider?.toLowerCase();
    if (prov?.includes("coursera")) return "border-l-4 border-l-blue-600";
    if (prov?.includes("scrimba")) return "border-l-4 border-l-amber-500";
    if (prov?.includes("youtube")) return "border-l-4 border-l-rose-500";
    if (prov?.includes("udemy")) return "border-l-4 border-l-purple-600";
    return "border-l-4 border-l-emerald-500";
  };

  return (
    <div className={cn(
      "rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 bg-gradient-to-br from-white to-slate-50/40",
      getProviderAccent(course.provider)
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">{course.title}</h3>
          <div className="flex flex-wrap gap-2">
            {course.provider && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
                {course.provider}
              </Badge>
            )}
            {course.duration && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
                <Clock className="mr-1 h-3 w-3 text-slate-400" /> {course.duration}
              </Badge>
            )}
            {course.language && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
                {course.language.toUpperCase()}
              </Badge>
            )}
            {course.difficulty && (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-xs text-slate-600 font-medium">
                {course.difficulty}
              </Badge>
            )}
            {typeof course.isFree === "boolean" && (
              <Badge variant="outline" className={cn(
                "text-xs font-semibold",
                course.isFree ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600",
              )}>
                {course.isFree ? t("learning.common.free") : t("learning.common.paid")}
              </Badge>
            )}
            {matchScore && (
              course.matchBreakdown ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge variant="outline" className="border-emerald-100 bg-emerald-50 text-xs text-emerald-700 font-bold cursor-pointer hover:bg-emerald-100 transition-colors shadow-sm">
                      {t("learning.common.matchScore", { score: matchScore })}
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="p-4 w-72 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-xl space-y-3 z-50 text-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {t("learning.common.matchBreakdown.title")}
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { labelKey: "learning.common.matchBreakdown.rating", points: course.matchBreakdown.ratingPts, max: 30 },
                        { labelKey: "learning.common.matchBreakdown.language", points: course.matchBreakdown.languagePts, max: 20 },
                        { labelKey: "learning.common.matchBreakdown.level", points: course.matchBreakdown.levelFitPts, max: 20 },
                        { labelKey: "learning.common.matchBreakdown.price", points: course.matchBreakdown.freePts, max: 15 },
                        { labelKey: "learning.common.matchBreakdown.skills", points: course.matchBreakdown.multiSkillPts, max: 15 },
                      ].map(({ labelKey, points, max }) => {
                        const percent = (points / max) * 100;
                        return (
                          <div key={labelKey} className="space-y-1">
                            <div className="text-xs font-semibold text-slate-700">
                              {t(labelKey, { points })}
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-900">
                      <span>{t("learning.common.matchBreakdown.total", { score: matchScore })}</span>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Badge variant="outline" className="border-blue-100 bg-blue-50 text-xs text-blue-700 font-semibold">
                  {t("learning.common.matchScore", { score: matchScore })}
                </Badge>
              )
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {onToggleSaveCourse && (
            <button
              type="button"
              onClick={() => onToggleSaveCourse(course.id)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary shadow-sm hover:shadow hover:bg-primary/10 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {t("learning.common.save")}
            </button>
          )}
          {course.url && (
            <a
              href={course.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:shadow hover:bg-slate-50 hover:border-slate-300 hover:text-primary transition-all duration-200 active:scale-95"
            >
              {t("learning.common.openCourse")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}



// ─── YouTube Embed helper ───────────────────────────
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ─── Star Rating ────────────────────────────────────
function StarRating({ stars, max }: { stars: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={cn("w-3.5 h-3.5", i < stars ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} />
      ))}
    </div>
  );
}

// ─── Session Sidebar (sticky) ───────────────────────
interface SidebarProps {
  session: LearningSession;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  onToggle: () => void;
}

function SessionSidebar({ session, activeSectionId, onSelectSection, onToggle }: SidebarProps) {
  const { t } = useTranslation("common");
  const completedCount = session.sections.filter(s => s.completed).length;
  const progress = session.sections.length > 0 ? (completedCount / session.sections.length) * 100 : 0;

  const typeIcon = (t: LearningSession["sections"][number]["type"]) => {
    switch (t) {
      case "video":    return <PlayCircle className="w-3.5 h-3.5" />;
      case "practice": return <GraduationCap className="w-3.5 h-3.5" />;
      case "quiz":     return <BookOpen className="w-3.5 h-3.5" />;
      default:         return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-slate-100 bg-slate-50/60 overflow-y-auto">
      {/* Toggle + Module info header */}
      <div className="p-5 border-b border-slate-100 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <PanelLeftClose className="w-4 h-4" />
            {t("learning.session.hideLessons")}
          </button>
        </div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
          {t("learning.common.session", { number: session.sessionNumber })}
        </p>
        <h2 className="font-poppins font-bold text-slate-900 text-base leading-snug mb-2">{session.title}</h2>
        <div className="flex items-center gap-3">
          <StarRating stars={session.stars} max={session.maxStars} />
          <span className="text-xs text-slate-400">
            {t("learning.common.starProgress", { earned: session.stars, total: session.maxStars })}
          </span>
        </div>
        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{t("learning.session.completedProgress", { done: completedCount, total: session.sections.length })}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Section list */}
      <nav className="p-3 space-y-1">
        {session.sections.map(section => {
          const isActive = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={cn(
                "w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all",
                isActive ? "bg-primary text-white shadow-sm" : "text-slate-700 hover:bg-white hover:shadow-sm"
              )}
            >
              <span className="mt-0.5 flex-shrink-0">
                {section.completed
                  ? <CheckCircle2 className={cn("w-4 h-4", isActive ? "text-white" : "text-emerald-500")} />
                  : <Circle className={cn("w-4 h-4", isActive ? "text-white/60" : "text-slate-300")} />
                }
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium leading-snug", isActive ? "text-white" : "text-slate-800")}>
                  {section.title}
                </p>
                <div className={cn("flex items-center gap-2 mt-1", isActive ? "text-white/70" : "text-slate-400")}>
                  <span className="flex items-center gap-1 text-xs">
                    {typeIcon(section.type)} {section.type}
                  </span>
                  <span className="text-xs">-</span>
                  <span className="text-xs">{t("learning.common.exercises", { count: section.exercises })}</span>
                </div>
                {/* Section stars */}
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3 h-3",
                        section.completed
                          ? (isActive ? "fill-white text-white" : "fill-amber-400 text-amber-400")
                          : (isActive ? "fill-white/30 text-white/30" : "fill-slate-200 text-slate-200")
                      )}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function VideoContentPanel({
  session,
  activeSectionId,
  progress,
  onToggleChecklistItem,
}: {
  session: LearningSession;
  activeSectionId?: string;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
}) {
  const { t } = useTranslation("common");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [quizExpanded, setQuizExpanded] = useState(true);

  // Find matching YouTube resource or fallback to first YouTube resource
  const activeResource = activeSectionId ? session.resources.find(r => r.id === activeSectionId && r.type === "youtube") : undefined;
  const ytResource = activeResource || session.resources.find(r => r.type === "youtube");
  const ytId = ytResource ? getYouTubeId(ytResource.url) : null;

  const quiz = buildQuiz(session);
  const correctCount = quiz.reduce((acc, q, i) => acc + (quizAnswers[i] === q.correct ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      {/* YouTube Embed */}
      {ytId ? (
        <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              title={ytResource?.title || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-100 aspect-video flex items-center justify-center">
          <p className="text-slate-400">{t("learning.session.noVideo")}</p>
        </div>
      )}

      {/* Video Title + Meta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-xl font-poppins font-bold text-slate-900">{ytResource?.title || session.title}</h3>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
            {ytResource?.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {ytResource.duration}
              </span>
            )}
            {ytResource?.platform && (
              <Badge variant="outline" className="text-xs">{ytResource.platform}</Badge>
            )}
          </div>
        </div>

        {/* Mark Complete Button for Video */}
        {activeSectionId && (
          <button
            type="button"
            aria-pressed={(progress.checkedChecklistItems[activeSectionId] ?? []).includes("__completed")}
            onClick={() => onToggleChecklistItem(activeSectionId, "__completed")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all border font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0 self-start",
              (progress.checkedChecklistItems[activeSectionId] ?? []).includes("__completed")
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            {(progress.checkedChecklistItems[activeSectionId] ?? []).includes("__completed") ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{t("learning.session.done")}</span>
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{t("learning.session.markComplete")}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ═══ Video Timeline — generated from session sections ═══ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setTimelineExpanded(!timelineExpanded)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-slate-800 text-sm">{t("learning.session.lessonContent")}</h4>
              <p className="text-xs text-slate-400">{t("learning.common.sections", { count: session.sections.length })}</p>
            </div>
          </div>
          {timelineExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {timelineExpanded && (
          <div className="px-5 pb-5 space-y-0">
            {buildTimeline(session).map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-2.5 border-t border-slate-100 first:border-0 group hover:bg-primary/5 -mx-5 px-5 cursor-pointer transition-colors">
                <span className="text-xs font-mono font-bold text-primary w-12 shrink-0">{item.time}</span>
                <span className="text-sm text-slate-700 group-hover:text-primary transition-colors">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ AI Summary ═══ */}
      {session.lessonContent?.summary && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-800 text-sm">{t("learning.session.aiLessonSummary")}</h4>
                <p className="text-xs text-slate-400">{t("learning.session.aiGeneratedBy")}</p>
              </div>
            </div>
            {summaryExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {summaryExpanded && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="prose prose-sm prose-slate max-w-none pt-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:text-xs [&_code]:font-mono [&_strong]:text-slate-800 [&_li]:text-slate-600 [&_p]:text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4">
                <h2>{session.title}</h2>
                <p>
                  {t("learning.session.summaryBody")}
                </p>
                <ul className="list-disc pl-4">
                  {buildResourceSummary(session).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Knowledge Check Quiz ═══ */}
      {quiz.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setQuizExpanded(!quizExpanded)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-800 text-sm">{t("learning.session.knowledgeCheck")}</h4>
                <p className="text-xs text-slate-400">{t("learning.session.questionCount", { count: quiz.length })}</p>
              </div>
            </div>
            {quizExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {quizExpanded && (
            <div className="px-5 pb-5 border-t border-slate-100 space-y-6 pt-4">
              {quiz.map((q, qi) => (
                <div key={qi} className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">
                    <span className="text-primary font-bold mr-2">Q{qi + 1}.</span>
                    {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = quizAnswers[qi] === oi;
                      const isCorrect = showQuizResults && oi === q.correct;
                      const isWrong = showQuizResults && isSelected && oi !== q.correct;
                      return (
                        <button
                          key={oi}
                          onClick={() => !showQuizResults && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                          className={cn(
                            "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all",
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                              : isWrong
                              ? "bg-red-50 border-red-300 text-red-800"
                              : isSelected
                              ? "bg-primary/5 border-primary/30 text-primary"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold",
                            isCorrect ? "border-emerald-500 bg-emerald-500 text-white"
                              : isWrong ? "border-red-500 bg-red-500 text-white"
                              : isSelected ? "border-primary bg-primary text-white"
                              : "border-slate-300"
                          )}>
                            {isCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {showQuizResults && q.explanation ? (
                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
                      {q.explanation}
                    </p>
                  ) : null}
                </div>
              ))}

              {/* Submit / Results */}
              {!showQuizResults ? (
                <Button
                  className="rounded-full w-full"
                  disabled={Object.keys(quizAnswers).length < quiz.length}
                  onClick={() => setShowQuizResults(true)}
                >
                  {t("learning.session.checkAnswers")}
                </Button>
              ) : (
                <div className={cn(
                  "p-4 rounded-xl text-center",
                  correctCount === quiz.length ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
                )}>
                  <p className="font-bold text-lg">
                    {correctCount === quiz.length
                      ? t("learning.session.perfectScore")
                      : t("learning.session.correctCount", { correct: correctCount, total: quiz.length })}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {correctCount === quiz.length
                      ? t("learning.session.mastered")
                      : t("learning.session.reviewAnswers")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-full"
                    onClick={() => { setQuizAnswers({}); setShowQuizResults(false); }}
                  >
                    {t("learning.session.retryQuiz")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Doc Content Panel (react.dev style) ────────────
function DocContentPanel({
  session,
  activeSectionId,
  onSelectSection,
  progress,
  onToggleChecklistItem,
  onExerciseProofChange,
  onToggleSaveCourse,
}: {
  session: LearningSession;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
  onExerciseProofChange: (exerciseId: string, proof: string) => void;
  onToggleSaveCourse: (courseId: string) => void;
}) {
  const { t } = useTranslation("common");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => setCurrentPage(1), [activeSectionId]);
  const activeSection = session.sections.find(s => s.id === activeSectionId) ?? session.sections[0];
  const activeResource = getActiveSessionResource(session, activeSection?.id ?? activeSectionId);
  
  const convertedSavedCourses = (session.recommendedCourses ?? [])
    .filter((c) => progress.savedCourseIds?.includes(c.id))
    .map((c) => ({
      id: c.id,
      title: c.title,
      url: c.url,
      platform: c.provider,
      duration: c.duration,
      isFree: c.isFree,
      type: "course" as const,
      matchScore: c.matchScore,
    }));
  const allSupplementalResources = convertedSavedCourses;

  const visibleRecommendedCourses = activeResource
    ? []
    : (session.recommendedCourses ?? []).filter((c) => !progress.savedCourseIds?.includes(c.id));
  const nextSectionId = getNextLearningSectionId(session.sections, activeSection?.id ?? activeSectionId);
  const nextSection = session.sections.find((section) => section.id === nextSectionId);

  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(visibleRecommendedCourses.length / ITEMS_PER_PAGE);
  const effectivePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
  const paginatedCourses = visibleRecommendedCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Doc Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{t("learning.session.documentation")}</Badge>
          {session.lessonContent && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">SkillBridge original</Badge>
          )}
          {activeSection?.completed && (
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> {t("learning.status.completed")}
            </Badge>
          )}
        </div>
        <h2 className="text-2xl font-poppins font-bold text-slate-900">{session.title}</h2>
        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {t("learning.session.minRead", { count: session.estimatedMinutes })}</span>
          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {t("learning.common.sections", { count: session.sections.length })}</span>
        </div>
        {session.lessonContent?.summary && (
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">{session.lessonContent.summary}</p>
        )}
      </div>

      {/* On This Page sidebar (TOC) */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{t("learning.session.onThisPage")}</h4>
        <ul className="space-y-2">
          {session.sections.map((section, i) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => selectLearningSection(section.id, onSelectSection)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 text-left text-sm transition-colors hover:text-primary",
                  section.id === activeSection?.id ? "font-semibold text-primary" : "text-slate-600",
                )}
              >
                <div className={cn(
                  "h-1 w-1 rounded-full",
                  section.id === activeSection?.id ? "bg-primary" : "bg-slate-400",
                )} />
                {i + 1}. {section.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Doc Content — built from real section data */}
      <article className="prose prose-slate max-w-none
        [&_h2]:text-xl [&_h2]:font-poppins [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-3 [&_h2]:border-b [&_h2]:border-slate-100
        [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-6 [&_h3]:mb-3
        [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-slate-600 [&_p]:mb-4
        [&_li]:text-[15px] [&_li]:text-slate-600
        [&_strong]:text-slate-800
      ">
        <h2>{activeSection?.title}</h2>
        <p>
          {t("learning.session.sectionIntro", {
            section: activeSection?.title,
            session: session.title,
            count: activeSection?.exercises ?? 0,
          })}
        </p>
        {session.sections.map((sec, i) => (
          <div key={sec.id} id={`section-${sec.id}`} className="scroll-mt-6">
            <h3>{i + 1}. {sec.title}</h3>
            {sec.body ? (
              <p>{sec.body}</p>
            ) : (
              <p>
                {t("learning.session.type")}: <strong>{sec.type}</strong>{" - "}
                {t("learning.common.exercises", { count: sec.exercises })}
                {sec.completed ? ` - ${t("learning.status.completed")}` : ""}
              </p>
            )}
            {sec.checklist?.length ? (
              <ul className="mt-3 space-y-2">
                {sec.checklist.map((item) => (
                  <li key={item} className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={(progress.checkedChecklistItems[sec.id] ?? []).includes(item)}
                      onClick={() => onToggleChecklistItem(sec.id, item)}
                      className="flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-emerald-50"
                    >
                      {(progress.checkedChecklistItems[sec.id] ?? []).includes(item) ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <span>{item}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 flex">
                <button
                  type="button"
                  aria-pressed={(progress.checkedChecklistItems[sec.id] ?? []).includes("__completed")}
                  onClick={() => onToggleChecklistItem(sec.id, "__completed")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all border font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                    (progress.checkedChecklistItems[sec.id] ?? []).includes("__completed")
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {(progress.checkedChecklistItems[sec.id] ?? []).includes("__completed") ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{t("learning.session.done")}</span>
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{t("learning.session.markComplete")}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Code blocks rendered separately */}
        <div className="hidden rounded-xl overflow-hidden my-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-mono">
            <Terminal className="w-3.5 h-3.5" /> TypeScript
          </div>
          <pre className="bg-slate-900 text-emerald-300 p-5 text-sm font-mono overflow-x-auto leading-relaxed">
{`Resource details are rendered from the roadmap response.`}
          </pre>
        </div>

        <div className="hidden rounded-xl overflow-hidden my-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-400 text-xs font-mono">
            <Code className="w-3.5 h-3.5" /> Resource metadata
          </div>
          <pre className="bg-slate-900 text-emerald-300 p-5 text-sm font-mono overflow-x-auto leading-relaxed">
{`Resource quality, freshness, match score, source type, and proof are rendered from BE data.`}
          </pre>
        </div>
      </article>

      {session.lessonContent?.exercises.length ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {t("learning.session.practiceTasks")}
          </p>
          {session.lessonContent.exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-bold text-slate-900">{exercise.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{exercise.prompt}</p>
              {exercise.acceptanceCriteria.length ? (
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {t("learning.session.acceptanceCriteria")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {exercise.acceptanceCriteria.map((criterion) => (
                      <li key={criterion} className="flex gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3 text-sm text-slate-500">
                <strong className="text-slate-700">{t("learning.session.proofLabel")}:</strong> {exercise.proofOfCompletion}
              </p>
              <label className="mt-3 block">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {t("learning.session.proofInputLabel")}
                </span>
                <textarea
                  value={progress.exerciseProofs[exercise.id] ?? ""}
                  onChange={(event) => onExerciseProofChange(exercise.id, event.target.value)}
                  placeholder={t("learning.session.proofInputPlaceholder")}
                  className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                />
              </label>
            </div>
          ))}
        </div>
      ) : null}

      {activeResource && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {t("learning.session.lessonContent")}
          </p>
          <ResourceCard resource={activeResource} primary progress={progress} onToggleSaveCourse={onToggleSaveCourse} />
        </div>
      )}

      {allSupplementalResources.length > 0 && (
      <div className="space-y-4 mt-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <h4 className="font-poppins font-bold text-slate-800 text-xs tracking-wider uppercase">
            {t("learning.session.savedCourses")}
          </h4>
          <span className="ml-1 h-5 min-w-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
            {allSupplementalResources.length}
          </span>
        </div>
        <div className="space-y-3">
          {allSupplementalResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} progress={progress} onToggleSaveCourse={onToggleSaveCourse} />
          ))}
        </div>
      </div>
      )}

      {visibleRecommendedCourses.length ? (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <h4 className="font-poppins font-bold text-slate-800 text-xs tracking-wider uppercase">
              {t("learning.session.recommendedCourses")}
            </h4>
            <span className="ml-1 h-5 min-w-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
              {visibleRecommendedCourses.length}
            </span>
          </div>
          <div className="space-y-3">
            {paginatedCourses.map((course) => (
              <RecommendedCourseCard key={course.id} course={course} onToggleSaveCourse={onToggleSaveCourse} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={effectivePage === 1}
                className="h-8 w-8 p-0 rounded-lg flex items-center justify-center border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold text-slate-500">
                {t("learning.common.pageOf", { current: effectivePage, total: totalPages, defaultValue: `Trang ${effectivePage} / ${totalPages}` })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={effectivePage === totalPages}
                className="h-8 w-8 p-0 rounded-lg flex items-center justify-center border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {session.resources.length > 0 && (
        <>
          {/* Tip Card (react.dev style) */}
          <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{t("learning.session.proTip")}</p>
              <p className="text-sm text-amber-700 mt-1">
                {t("learning.session.proTipBody")}
              </p>
            </div>
          </div>

          {/* Warning Card */}
          <div className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">{t("learning.session.commonPitfall")}</p>
              <p className="text-sm text-red-700 mt-1">
                {t("learning.session.commonPitfallBody")}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Next Section CTA */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-200">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{t("learning.session.nextSection")}</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">{nextSection?.title ?? activeSection?.title}</p>
        </div>
        <Button
          className="rounded-full"
          disabled={!nextSection}
          onClick={() =>
            nextSection &&
            selectLearningSection(nextSection.id, onSelectSection)
          }
        >
          {t("learning.session.continue")} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Content Router ────────────────────────────
function MainContentPanel({
  session,
  activeSectionId,
  onSelectSection,
  progress,
  onToggleChecklistItem,
  onExerciseProofChange,
  onToggleSaveCourse,
}: {
  session: LearningSession;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
  onExerciseProofChange: (exerciseId: string, proof: string) => void;
  onToggleSaveCourse: (courseId: string) => void;
}) {
  const { t } = useTranslation("common");
  const activeSection = session.sections.find(s => s.id === activeSectionId) ?? session.sections[0];
  const isVideoSection = activeSection?.type === "video" || activeSection?.type === "quiz" || activeSection?.type === "practice";
  const isDocSection = activeSection?.type === "reading";

  // If the session has a YouTube resource and the section is video/practice/quiz, show video
  const hasYouTube = session.resources.some(r => r.type === "youtube");

  return (
    <main className="flex-1 overflow-y-auto min-w-0">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{t("learning.common.week", { number: session.moduleId.replace("demo-", "") })}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{t("learning.common.session", { number: session.sessionNumber })}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">{activeSection?.title}</span>
        </div>

        {/* Render based on content type */}
        {(hasYouTube && (isVideoSection || !isDocSection)) ? (
          <VideoContentPanel
            session={session}
            activeSectionId={activeSectionId}
            progress={progress}
            onToggleChecklistItem={onToggleChecklistItem}
          />
        ) : (
          <DocContentPanel
            session={session}
            activeSectionId={activeSectionId}
            onSelectSection={onSelectSection}
            progress={progress}
            onToggleChecklistItem={onToggleChecklistItem}
            onExerciseProofChange={onExerciseProofChange}
            onToggleSaveCourse={onToggleSaveCourse}
          />
        )}
      </div>
    </main>
  );
}

// ─── Main SessionDetail Component ───────────────────
interface SessionDetailProps {
  session: LearningSession;
}

export function SessionDetail({ session }: SessionDetailProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [activeSectionId, setActiveSectionId] = useState(session.sections[0]?.id ?? "");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(session.status === "completed");
  const [progress, setProgress] = useState<SessionProgressState>(() =>
    createInitialSessionProgress(session, readStoredSessionProgress(session.id)),
  );
  const progressRef = useRef(progress);
  const progressHydratedRef = useRef(false);
  const locallyChangedProgressRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const localProgress = createInitialSessionProgress(session, readStoredSessionProgress(session.id));
    setProgress(localProgress);
    progressRef.current = localProgress;
    progressHydratedRef.current = false;
    locallyChangedProgressRef.current = false;

    if (!hasApiAuthSession()) {
      progressHydratedRef.current = true;
      return;
    }

    let isActive = true;
    getLearningSessionProgress(session.id)
      .then((remoteProgress) => {
        if (!isActive || locallyChangedProgressRef.current) return;
        const hydrated = createInitialSessionProgress(session, remoteProgress);
        setProgress(hydrated);
        progressRef.current = hydrated;
      })
      .catch(() => {
        // Keep local fallback when BE is unavailable or the migration has not run yet.
      })
      .finally(() => {
        if (!isActive) return;
        progressHydratedRef.current = true;
        if (locallyChangedProgressRef.current) {
          void saveLearningSessionProgress(session.id, progressRef.current).catch(() => undefined);
        }
      });

    return () => {
      isActive = false;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [session]);

  useEffect(() => {
    writeStoredSessionProgress(session.id, progress);
    if (!hasApiAuthSession() || !progressHydratedRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveLearningSessionProgress(session.id, progress).catch(() => undefined);
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [session.id, progress]);

  const displaySession = applyProgressToSession(session, progress);
  const canMarkComplete = !session.lessonContent || isSessionReadyToComplete(session, progress);

  const weeks = useActiveWeekPlans();
  const ALL_SESSIONS = weeks.flatMap(w => w.sessions).sort((a, b) => a.sessionNumber - b.sessionNumber);

  const currentIdx = ALL_SESSIONS.findIndex(s => s.id === session.id);

  const { weekPlans, setWeekPlans } = useRoadmapStore();
  const handleComplete = () => {
    if (!canMarkComplete) return;
    setIsCompleted(true);

    const updatedProgress = {
      ...progress,
      checkedChecklistItems: {
        ...progress.checkedChecklistItems,
        "__session": ["completed"],
      },
    };
    setProgress(updatedProgress);
    writeStoredSessionProgress(session.id, updatedProgress);
    if (hasApiAuthSession()) {
      void saveLearningSessionProgress(session.id, updatedProgress).catch(() => undefined);
    }

    if (weekPlans.length > 0) {
      const updated = weekPlans.map(week => ({
        ...week,
        sessions: week.sessions.map((s) => {
          if (s.id === session.id) {
            return { ...s, status: "completed" as const };
          }
          return s;
        }),
      }));
      setWeekPlans(updated);
    }

    const next = ALL_SESSIONS[currentIdx + 1];
    setTimeout(() => next ? navigate(`/learning/session/${next.id}`) : navigate("/learning"), 800);
  };
  const prevSession = currentIdx > 0 ? ALL_SESSIONS[currentIdx - 1] : null;
  const nextSession = currentIdx < ALL_SESSIONS.length - 1 ? ALL_SESSIONS[currentIdx + 1] : null;

  const isLocked = (s: LearningSession) => s.status === "locked";

  const handleToggleChecklistItem = (sectionId: string, item: string) => {
    locallyChangedProgressRef.current = true;
    setProgress((current) => toggleChecklistItem(current, sectionId, item));
  };

  const handleExerciseProofChange = (exerciseId: string, proof: string) => {
    locallyChangedProgressRef.current = true;
    setProgress((current) => setExerciseProof(current, exerciseId, proof));
  };

  const handleToggleSaveCourse = (courseId: string) => {
    locallyChangedProgressRef.current = true;
    setProgress((current) => toggleSavedCourse(current, courseId));
  };

  // Pass handleComplete down to content panels via context or prop

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top nav bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/learning")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t("learning.session.backToRoadmap")}</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 ml-2">
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-slate-700">{t("learning.common.session", { number: session.sessionNumber })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSidebarOpen && session.status !== "locked" && (
            <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)} className="rounded-xl border-slate-200 text-slate-600">
              <PanelLeftOpen className="w-4 h-4 mr-2" /> {t("learning.session.lessons")}
            </Button>
          )}

          <Button variant="outline" size="sm" disabled={!prevSession || isLocked(prevSession)} onClick={() => prevSession && navigate(`/learning/session/${prevSession.id}`)} className="rounded-xl border-slate-200 text-slate-600">
            <ChevronLeft className="w-4 h-4 mr-1" /><span className="hidden sm:inline">{t("learning.session.previous")}</span>
          </Button>
          <Button variant="outline" size="sm" disabled={!nextSession || isLocked(nextSession)} onClick={() => nextSession && navigate(`/learning/session/${nextSession.id}`)} className="rounded-xl border-slate-200 text-slate-600">
            <span className="hidden sm:inline">{t("learning.session.next")}</span><ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          {/* ✅ Complete session button */}
          {session.status !== "locked" && !isCompleted && (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!canMarkComplete}
              className="rounded-xl gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t("learning.session.markComplete")}</span>
            </Button>
          )}
          {isCompleted && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> {t("learning.session.done")}
            </div>
          )}
        </div>
      </div>

      {/* Locked overlay */}
      {session.status === "locked" && (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-poppins font-bold text-slate-900 mb-2">{t("learning.session.lockedTitle")}</h2>
            <p className="text-slate-500 text-sm">{t("learning.session.lockedBody")}</p>
            <Button onClick={() => navigate("/learning")} className="mt-6 rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("learning.session.backToRoadmap")}
            </Button>
          </div>
        </div>
      )}

      {/* Main 3-column layout: sidebar (sticky) + content (scrollable) + AI chat (sticky) */}
      {session.status !== "locked" && (
        <div className="flex flex-1 overflow-hidden relative bg-white">
          {/* Left sidebar — sticky */}
          {isSidebarOpen && (
            <SessionSidebar
              session={displaySession}
              activeSectionId={activeSectionId}
              onSelectSection={setActiveSectionId}
              onToggle={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Center content — scrollable */}
          <MainContentPanel
            session={displaySession}
            activeSectionId={activeSectionId}
            onSelectSection={setActiveSectionId}
            progress={progress}
            onToggleChecklistItem={handleToggleChecklistItem}
            onExerciseProofChange={handleExerciseProofChange}
            onToggleSaveCourse={handleToggleSaveCourse}
          />

          {/* Right AI Chat Panel — sticky */}
          {isChatOpen && (
            <AIChatPanel sessionId={session.id} onClose={() => setIsChatOpen(false)} />
          )}

          {/* Floating AI toggle when closed */}
          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white z-50 group"
            >
              <Sparkles className="w-6 h-6" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {t("learning.session.askAiTutor")}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
