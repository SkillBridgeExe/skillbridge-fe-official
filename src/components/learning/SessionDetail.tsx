import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
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
import { CodeSandboxPanel } from "./CodeSandboxPanel";
import { useActiveWeekPlans, useRoadmapStore } from "@/components/learning/roadmap-store";
import { hasApiAuthSession } from "@/services/auth-session.service";
import {
  answerLearningQuizQuestion,
  getLearningNextQuestions,
  getLearningSessionProgress,
  patchLearningChecklistItem,
  saveLearningSessionProgress,
} from "@/services/learning-roadmap.service";
import { buildInternalResourceTask } from "./internal-resource-content";
import { getActiveSessionResource } from "./session-content";
import { getNextLearningSectionId, selectLearningSection } from "./session-navigation";
import {
  applyProgressToSession,
  createInitialSessionProgress,
  setExerciseProof,
  toggleChecklistItem,
  readStoredSessionProgress,
  writeStoredSessionProgress,
  toggleSavedCourse,
  isSectionComplete,
  getChecklistTaskProofId,
  hasChecklistTaskProof,
  type SessionProgressState,
} from "./session-progress";
import {
  answerQuestion,
  applyServerQuizAnswer,
  getQuizStats,
  type QuizQuestionForProgress,
} from "./quiz-progress";

interface AdaptiveQuizState {
  weakObjectives: Array<{
    objectiveId: string;
    correct: number;
    totalAnswered: number;
    accuracy: number;
    mastered: boolean;
  }>;
  nextRecommendedQuestions: Array<{
    id: string;
    question: string;
    objectiveId?: string;
    sectionId?: string;
  }>;
}

// ─── Helpers ─────────────────────────────────────────
const QUIZ_PASSING_RATIO = 0.8;

function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  }

  return [String(minutes).padStart(2, "0"), String(remainingSeconds).padStart(2, "0")].join(":");
}

function parseDurationSeconds(duration?: string): number | null {
  if (!duration) return null;
  const hoursMatch = duration.match(/(\d+)\s*h/i);
  const minutesMatch = duration.match(/(\d+)\s*m/i);
  const secondsMatch = duration.match(/(\d+)\s*s/i);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const seconds = secondsMatch ? Number(secondsMatch[1]) : 0;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

function orderLearningSectionsForDisplay(sections: LearningSession["sections"]) {
  return [...sections].sort((a, b) => {
    const rank = (section: LearningSession["sections"][number]) => {
      if (section.type === "video") return 0;
      if (section.type === "quiz") return 2;
      return 1;
    };

    return rank(a) - rank(b);
  });
}

function orderSessionForDisplay(session: LearningSession): LearningSession {
  return {
    ...session,
    sections: orderLearningSectionsForDisplay(session.sections),
  };
}

function buildTimeline(session: LearningSession) {
  const youtubeResource = session.resources.find((resource) => resource.type === "youtube");
  const chapters = youtubeResource?.videoChapters ?? [];

  if (chapters.length > 0) {
    return chapters.map((chapter) => ({
      id: chapter.id,
      time: formatTimestamp(chapter.startSeconds),
      label: chapter.title,
      startSeconds: chapter.startSeconds,
    }));
  }

  const nonVideoSections = session.sections.filter((section) => section.type !== "video");
  const sections = nonVideoSections.length > 0 ? nonVideoSections : session.sections;
  const totalSeconds = parseDurationSeconds(youtubeResource?.duration) ?? session.estimatedMinutes * 60;
  const perSectionSeconds = Math.max(
    1,
    Math.round(totalSeconds / Math.max(sections.length, 1)),
  );

  return sections.map((section, index) => {
    const startSeconds = index * perSectionSeconds;
    return {
      id: section.id,
      time: formatTimestamp(startSeconds),
      label: section.title,
      startSeconds,
    };
  });
}

function getSectionVideoStartSeconds(session: LearningSession, sectionId: string): number | undefined {
  const section = session.sections.find((item) => item.id === sectionId);
  if (!section) return undefined;

  const timeline = buildTimeline(session);
  const matchingItem =
    timeline.find((item) => item.id === section.id) ??
    timeline.find((item) => item.label.trim().toLowerCase() === section.title.trim().toLowerCase());

  if (matchingItem) return matchingItem.startSeconds;
  return section.type === "video" ? 0 : undefined;
}

function buildQuiz(session: LearningSession) {
  if (session.lessonContent?.quiz && session.lessonContent.quiz.length) {
    return session.lessonContent.quiz.map((item) => ({
      id: item.id,
      question: item.question,
      options: item.options,
      correct: item.correctOptionIndex,
      correctOptionIndex: item.correctOptionIndex,
      explanation: item.explanation,
      kind: item.kind ?? inferQuizKind(item.id, item.question),
      objectiveId: item.objectiveId,
      sectionId: item.sectionId,
      remediation: item.remediation,
    }));
  }

  return [];
}

function getQuizPassingCount(totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.max(1, Math.ceil(totalQuestions * QUIZ_PASSING_RATIO));
}

function isQuizPassed(session: LearningSession, progress: SessionProgressState): boolean {
  const quiz = buildQuiz(session);
  if (quiz.length === 0) return true;
  const stats = getQuizStats(progress, quiz);
  return stats.correct >= getQuizPassingCount(quiz.length);
}

type LearningMode = "learn" | "practice" | "check";
type QuizKind = "concept" | "scenario" | "debug" | "mini_case";
type SectionMasteryStatus = "Learning" | "Practice needed" | "Quiz passed" | "Completed";

function inferQuizKind(id: string, question: string): QuizKind {
  const normalized = `${id} ${question}`.toLowerCase();
  if (/\b(debug|bug|error|wrong|fix|mistake|fails|failure)\b/.test(normalized)) return "debug";
  if (/\b(case|evidence|portfolio|show|prove)\b/.test(normalized)) return "mini_case";
  if (/\b(scenario|learner|working|best next action|when should|what should)\b/.test(normalized)) return "scenario";
  return "concept";
}

function quizKindLabel(kind: QuizKind): string {
  if (kind === "mini_case") return "Mini case";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function getSectionTaskStats(
  section: LearningSession["sections"][number],
  progress: SessionProgressState,
) {
  const checklist = section.checklist ?? [];
  const completed = checklist.filter((item) =>
    (progress.checkedChecklistItems[section.id] ?? []).includes(item.id) &&
    hasChecklistTaskProof(progress, section.id, item.id),
  ).length;
  return {
    total: checklist.length,
    completed,
  };
}

function getSectionMasteryStatus(
  session: LearningSession,
  progress: SessionProgressState,
  section: LearningSession["sections"][number],
): SectionMasteryStatus {
  if (isSectionComplete(session, progress, section.id)) return "Completed";
  const quiz = buildQuiz(session);
  if (quiz.length > 0 && isQuizPassed(session, progress)) return "Quiz passed";
  const stats = getSectionTaskStats(section, progress);
  if (stats.total > 0 && stats.completed < stats.total) return "Practice needed";
  return "Learning";
}

function getSessionEvidenceSummary(session: LearningSession, progress: SessionProgressState) {
  const taskRows = session.sections.flatMap((section) =>
    (section.checklist ?? []).map((item) => {
      const proofId = getChecklistTaskProofId(section.id, item.id);
      const proof = progress.exerciseProofs[proofId]?.trim() ?? "";
      const checked = (progress.checkedChecklistItems[section.id] ?? []).includes(item.id);
      return {
        id: proofId,
        sectionTitle: section.title,
        label: item.label,
        proof,
        complete: checked && proof.length >= 12,
      };
    }),
  );
  const quiz = buildQuiz(session);
  const quizStats = getQuizStats(progress, quiz);
  return {
    tasks: taskRows,
    completedTasks: taskRows.filter((item) => item.complete).length,
    totalTasks: taskRows.length,
    quizCorrect: quizStats.correct,
    quizTotal: quiz.length,
    quizPassed: isQuizPassed(session, progress),
    readyForPortfolio:
      taskRows.length > 0 &&
      taskRows.every((item) => item.complete) &&
      (quiz.length === 0 || isQuizPassed(session, progress)),
  };
}

function buildEvidenceClipboardText(session: LearningSession, progress: SessionProgressState): string {
  const evidence = getSessionEvidenceSummary(session, progress);
  const lines = [
    `${session.title} learning evidence`,
    `Lab tasks: ${evidence.completedTasks}/${evidence.totalTasks}`,
    `Quiz score: ${evidence.quizCorrect}/${evidence.quizTotal}`,
    `Status: ${evidence.readyForPortfolio ? "Ready for portfolio" : "In progress"}`,
    ...evidence.tasks
      .filter((item) => item.complete)
      .map((item) => `- ${item.sectionTitle}: ${item.label} | Proof: ${item.proof}`),
  ];
  return lines.join("\n");
}

function getDeterministicRotation(id: string, length: number): number {
  if (length <= 1) return 0;
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return (hash % (length - 1)) + 1;
}

type BuiltQuizQuestion = ReturnType<typeof buildQuiz>[number];

type MissionStepKind = "setup" | "explain" | "build" | "practice";

function getMissionStepKind(label: string): MissionStepKind {
  const normalized = label.toLowerCase();
  if (/\b(install|setup|environment|python|package|opencv)\b/.test(normalized)) return "setup";
  if (/\b(explain|why|identify|review|understand)\b/.test(normalized)) return "explain";
  if (/\b(create|build|folder|project|draw|load|read|resize|write|run)\b/.test(normalized)) return "build";
  return "practice";
}

function getPracticeTaskGuide(kind: MissionStepKind): string {
  if (kind === "setup") {
    return "Run the setup and paste the version or command result.";
  }
  if (kind === "explain") {
    return "Answer in your own words with one concrete example.";
  }
  if (kind === "build") {
    return "Paste a code snippet, command output, or short result note.";
  }
  return "Paste a note, snippet, link, or result that proves you practiced.";
}

function getPracticeTaskRubric(kind: MissionStepKind): string[] {
  if (kind === "setup") {
    return ["Command or version shown", "Specific result or output", "Ran on your local setup"];
  }
  if (kind === "explain") {
    return ["Own words", "Specific result or output", "One concrete example"];
  }
  if (kind === "build") {
    return ["Code or command included", "Specific result or output", "Can be reproduced"];
  }
  return ["What you tried", "Specific result or output", "Short reflection or link"];
}

function getPracticeTaskPlaceholder(kind: MissionStepKind): string {
  if (kind === "setup") return "Example: cv2 version 4.10.0 installed";
  if (kind === "explain") return "Example: An image shape is height x width x channels because...";
  if (kind === "build") return "Example: cv2.imread('image.jpg') returned shape (720, 1280, 3)";
  return "Example: I practiced this and the result was...";
}

function getSectionLearningOutcomes(section?: LearningSession["sections"][number]): string[] {
  if (!section) return [];
  const checklistOutcomes = (section.checklist ?? [])
    .map((item) => item.label.trim())
    .filter(Boolean);
  if (checklistOutcomes.length > 0) return checklistOutcomes.slice(0, 3);
  if (section.body?.trim()) return [`Explain ${section.title} in your own words.`];
  return [`Complete the ${section.title} activity with proof.`];
}

function MissionStepIcon({
  kind,
  completed,
}: {
  kind: MissionStepKind;
  completed: boolean;
}) {
  const iconClassName = cn("h-4 w-4", completed ? "text-white" : "text-slate-600");
  if (kind === "setup") return <Terminal className={iconClassName} />;
  if (kind === "explain") return <FileText className={iconClassName} />;
  if (kind === "build") return <Code className={iconClassName} />;
  return <GraduationCap className={iconClassName} />;
}

function getDisplayOptions(question: BuiltQuizQuestion) {
  const rotation = getDeterministicRotation(question.id, question.options.length);
  return question.options.map((_, displayIndex) => {
    const originalIndex = (displayIndex + rotation) % question.options.length;
    return {
      option: question.options[originalIndex],
      originalIndex,
    };
  });
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
  rank,
  onToggleSaveCourse,
}: {
  course: RecommendedCourse;
  rank?: number;
  onToggleSaveCourse?: (courseId: string) => void;
}) {
  const { t } = useTranslation("common");
  const matchScore = displayScore(course.matchScore);

  const getRankBadgeColor = (r: number) => {
    if (r === 1) return "bg-orange-500 text-white shadow-sm shadow-orange-500/20";
    if (r === 2) return "bg-amber-500 text-white shadow-sm shadow-amber-500/20";
    if (r === 3) return "bg-yellow-500 text-white shadow-sm shadow-yellow-500/20";
    return "bg-slate-100 text-slate-500";
  };

  const isTopRank = rank !== undefined && rank <= 3;

  return (
    <div className={cn(
      "flex items-start gap-2.5 transition-all duration-200",
      isTopRank 
        ? "bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl p-2.5" 
        : "p-2.5 border-b border-slate-100 hover:bg-slate-50/50"
    )}>
      {rank !== undefined && (
        <div className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-0.5 font-poppins",
          getRankBadgeColor(rank)
        )}>
          {rank}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-semibold text-slate-800 leading-snug hover:text-primary transition-colors">
          {course.url ? (
            <a href={course.url} target="_blank" rel="noreferrer">
              {course.title}
            </a>
          ) : (
            course.title
          )}
        </h4>
        <div className="flex flex-wrap items-center gap-1 mt-1 text-[11px] text-slate-500 font-medium">
          {course.provider && <span>{course.provider}</span>}
          {course.duration && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> {course.duration}</span>
            </>
          )}
          {matchScore && (
            <>
              <span className="text-slate-300">•</span>
              {course.matchBreakdown ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="text-emerald-600 font-bold cursor-pointer hover:underline">
                      {t("learning.common.matchScore", { score: matchScore })}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="p-4 w-72 bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl rounded-xl space-y-3 z-50 text-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 font-poppins">
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
                <span className="text-emerald-600 font-bold">
                  {t("learning.common.matchScore", { score: matchScore })}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 self-center">
        {onToggleSaveCourse && (
          <button
            type="button"
            onClick={() => onToggleSaveCourse(course.id)}
            title={t("learning.common.save")}
            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noreferrer"
            title={t("learning.common.openCourse")}
            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
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
  progress: SessionProgressState;
  onSelectSection: (id: string) => void;
  onToggle: () => void;
  showValidationErrors?: boolean;
}

type SidebarTab = "all" | "lessons" | "video" | "quiz";

function SessionSidebar({
  session,
  activeSectionId,
  progress: sessionProgress,
  onSelectSection,
  onToggle,
  showValidationErrors = false,
}: SidebarProps) {
  const { t } = useTranslation("common");
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const completedCount = session.sections.filter(s => s.completed).length;
  const progress = session.sections.length > 0 ? (completedCount / session.sections.length) * 100 : 0;
  const quizCount = buildQuiz(session).length;
  const sidebarTabs: Array<{ id: SidebarTab; label: string }> = [
    { id: "all", label: "All" },
    { id: "lessons", label: "Lessons" },
    { id: "video", label: "Video" },
    { id: "quiz", label: "Quiz" },
  ];
  const filteredSections = session.sections.filter((section) => {
    if (activeTab === "all") return true;
    if (activeTab === "lessons") return section.type !== "video" && section.type !== "quiz";
    return section.type === activeTab;
  });
  const showQuizItem = quizCount > 0 && (activeTab === "all" || activeTab === "quiz");

  const typeIcon = (t: LearningSession["sections"][number]["type"]) => {
    switch (t) {
      case "video":    return <PlayCircle className="w-3.5 h-3.5" />;
      case "practice": return <GraduationCap className="w-3.5 h-3.5" />;
      case "quiz":     return <BookOpen className="w-3.5 h-3.5" />;
      default:         return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside className="absolute top-0 left-0 z-30 w-72 h-full border-r border-slate-200 bg-white shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-left duration-300">
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

      <div className="border-b border-slate-100 bg-white px-3 py-3">
        <div role="tablist" aria-label="Lesson list filters" className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {sidebarTabs.map((tab) => {
            const isActiveTab = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActiveTab}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  isActiveTab ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section list */}
      <nav aria-label="Session lesson list" className="p-3 space-y-1">
        {filteredSections.map(section => {
          const isActive = section.id === activeSectionId;
          const sectionStatus = getSectionMasteryStatus(session, sessionProgress, section);
          const isCompletedStatus = sectionStatus === "Completed";
          const isSectionIncomplete = sectionStatus !== "Completed";
          const shouldHighlightSection = showValidationErrors && isSectionIncomplete;
          return (
            <button
              key={section.id}
              onClick={() => selectLearningSection(section.id, onSelectSection)}
              className={cn(
                "w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all border",
                isActive
                  ? "bg-primary text-white border-primary shadow-sm"
                  : shouldHighlightSection
                  ? "bg-red-50/50 border-red-200 text-red-700 hover:bg-red-100/50"
                  : "text-slate-700 border-transparent hover:bg-white hover:shadow-sm"
              )}
            >
              <span className="mt-0.5 flex-shrink-0">
                {isCompletedStatus ? (
                  <CheckCircle2 className={cn("w-4 h-4", isActive ? "text-white" : "text-emerald-500")} />
                ) : shouldHighlightSection ? (
                  <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                ) : (
                  <Circle className={cn("w-4 h-4", isActive ? "text-white/60" : "text-slate-300")} />
                )}
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
                <span
                  className={cn(
                    "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : sectionStatus === "Completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : sectionStatus === "Quiz passed"
                      ? "bg-blue-50 text-blue-700"
                      : sectionStatus === "Practice needed"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {sectionStatus}
                </span>
                {/* Section stars */}
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3 h-3",
                        isCompletedStatus
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
        {showQuizItem ? (
          <button
            type="button"
            aria-label="Open quiz section"
            onClick={() => document.getElementById("quiz-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all border text-slate-700 border-transparent hover:bg-white hover:shadow-sm"
          >
            <span className="mt-0.5 flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-amber-500" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug text-slate-800">
                {t("learning.session.knowledgeCheck")}
              </p>
              <div className="mt-1 flex items-center gap-2 text-slate-400">
                <span className="flex items-center gap-1 text-xs">
                  <HelpCircle className="w-3.5 h-3.5" /> quiz
                </span>
                <span className="text-xs">-</span>
                <span className="text-xs">{t("learning.session.questionCount", { count: quizCount })}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-slate-200 text-slate-200" />
                ))}
              </div>
            </div>
          </button>
        ) : null}
      </nav>
    </aside>
  );
}

function VideoContentPanel({
  session,
  activeSectionId,
  progress,
  onToggleChecklistItem,
  onAnswerQuizQuestion,
  onRetryQuiz,
  videoStartSeconds,
  onSeekVideo,
  adaptiveQuiz,
  showValidationErrors = false,
  showQuiz = true,
}: {
  session: LearningSession;
  activeSectionId?: string;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
  onAnswerQuizQuestion: (question: QuizQuestionForProgress, selectedOptionIndex: number) => Promise<void>;
  onRetryQuiz: (questionIds: string[]) => void;
  videoStartSeconds?: number;
  onSeekVideo: (seconds: number) => void;
  adaptiveQuiz?: AdaptiveQuizState | null;
  showValidationErrors?: boolean;
  showQuiz?: boolean;
}) {
  const { t } = useTranslation("common");
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [quizExpanded, setQuizExpanded] = useState(false);

  // Find matching YouTube resource or fallback to first YouTube resource
  const activeResource = activeSectionId ? session.resources.find(r => r.id === activeSectionId && r.type === "youtube") : undefined;
  const ytResource = activeResource || session.resources.find(r => r.type === "youtube");
  const ytId = ytResource ? getYouTubeId(ytResource.url) : null;
  const quiz = buildQuiz(session);
  const quizStats = getQuizStats(progress, quiz);
  const timeline = buildTimeline(session);
  const correctCount = quizStats.correct;
  const quizAnswers = Object.fromEntries(
    quiz
      .map((question, index) => [index, progress.quizAttempts?.[question.id]?.selectedOptionIndex])
      .filter((item): item is [number, number] => typeof item[1] === "number"),
  );
  const legacyAdaptiveQuiz = adaptiveQuiz ?? { weakObjectives: [], nextRecommendedQuestions: [] };

  // Determine if this active section is uncompleted
  const isSectionUncompleted = activeSectionId ? !isSectionComplete(session, progress, activeSectionId) : false;
  const shouldHighlight = showValidationErrors && isSectionUncompleted;

  return (
    <div className="space-y-6">
      {/* YouTube Embed */}
      {ytId ? (
        <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              key={`${ytId}-${videoStartSeconds ?? 0}`}
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1${typeof videoStartSeconds === "number" ? `&start=${videoStartSeconds}&autoplay=1` : ""}`}
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
                : shouldHighlight
                ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100 animate-pulse"
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
                {shouldHighlight ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 animate-bounce" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                )}
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
              <p className="text-xs text-slate-400">{t("learning.common.sections", { count: timeline.length })}</p>
            </div>
          </div>
          {timelineExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {timelineExpanded && (
          <div className="px-5 pb-5 space-y-0">
            {timeline.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSeekVideo(item.startSeconds)}
                className={cn(
                  "flex w-full items-center gap-4 py-2.5 border-t border-slate-100 first:border-0 group hover:bg-primary/5 -mx-5 px-5 cursor-pointer transition-colors text-left",
                  videoStartSeconds === item.startSeconds && "bg-primary/10 text-primary",
                )}
              >
                <span className="text-xs font-mono font-bold text-primary w-12 shrink-0">{item.time}</span>
                <span className="text-sm text-slate-700 group-hover:text-primary transition-colors">{item.label}</span>
              </button>
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
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-800 text-sm">Lesson summary</h4>
                <p className="text-xs text-slate-400">SkillBridge lesson</p>
              </div>
            </div>
            {summaryExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {summaryExpanded && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="prose prose-sm prose-slate max-w-none pt-4 [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary [&_code]:text-xs [&_code]:font-mono [&_strong]:text-slate-800 [&_li]:text-slate-600 [&_p]:text-slate-600 [&_ol]:list-decimal [&_ol]:pl-4">
                <h2>{session.title}</h2>
                <p>{session.lessonContent.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Knowledge Check Quiz ═══ */}
      {false && (
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
                      const attempt = progress.quizAttempts?.[q.id];
                      const isSelected = attempt?.selectedOptionIndex === oi;
                      const isCorrect = Boolean(attempt) && oi === (attempt?.correctOptionIndex ?? q.correct);
                      const isWrong = Boolean(attempt) && isSelected && !attempt?.isCorrect;
                      return (
                        <button
                          key={oi}
                          onClick={() => void onAnswerQuizQuestion(q, oi)}
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
                  {progress.quizAttempts?.[q.id] && q.explanation ? (
                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
                      {progress.quizAttempts[q.id]?.explanation ?? q.explanation}
                    </p>
                  ) : null}
                </div>
              ))}

              {legacyAdaptiveQuiz.weakObjectives.length > 0 || legacyAdaptiveQuiz.nextRecommendedQuestions.length > 0 ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  {legacyAdaptiveQuiz.weakObjectives.length > 0 ? (
                    <p className="text-sm font-semibold text-blue-900">
                      Weak objective: {legacyAdaptiveQuiz.weakObjectives.map((item) => item.objectiveId).join(", ")}
                    </p>
                  ) : null}
                  {legacyAdaptiveQuiz.nextRecommendedQuestions.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-blue-800">
                      {legacyAdaptiveQuiz.nextRecommendedQuestions.map((item) => (
                        <li key={item.id}>{item.question}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {/* Submit / Results */}
              {false ? (
                <Button
                  className="rounded-full w-full"
                  disabled={Object.keys(quizAnswers).length < quiz.length}
                  onClick={() => undefined}
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
                    onClick={() => undefined}
                  >
                    {t("learning.session.retryQuiz")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showQuiz ? (
        <SessionQuiz
          session={session}
          progress={progress}
          onAnswer={onAnswerQuizQuestion}
          onRetry={onRetryQuiz}
          adaptiveQuiz={adaptiveQuiz}
        />
      ) : null}
    </div>
  );
}

// ─── Doc Content Panel (react.dev style) ────────────
function SessionQuiz({
  session,
  progress,
  onAnswer,
  onRetry,
  adaptiveQuiz,
}: {
  session: LearningSession;
  progress: SessionProgressState;
  onAnswer: (question: QuizQuestionForProgress, selectedOptionIndex: number) => Promise<void>;
  onRetry: (questionIds: string[]) => void;
  adaptiveQuiz?: AdaptiveQuizState | null;
}) {
  const { t } = useTranslation("common");
  const quiz = buildQuiz(session);
  const stats = getQuizStats(progress, quiz);
  const passingCount = getQuizPassingCount(quiz.length);
  const passed = stats.correct >= passingCount;
  const [expanded, setExpanded] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [checkingAnswers, setCheckingAnswers] = useState(false);
  if (quiz.length === 0) return null;

  const unansweredQuestions = quiz.filter((question) => !progress.quizAttempts?.[question.id]);
  const hasSelectedEveryUnansweredQuestion = unansweredQuestions.every(
    (question) => typeof selectedAnswers[question.id] === "number",
  );
  const allQuestionsAnswered = quiz.every((question) => progress.quizAttempts?.[question.id]);

  const handleCheckAnswers = async () => {
    if (!hasSelectedEveryUnansweredQuestion || checkingAnswers) return;

    setCheckingAnswers(true);
    try {
      for (const question of unansweredQuestions) {
        const selectedOptionIndex = selectedAnswers[question.id];
        if (typeof selectedOptionIndex === "number") {
          await onAnswer(question, selectedOptionIndex);
        }
      }
    } finally {
      setCheckingAnswers(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    onRetry(quiz.map((question) => question.id));
  };

  return (
    <div id="quiz-panel" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
            <HelpCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">{t("learning.session.knowledgeCheck")}</h4>
            <p className="text-xs text-slate-400">
              {t("learning.session.questionCount", { count: quiz.length })} - {t("learning.session.correctCount", { correct: stats.correct, total: quiz.length })} - Pass {passingCount}/{quiz.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <span>{expanded ? "Hide quiz" : "Start quiz"}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-slate-100 p-5">
          {quiz.map((question, index) => {
            const attempt = progress.quizAttempts?.[question.id];
            const answered = Boolean(attempt);
            const correctOptionIndex = attempt?.correctOptionIndex ?? question.correct;
            const selectedOptionIndex = answered ? attempt?.selectedOptionIndex : selectedAnswers[question.id];
            const displayOptions = getDisplayOptions(question);

            return (
              <div key={question.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                    {quizKindLabel(question.kind)}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  <span className="mr-2 font-bold text-primary">Q{index + 1}.</span>
                  {question.question}
                </p>
                <div className="space-y-2">
                  {displayOptions.map(({ option, originalIndex }, displayIndex) => {
                    const isSelected = selectedOptionIndex === originalIndex;
                    const isCorrect = answered && originalIndex === correctOptionIndex;
                    const isWrong = answered && isSelected && !attempt?.isCorrect;

                    return (
                      <button
                        key={`${question.id}-${originalIndex}`}
                        type="button"
                        disabled={answered}
                        onClick={() =>
                          setSelectedAnswers((current) => ({
                            ...current,
                            [question.id]: originalIndex,
                          }))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all disabled:cursor-default",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : isWrong
                            ? "border-red-300 bg-red-50 text-red-800"
                            : isSelected
                            ? "border-primary/30 bg-primary/5 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                            isCorrect
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : isWrong
                              ? "border-red-500 bg-red-500 text-white"
                              : isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300",
                          )}
                        >
                          {String.fromCharCode(65 + displayIndex)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
                {answered ? (
                  <div className="flex justify-end">
                    <span className={cn("text-xs font-semibold", attempt?.isCorrect ? "text-emerald-600" : "text-red-600")}>
                      {attempt?.isCorrect ? "Correct" : "Review this answer"}
                    </span>
                  </div>
                ) : null}
                {attempt ? (
                  <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
                    {attempt.explanation ?? question.explanation}
                  </p>
                ) : null}
              </div>
            );
          })}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Passing score: {passingCount}/{quiz.length} correct ({Math.round(QUIZ_PASSING_RATIO * 100)}%)
              </p>
              <p className={cn("mt-1 text-xs font-medium", passed ? "text-emerald-600" : "text-slate-500")}>
                {allQuestionsAnswered
                  ? passed
                    ? "Quiz passed. You can complete this lesson."
                    : "Review the explanations and retry before completing this lesson."
                  : "Choose an answer for every question, then check once."}
              </p>
            </div>
            <Button
              type="button"
              className="rounded-full"
              disabled={!hasSelectedEveryUnansweredQuestion || allQuestionsAnswered || checkingAnswers}
              onClick={() => void handleCheckAnswers()}
            >
              {t("learning.session.checkAnswers")}
            </Button>
            {allQuestionsAnswered ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={handleRetry}
              >
                {t("learning.session.retryQuiz", { defaultValue: "Retry quiz" })}
              </Button>
            ) : null}
          </div>
          {adaptiveQuiz && (adaptiveQuiz.weakObjectives.length > 0 || adaptiveQuiz.nextRecommendedQuestions.length > 0) ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              {adaptiveQuiz.weakObjectives.length > 0 ? (
                <p className="text-sm font-semibold text-blue-900">
                  Weak objective: {adaptiveQuiz.weakObjectives.map((item) => item.objectiveId).join(", ")}
                </p>
              ) : null}
              {adaptiveQuiz.nextRecommendedQuestions.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                  {adaptiveQuiz.nextRecommendedQuestions.map((item) => (
                    <li key={item.id}>{item.question}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceSummary({
  session,
  progress,
}: {
  session: LearningSession;
  progress: SessionProgressState;
}) {
  const evidence = getSessionEvidenceSummary(session, progress);
  const completedProofs = evidence.tasks.filter((item) => item.complete);

  const handleCopy = () => {
    const text = buildEvidenceClipboardText(session, progress);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Portfolio evidence
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Evidence summary</h3>
          <p className="mt-1 text-sm text-slate-500">
            Lab proof {evidence.completedTasks}/{evidence.totalTasks} - Quiz {evidence.quizCorrect}/{evidence.quizTotal}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              evidence.readyForPortfolio
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {evidence.readyForPortfolio ? "Ready for portfolio" : "Practice needed"}
          </span>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={handleCopy}>
            Copy summary
          </Button>
        </div>
      </div>
      {completedProofs.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {completedProofs.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.proof}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          Complete at least one lab task to build portfolio evidence.
        </p>
      )}
    </section>
  );
}
const getSectionEnrichments = (skillCanonical: string, title: string) => {
  const sk = skillCanonical.toLowerCase();
  const t = title.toLowerCase();

  // 1. React Template
  if (sk.includes("react")) {
    return {
      exampleCode: `import React, { useState, useEffect } from 'react';\n\nexport function UserProfile({ userId }) {\n  const [user, setUser] = useState(null);\n\n  useEffect(() => {\n    // Fetch user details\n    fetch(\`/api/users/\${userId}\`)\n      .then(res => res.json())\n      .then(data => setUser(data));\n  }, [userId]);\n\n  if (!user) return <p>Loading user profile...</p>;\n\n  return (\n    <div className="p-4 rounded-xl border border-slate-200">\n      <h3 className="text-lg font-bold">{user.name}</h3>\n      <p className="text-slate-500">{user.email}</p>\n    </div>\n  );\n}`,
      proTip: "Always specify the dependency array in useEffect to avoid infinite render loops, and make sure to clean up event listeners or timers on unmount!"
    };
  }

  // 2. JS / TS Template
  if (sk.includes("javascript") || sk.includes("typescript")) {
    return {
      exampleCode: `// Async/Await API Fetch with TypeScript interface\ninterface JobMatch {\n  jobId: string;\n  score: number;\n}\n\nasync function fetchJobMatches(userId: string): Promise<JobMatch[]> {\n  try {\n    const response = await fetch(\`/api/matches/\${userId}\`);\n    if (!response.ok) throw new Error("Failed to load matches");\n    return await response.json();\n  } catch (error) {\n    console.error("Match error:", error);\n    return [];\n  }\n}`,
      proTip: "Use 'const' for variables by default. Only use 'let' if you expect the variable value to change. Avoid 'var' entirely in modern JS/TS."
    };
  }

  // 3. HTML / CSS Template
  if (sk.includes("html") || sk.includes("css")) {
    return {
      exampleCode: `<!-- Semantic HTML structure with Flexbox centering CSS -->\n<main class="container">\n  <article class="card">\n    <h2>Learning Dashboard</h2>\n    <p>Track your generated roadmap and complete exercises.</p>\n  </article>\n</main>\n\n<style>\n  .container {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    min-height: 100vh;\n    background: #f8fafc;\n  }\n  .card {\n    padding: 24px;\n    border-radius: 12px;\n    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);\n  }\n</style>`,
      proTip: "Using semantic tags like <main>, <article>, and <section> instead of generic <div> tags greatly improves both SEO indexing and Screen Reader accessibility."
    };
  }

  // 4. SQL / Postgres Template
  if (sk.includes("sql") || sk.includes("postgresql")) {
    return {
      exampleCode: `-- SQL Inner Join with Aggregation and Filter\nSELECT \n  d.role_title,\n  COUNT(u.id) as total_candidates,\n  ROUND(AVG(m.score), 2) as avg_match_score\nFROM job_descriptions d\nINNER JOIN cv_match_scores m ON d.id = m.job_id\nINNER JOIN users u ON m.user_id = u.id\nWHERE m.score >= 70\nGROUP BY d.role_title\nHAVING COUNT(u.id) > 5\nORDER BY avg_match_score DESC;`,
      proTip: "Always index database columns that are frequently used in WHERE conditions, JOIN clauses, or ORDER BY statements to speed up queries!"
    };
  }

  // 5. Node.js / Backend Development Template
  if (sk.includes("node") || sk.includes("backend")) {
    return {
      exampleCode: `const express = require('express');\nconst app = express();\n\napp.use(express.json());\n\n// REST API endpoint to save learning progress\napp.post('/api/learning/progress', async (req, res) => {\n  const { sessionId, progress } = req.body;\n  if (!sessionId || !progress) {\n    return res.status(400).json({ error: "Missing parameters" });\n  }\n  try {\n    const saved = await db.saveProgress(req.user.id, sessionId, progress);\n    res.status(201).json(saved);\n  } catch (err) {\n    res.status(500).json({ error: "Database save failed" });\n  }\n});`,
      proTip: "Always validate incoming request body parameters at the API gateway layer to prevent malicious SQL injections or Server crashes."
    };
  }

  // 6. Java / Spring Boot Template
  if (sk.includes("java") || sk.includes("spring")) {
    return {
      exampleCode: `@RestController\n@RequestMapping("/api/roadmap")\npublic class RoadmapController {\n\n    @Autowired\n    private RoadmapService roadmapService;\n\n    @GetMapping("/{userId}")\n    public ResponseEntity<RoadmapDto> getUserRoadmap(@PathVariable String userId) {\n        RoadmapDto roadmap = roadmapService.generateOrGet(userId);\n        if (roadmap == null) {\n            return ResponseEntity.notFound().build();\n        }\n        return ResponseEntity.ok(roadmap);\n    }\n}`,
      proTip: "Use Constructor Injection instead of field-based @Autowired for dependencies to ensure class parameters can be easily mocked in Unit Tests."
    };
  }

  // 7. .NET Template
  if (sk.includes("dotnet") || sk.includes("csharp")) {
    return {
      exampleCode: `using Microsoft.AspNetCore.Mvc;\n\n[ApiController]\n[Route("api/[controller]")]\npublic class LearningController : ControllerBase\n{\n    private readonly ILearningService _learningService;\n    public LearningController(ILearningService service) => _learningService = service;\n\n    [HttpGet("{sessionId}")]\n    public async Task<IActionResult> GetProgress(string sessionId)\n    {\n        var progress = await _learningService.GetProgressAsync(User.GetUserId(), sessionId);\n        return progress == null ? NotFound() : Ok(progress);\n    }\n}`,
      proTip: "Always use asynchronous operations (async/await) when writing database or file operations to prevent thread pool starvation on high traffic servers."
    };
  }

  // 8. Docker / DevOps Template
  if (sk.includes("docker") || sk.includes("kubernetes") || sk.includes("ci_cd")) {
    return {
      exampleCode: `# Multi-stage Build Dockerfile for high-performance frontend\nFROM node:18-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\n\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]`,
      proTip: "Keep Docker images as lightweight as possible by using alpine-based images and utilizing multi-stage builds to discard build dependencies."
    };
  }

  // 9. Git Template
  if (sk.includes("git")) {
    return {
      exampleCode: `# Resolve merge conflicts or cherry pick commits\ngit checkout -b feature/cv-playground\n\n# Staging and committing changes\ngit add .\ngit commit -m "feat(learning): code sandbox drawer"\n\n# Push branch and link to remote upstream\ngit push --set-upstream origin feature/cv-playground`,
      proTip: "Write descriptive commit messages in the imperative mood (e.g. 'feat: add login validation') to maintain clean and readable git history logs."
    };
  }

  // 10. AI / Machine Learning Template
  if (sk.includes("llm") || sk.includes("machine") || sk.includes("deep")) {
    return {
      exampleCode: `import openai\n\n# OpenAI client invocation structured parsing\nresponse = openai.chat.completions.create(\n    model="gpt-4o",\n    response_format={ "type": "json_object" },\n    messages=[\n        {"role": "system", "content": "You are a CV grader. Output JSON containing scores & gaps."},\n        {"role": "user", "content": "Grades for candidate: Resume text..."}\n    ]\n)\nprint("AI Grade Output:", response.choices[0].message.content)`,
      proTip: "Always set system prompts to anchor AI behaviors, and use JSON validation schemas to ensure response structures do not break downstream logic."
    };
  }

  // 11. Soft Skills Template (Reflections, agile, communication)
  if (sk.includes("communication") || sk.includes("writing") || sk.includes("teamwork") || sk.includes("english") || sk.includes("agile")) {
    return {
      exampleCode: `# Daily Agile Standup Update\n1. Accomplished Yesterday:\n   - Fixed the dynamic OpenCV Canvas rendering script.\n2. Targets for Today:\n   - Connect layout tabs and run full typescript type-checks.\n3. Blockers:\n   - None.`,
      proTip: "Keep updates concise. Focus on quantifiable achievements (e.g. 'Improved performance by 15%') rather than vague statements."
    };
  }

  // 12. OpenCV Computer Vision Templates (Default Fallback)
  if (t.includes("setup") || t.includes("introduction")) {
    return {
      exampleCode: `import cv2\nimport numpy as np\n\nprint("OpenCV version:", cv2.__version__)\nprint("NumPy version:", np.__version__)`,
      proTip: "Make sure you run 'pip install opencv-python' in your local environment. In this sandbox, cv2 is pre-loaded and simulated client-side!"
    };
  }
  if (t.includes("reading") || t.includes("video")) {
    return {
      exampleCode: `import cv2\n\n# Read image in BGR format\nimg = cv2.imread("input.jpg")\n\n# Check shape (height, width, channels)\nprint("Image properties:", img.shape)\n\n# Show image\ncv2.imshow("Preview", img)\ncv2.waitKey(0)`,
      proTip: "OpenCV reads images in BGR order, while most other libraries (like PIL or matplotlib) use RGB. Keep this in mind when displaying color channels!"
    };
  }
  if (t.includes("resizing") || t.includes("drawing") || t.includes("overlay")) {
    return {
      exampleCode: `import cv2\n\nimg = cv2.imread("input.jpg")\n\n# Resize to specific (width, height)\nresized = cv2.resize(img, (400, 300))\n\n# Draw line, rectangle, and circle\ncv2.line(resized, (0, 0), (100, 100), (255, 0, 0), 2)\ncv2.rectangle(resized, (50, 50), (150, 150), (0, 255, 0), 3)\ncv2.circle(resized, (200, 200), 50, (0, 0, 255), -1)\n\n# Draw text overlay\ncv2.putText(resized, "CV Studio", (20, 280), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)`,
      proTip: "OpenCV drawing operations are in-place, meaning they modify the original image array. Use img.copy() if you want to keep the original untouched!"
    };
  }
  if (t.includes("transforms") || t.includes("edge") || t.includes("contour")) {
    return {
      exampleCode: `import cv2\n\nimg = cv2.imread("input.jpg")\n\n# Convert to grayscale\ngray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)\n\n# Apply Gaussian Blur to reduce noise\nblurred = cv2.GaussianBlur(gray, (5, 5), 0)\n\n# Detect edges using Canny filter\nedges = cv2.Canny(blurred, 100, 200)\n\n# Find contours\ncontours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)`,
      proTip: "Always apply Gaussian Blur before running Canny Edge Detection to filter out random high-frequency background noise!"
    };
  }
  if (t.includes("face") || t.includes("cascade") || t.includes("recognition")) {
    return {
      exampleCode: `import cv2\n\n# Load pre-trained frontal face cascade\nface_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')\n\nimg = cv2.imread("input.jpg")\ngray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)\n\n# Detect faces\nfaces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)\n\n# Draw boxes around faces\nfor (x, y, w, h) in faces:\n    cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)`,
      proTip: "Haar cascade models are fast but can have false positives. Adjust 'scaleFactor' (usually 1.1 - 1.3) and 'minNeighbors' (usually 3 - 6) to fine-tune accuracy."
    };
  }
  return null;
};

function DocContentPanel({
  session,
  activeSectionId,
  onSelectSection,
  progress,
  onToggleChecklistItem,
  onExerciseProofChange,
  onToggleSaveCourse,
  onAnswerQuizQuestion: _onAnswerQuizQuestion,
  onRetryQuiz: _onRetryQuiz,
  adaptiveQuiz: _adaptiveQuiz,
  showValidationErrors = false,
  mode = "learn",
  onOpenSandboxWithSection,
}: {
  session: LearningSession;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
  onExerciseProofChange: (exerciseId: string, proof: string) => void;
  onToggleSaveCourse: (courseId: string) => void;
  onAnswerQuizQuestion: (question: QuizQuestionForProgress, selectedOptionIndex: number) => Promise<void>;
  onRetryQuiz: (questionIds: string[]) => void;
  adaptiveQuiz?: AdaptiveQuizState | null;
  showValidationErrors?: boolean;
  mode?: LearningMode;
  onOpenSandboxWithSection?: (sectionTitle: string) => void;
}) {
  const { t } = useTranslation("common");
  const [currentPage, setCurrentPage] = useState(1);
  const [taskProofErrors, setTaskProofErrors] = useState<Record<string, boolean>>({});
  const [expandedTaskProofId, setExpandedTaskProofId] = useState<string | null>(null);
  useEffect(() => setCurrentPage(1), [activeSectionId]);
  const lessonSections = session.sections.filter((section) => section.type !== "video");
  const contentSections = lessonSections.length > 0 ? lessonSections : session.sections;
  const activeSection = contentSections.find(s => s.id === activeSectionId) ?? contentSections[0];
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

  const visibleRecommendedCourses = (session.recommendedCourses ?? []).filter((c) => !progress.savedCourseIds?.includes(c.id));
  const nextSectionId = getNextLearningSectionId(contentSections, activeSection?.id ?? activeSectionId);
  const nextSection = contentSections.find((section) => section.id === nextSectionId);

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(visibleRecommendedCourses.length / ITEMS_PER_PAGE);
  const effectivePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
  const paginatedCourses = visibleRecommendedCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const activeSectionOutcomes = getSectionLearningOutcomes(activeSection);

  const handleCheckPracticeTask = (sectionId: string, itemId: string) => {
    const proofId = getChecklistTaskProofId(sectionId, itemId);
    if (!hasChecklistTaskProof(progress, sectionId, itemId)) {
      setExpandedTaskProofId(proofId);
      setTaskProofErrors((current) => ({ ...current, [proofId]: true }));
      return;
    }

    setTaskProofErrors((current) => ({ ...current, [proofId]: false }));
    if (!(progress.checkedChecklistItems[sectionId] ?? []).includes(itemId)) {
      onToggleChecklistItem(sectionId, itemId);
    }
  };

  return (
    <div className="relative w-full">
      {/* Left Column (Main Content) */}
      <div className="w-full space-y-6">
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
          {contentSections.map((section, i) => (
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
        {activeSectionOutcomes.length > 0 ? (
          <div className="not-prose mb-6 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-700">
              You will be able to
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {activeSectionOutcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-2 text-sm leading-5 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {contentSections.map((sec, i) => {
          const isSectionIncomplete = !isSectionComplete(session, progress, sec.id);
          const shouldHighlightSection = showValidationErrors && isSectionIncomplete;
          const enrich = mode === "learn" ? getSectionEnrichments(session.moduleId, sec.title) : null;
          return (
            <div
              key={sec.id}
              id={`section-${sec.id}`}
              className={cn(
                "scroll-mt-6 p-4 rounded-2xl border transition-all duration-300",
                shouldHighlightSection
                  ? "border-red-400 bg-red-50/20 shadow-sm"
                  : "border-transparent"
              )}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-2 mb-3">
                <h3 className={cn("m-0 border-0 pb-0", shouldHighlightSection ? "text-red-900" : "")}>
                  {i + 1}. {sec.title}
                </h3>
                {mode === "learn" && onOpenSandboxWithSection && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-primary hover:border-primary/45 font-bold px-3 flex items-center gap-1.5 shadow-sm transition-all text-xs"
                    onClick={() => onOpenSandboxWithSection(sec.title)}
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                    Try Sandbox
                  </Button>
                )}
              </div>
              {shouldHighlightSection && (
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mt-1 mb-2 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5" /> Chưa hoàn thành nội dung tự học này
                </p>
              )}
              {sec.body ? (
                <p>{sec.body}</p>
              ) : (
                <p>
                  {t("learning.session.type")}: <strong>{sec.type}</strong>{" - "}
                  {t("learning.common.exercises", { count: sec.exercises })}
                  {sec.completed ? ` - ${t("learning.status.completed")}` : ""}
                </p>
              )}
              {mode === "learn" && enrich && (
                <div className="mt-4 space-y-3">
                  {enrich.exampleCode && (
                    <div className="not-prose rounded-xl bg-slate-950 p-4 border border-slate-800 shadow-inner font-mono text-[11px] text-emerald-400 leading-relaxed">
                      <div className="flex justify-between items-center text-slate-500 mb-2 pb-1.5 border-b border-slate-850 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> Example Code</span>
                        <span>python</span>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap select-all font-mono">{enrich.exampleCode}</pre>
                    </div>
                  )}
                  {enrich.proTip && (
                    <div className="not-prose rounded-xl border border-amber-250/30 bg-amber-50/20 p-3.5 text-xs text-amber-800 leading-relaxed shadow-sm">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[9px] mb-1">
                        💡 Pro Tip
                      </span>
                      {enrich.proTip}
                    </div>
                  )}
                </div>
              )}
              {mode === "practice" ? (
                sec.checklist?.length ? (
                  <div className="mt-4 space-y-3">
                    {sec.checklist.map((item, itemIndex) => {
                    const isItemChecked = (progress.checkedChecklistItems[sec.id] ?? []).includes(item.id);
                    const proofId = getChecklistTaskProofId(sec.id, item.id);
                    const proofValue = progress.exerciseProofs[proofId] ?? "";
                    const hasProof = hasChecklistTaskProof(progress, sec.id, item.id);
                    const isTaskComplete = isItemChecked && hasProof;
                    const shouldHighlightItem = (showValidationErrors && !isTaskComplete) || taskProofErrors[proofId];
                    const missionKind = getMissionStepKind(item.label);
                    const guide = getPracticeTaskGuide(missionKind);
                    const rubric = getPracticeTaskRubric(missionKind);
                    const placeholder = getPracticeTaskPlaceholder(missionKind);
                    const isExpanded = expandedTaskProofId === proofId || shouldHighlightItem;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "overflow-hidden rounded-xl border bg-white transition-all",
                            isTaskComplete
                              ? "border-emerald-200 bg-emerald-50/50"
                              : shouldHighlightItem
                              ? "border-red-200 bg-red-50/40"
                              : "border-slate-200 hover:border-primary/30",
                          )}
                        >
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedTaskProofId((current) => (current === proofId ? null : proofId))
                            }
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                                isTaskComplete
                                  ? "border-emerald-500 bg-emerald-500"
                                  : shouldHighlightItem
                                  ? "border-red-200 bg-white"
                                  : "border-slate-200 bg-slate-50",
                              )}
                            >
                              {shouldHighlightItem && !isTaskComplete ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <MissionStepIcon kind={missionKind} completed={isTaskComplete} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[11px] font-bold uppercase tracking-widest",
                                    isTaskComplete ? "text-emerald-600" : shouldHighlightItem ? "text-red-500" : "text-primary",
                                  )}
                                >
                                  Lab {String(itemIndex + 1).padStart(2, "0")}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block truncate text-sm font-semibold leading-5",
                                  isTaskComplete ? "text-emerald-950" : shouldHighlightItem ? "text-red-900" : "text-slate-800",
                                )}
                              >
                                {item.label}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                                isTaskComplete
                                  ? "border-emerald-200 bg-white text-emerald-700"
                                  : shouldHighlightItem
                                  ? "border-red-200 bg-white text-red-600"
                                  : "border-slate-200 bg-slate-50 text-slate-500",
                              )}
                            >
                              {isTaskComplete ? "Done" : shouldHighlightItem ? "Required" : "To do"}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                          </button>
                          {isExpanded ? (
                            <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                              <p className="text-xs leading-5 text-slate-500">{guide}</p>
                              <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_0.9fr]">
                                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Practice rubric
                                  </p>
                                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                    {rubric.map((criterion) => (
                                      <li
                                        key={criterion}
                                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"
                                      >
                                        {criterion}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Example proof
                                  </p>
                                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{placeholder}</p>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
                                <label className="min-w-0 flex-1">
                                  <span className="sr-only">
                                    Proof for {item.label}
                                  </span>
                                  <textarea
                                    aria-label={`Proof for ${item.label}`}
                                    value={proofValue}
                                    onChange={(event) => {
                                      onExerciseProofChange(proofId, event.target.value);
                                      if (taskProofErrors[proofId]) {
                                        setTaskProofErrors((current) => ({ ...current, [proofId]: false }));
                                      }
                                    }}
                                    placeholder={placeholder}
                                    className={cn(
                                      "min-h-12 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-5 outline-none transition-colors placeholder:text-slate-400 focus:ring-2",
                                      shouldHighlightItem && !hasProof
                                        ? "border-red-300 bg-white text-red-900 focus:border-red-400 focus:ring-red-100"
                                        : "border-slate-200 bg-white text-slate-700 focus:border-primary/40 focus:ring-primary/10",
                                    )}
                                  />
                                </label>
                                <Button
                                  type="button"
                                  variant={isTaskComplete ? "outline" : "default"}
                                  size="sm"
                                  className="h-10 shrink-0 rounded-full px-4"
                                  disabled={isTaskComplete}
                                  onClick={() => handleCheckPracticeTask(sec.id, item.id)}
                                >
                                  {isTaskComplete ? "Done" : "Check task"}
                                </Button>
                              </div>
                              {taskProofErrors[proofId] ? (
                                <p className="mt-1.5 text-xs font-semibold text-red-600">
                                  Add proof before checking this task.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
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
                          : shouldHighlightSection
                          ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
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
                          {shouldHighlightSection ? (
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 animate-bounce" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span>{t("learning.session.markComplete")}</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              ) : (
                null
              )}
            </div>
          );
        })}

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

      {mode === "practice" && session.lessonContent?.exercises.length ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {t("learning.session.practiceTasks")}
          </p>
          {session.lessonContent.exercises.map((exercise) => {
            const isExerciseIncomplete = !progress.exerciseProofs[exercise.id]?.trim();
            const shouldHighlightExercise = showValidationErrors && isExerciseIncomplete;
            return (
              <div
                key={exercise.id}
                className={cn(
                  "rounded-xl border transition-all duration-300 p-4",
                  shouldHighlightExercise
                    ? "border-red-400 bg-red-50/20 shadow-sm"
                    : "border-slate-200 bg-white"
                )}
              >
                <h3 className={cn("text-base font-bold", shouldHighlightExercise ? "text-red-900" : "text-slate-900")}>{exercise.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{exercise.prompt}</p>
                {shouldHighlightExercise && (
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mt-2 mb-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> Vui lòng dán minh chứng hoàn thành bài tập này
                  </p>
                )}
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
                    className={cn(
                      "mt-2 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-slate-400 focus:ring-2",
                      shouldHighlightExercise
                        ? "border-red-300 bg-red-50/10 focus:border-red-400 focus:ring-red-100 text-red-900 placeholder:text-red-300"
                        : "border-slate-200 bg-white text-slate-700 focus:border-primary/40 focus:ring-primary/10"
                    )}
                  />
                </label>
              </div>
            );
          })}
        </div>
      ) : null}

      {mode === "practice" ? (
        <EvidenceSummary session={session} progress={progress} />
      ) : null}

      {mode === "learn" && activeResource && (
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

      {/* Right Column (Recommended Courses Only) */}
      <div className="w-full xl:absolute xl:top-[90px] xl:left-[calc(100%+48px)] xl:w-[280px] 2xl:left-[calc(100%+64px)] 2xl:w-[320px] shrink-0 space-y-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm mt-8 xl:mt-0">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
          <GraduationCap className="w-5 h-5 text-primary shrink-0" />
          <h4 className="font-poppins font-bold text-slate-800 text-sm tracking-wider uppercase">
            {t("learning.session.recommendedCourses")}
          </h4>
          <span className="ml-auto h-5 min-w-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
            {visibleRecommendedCourses.length}
          </span>
        </div>

        {visibleRecommendedCourses.length ? (
          <div className="space-y-1">
            {paginatedCourses.map((course, idx) => (
              <RecommendedCourseCard key={course.id} course={course} rank={startIndex + idx + 1} onToggleSaveCourse={onToggleSaveCourse} />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5 pt-3 border-t border-slate-100">
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
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">
            {t("learning.session.noRecommendedCourses", { defaultValue: "Chưa có khóa học đề xuất" })}
          </p>
        )}
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
  onAnswerQuizQuestion,
  onRetryQuiz,
  videoStartSeconds,
  onSeekVideo,
  adaptiveQuiz,
  showValidationErrors = false,
  onOpenSandboxWithSection,
}: {
  session: LearningSession;
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  progress: SessionProgressState;
  onToggleChecklistItem: (sectionId: string, item: string) => void;
  onExerciseProofChange: (exerciseId: string, proof: string) => void;
  onToggleSaveCourse: (courseId: string) => void;
  onAnswerQuizQuestion: (question: QuizQuestionForProgress, selectedOptionIndex: number) => Promise<void>;
  onRetryQuiz: (questionIds: string[]) => void;
  videoStartSeconds?: number;
  onSeekVideo: (seconds: number) => void;
  adaptiveQuiz?: AdaptiveQuizState | null;
  showValidationErrors?: boolean;
  onOpenSandboxWithSection?: (sectionTitle: string) => void;
}) {
  const { t } = useTranslation("common");
  const [activeMode, setActiveMode] = useState<LearningMode>("learn");
  const activeSection = session.sections.find(s => s.id === activeSectionId) ?? session.sections[0];
  const isVideoSection = activeSection?.type === "video" || activeSection?.type === "quiz" || activeSection?.type === "practice";
  const isDocSection = activeSection?.type === "reading";

  // If the session has a YouTube resource and the section is video/practice/quiz, show video
  const hasYouTube = session.resources.some(r => r.type === "youtube");

  return (
    <main className="flex-1 overflow-y-auto min-w-0">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6 space-y-6 relative">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{t("learning.common.week", { number: session.moduleId.replace("demo-", "") })}</span>
          <ChevronRight className="w-3 h-3" />
          <span>{t("learning.common.session", { number: session.sessionNumber })}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">{activeSection?.title}</span>
        </div>

        <div role="tablist" aria-label="Learning mode" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {([
            { id: "learn", label: "Learn", icon: BookOpen },
            { id: "practice", label: "Practice", icon: GraduationCap },
            { id: "check", label: "Check", icon: HelpCircle },
          ] as const).map((tab) => {
            const isActiveMode = activeMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActiveMode}
                onClick={() => setActiveMode(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                  isActiveMode ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Render based on content type */}
        {activeMode === "check" ? (
          <div className="space-y-4">
            <EvidenceSummary session={session} progress={progress} />
            <SessionQuiz
              session={session}
              progress={progress}
              onAnswer={onAnswerQuizQuestion}
              onRetry={onRetryQuiz}
              adaptiveQuiz={adaptiveQuiz}
            />
          </div>
        ) : activeMode === "learn" && (hasYouTube && (isVideoSection || !isDocSection)) ? (
          <VideoContentPanel
            session={session}
            activeSectionId={activeSectionId}
            progress={progress}
            onToggleChecklistItem={onToggleChecklistItem}
            onAnswerQuizQuestion={onAnswerQuizQuestion}
            onRetryQuiz={onRetryQuiz}
            videoStartSeconds={videoStartSeconds}
            onSeekVideo={onSeekVideo}
            adaptiveQuiz={adaptiveQuiz}
            showValidationErrors={showValidationErrors}
            showQuiz={false}
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
            onAnswerQuizQuestion={onAnswerQuizQuestion}
            onRetryQuiz={onRetryQuiz}
            adaptiveQuiz={adaptiveQuiz}
            showValidationErrors={showValidationErrors}
            mode={activeMode}
            onOpenSandboxWithSection={onOpenSandboxWithSection}
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
  const posthog = usePostHog();
  const initialSectionId = orderLearningSectionsForDisplay(session.sections)[0]?.id ?? "";
  const [activeSectionId, setActiveSectionId] = useState(initialSectionId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxSectionTitle, setSandboxSectionTitle] = useState<string | undefined>(undefined);
  
  const handleOpenSandboxWithSection = (sectionTitle: string) => {
    setSandboxSectionTitle(sectionTitle);
    setIsSandboxOpen(true);
  };

  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [videoStartSeconds, setVideoStartSeconds] = useState<number | undefined>(undefined);
  const [adaptiveQuiz, setAdaptiveQuiz] = useState<AdaptiveQuizState | null>(null);
  const [progress, setProgress] = useState<SessionProgressState>(() =>
    createInitialSessionProgress(session, readStoredSessionProgress(session.id)),
  );
  const [progressSessionId, setProgressSessionId] = useState(session.id);
  const progressRef = useRef(progress);
  const progressHydratedRef = useRef(false);
  const locallyChangedProgressRef = useRef(false);
  const suppressNextProgressSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const progressBelongsToCurrentSession = progressSessionId === session.id;
  const visibleProgress = progressBelongsToCurrentSession
    ? progress
    : createInitialSessionProgress(session, readStoredSessionProgress(session.id));
  const isCompleted =
    session.status === "completed" ||
    (progressBelongsToCurrentSession &&
      (progress.checkedChecklistItems["__session"]?.includes("completed") ?? false));

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    setActiveSectionId(initialSectionId);
    setVideoStartSeconds(undefined);
    setAdaptiveQuiz(null);
    setShowValidationErrors(false);
  }, [initialSectionId, session.id]);

  useEffect(() => {
    const localProgress = createInitialSessionProgress(session, readStoredSessionProgress(session.id));
    setProgress(localProgress);
    setProgressSessionId(session.id);
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
        setProgressSessionId(session.id);
        progressRef.current = hydrated;
        return getLearningNextQuestions(session.id, session.moduleId)
          .then((nextQuestions) => {
            if (!isActive) return;
            setAdaptiveQuiz({
              weakObjectives: nextQuestions.weak_objectives.map((item) => ({
                objectiveId: item.objective_id,
                correct: item.correct,
                totalAnswered: item.total_answered,
                accuracy: item.accuracy,
                mastered: item.mastered,
              })),
              nextRecommendedQuestions: nextQuestions.next_recommended_questions.map((item) => ({
                id: item.id,
                question: item.question,
                objectiveId: item.objective_id,
                sectionId: item.section_id,
              })),
            });
          })
          .catch(() => undefined);
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
    if (!progressBelongsToCurrentSession) return;
    writeStoredSessionProgress(session.id, progress);
    if (!hasApiAuthSession() || !progressHydratedRef.current) return;
    if (suppressNextProgressSaveRef.current) {
      suppressNextProgressSaveRef.current = false;
      return;
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveLearningSessionProgress(session.id, progress).catch(() => undefined);
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [progress, progressBelongsToCurrentSession, session.id]);

  const displaySession = orderSessionForDisplay(applyProgressToSession(session, visibleProgress));

  const weeks = useActiveWeekPlans();
  const ALL_SESSIONS = weeks.flatMap(w => w.sessions).sort((a, b) => a.sessionNumber - b.sessionNumber);

  const currentIdx = ALL_SESSIONS.findIndex(s => s.id === session.id);

  const { weekPlans, setWeekPlans } = useRoadmapStore();
  const handleComplete = () => {
    if (isCompleted) return;

    // Validate that all sections are completed
    const incompleteSections = session.sections.filter(
      (sec) => !isSectionComplete(session, visibleProgress, sec.id)
    );
    const exercises = session.lessonContent?.exercises ?? [];
    const incompleteExercises = exercises.filter(
      (ex) => !visibleProgress.exerciseProofs[ex.id]?.trim()
    );
    const quizPassed = isQuizPassed(session, visibleProgress);

    if (incompleteSections.length > 0 || incompleteExercises.length > 0 || !quizPassed) {
      setShowValidationErrors(true);
      
      // Optionally scroll to the first uncompleted section
      if (incompleteSections.length > 0) {
        const firstIncompleteId = incompleteSections[0].id;
        const element = document.getElementById(`section-${firstIncompleteId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (!quizPassed) {
        const quizPanel = document.getElementById("quiz-panel");
        if (typeof quizPanel?.scrollIntoView === "function") {
          quizPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    const updatedProgress = {
      ...visibleProgress,
      checkedChecklistItems: {
        ...visibleProgress.checkedChecklistItems,
        "__session": ["completed"],
      },
    };
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);
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

    posthog?.capture("learning_session_completed", {
      session_id: session.id,
      skill: session.skill,
      completion_percent: 100,
    });

    const next = ALL_SESSIONS[currentIdx + 1];
    setTimeout(() => next ? navigate(`/learning/session/${next.id}`) : navigate("/learning"), 800);
  };
  const prevSession = currentIdx > 0 ? ALL_SESSIONS[currentIdx - 1] : null;
  const nextSession = currentIdx < ALL_SESSIONS.length - 1 ? ALL_SESSIONS[currentIdx + 1] : null;

  const isLocked = (s: LearningSession) => s.status === "locked";

  const handleToggleChecklistItem = (sectionId: string, item: string) => {
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);
    const baseProgress = progressBelongsToCurrentSession ? progressRef.current : visibleProgress;
    const nextChecked = !(baseProgress.checkedChecklistItems[sectionId] ?? []).includes(item);
    const optimisticProgress = toggleChecklistItem(baseProgress, sectionId, item);
    progressRef.current = optimisticProgress;
    if (hasApiAuthSession() && item !== "__completed") {
      suppressNextProgressSaveRef.current = true;
    }
    setProgress(optimisticProgress);
    if (hasApiAuthSession() && item !== "__completed") {
      void patchLearningChecklistItem(session.id, item, {
        section_id: sectionId,
        checked: nextChecked,
      })
        .then((remoteProgress) => {
          const hydrated = createInitialSessionProgress(session, remoteProgress);
          progressRef.current = hydrated;
          suppressNextProgressSaveRef.current = true;
          setProgress(hydrated);
        })
        .catch(() => undefined);
    }
  };

  const handleExerciseProofChange = (exerciseId: string, proof: string) => {
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);
    setProgress((current) =>
      setExerciseProof(progressBelongsToCurrentSession ? current : visibleProgress, exerciseId, proof),
    );
  };

  const handleToggleSaveCourse = (courseId: string) => {
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);
    setProgress((current) =>
      toggleSavedCourse(progressBelongsToCurrentSession ? current : visibleProgress, courseId),
    );
  };

  const handleSelectSection = (sectionId: string) => {
    const startSeconds = getSectionVideoStartSeconds(displaySession, sectionId);
    if (typeof startSeconds === "number") {
      setVideoStartSeconds(startSeconds);
    }
    setActiveSectionId(sectionId);
  };

  const handleAnswerQuizQuestion = async (
    question: QuizQuestionForProgress,
    selectedOptionIndex: number,
  ) => {
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);

    const baseProgress = progressBelongsToCurrentSession ? progressRef.current : visibleProgress;
    const localPatch = answerQuestion(baseProgress, question, selectedOptionIndex);
    const optimisticProgress = {
      ...baseProgress,
      quizAttempts: localPatch.quizAttempts,
    };
    progressRef.current = optimisticProgress;
    setProgress(optimisticProgress);

    if (!hasApiAuthSession()) return;

    try {
      const response = await answerLearningQuizQuestion(session.id, {
        skill_canonical: session.moduleId,
        question_id: question.id,
        selected_option_index: selectedOptionIndex,
      });
      const serverPatch = applyServerQuizAnswer(progressRef.current, response);
      const serverProgress = {
        ...progressRef.current,
        quizAttempts: serverPatch.quizAttempts,
      };
      progressRef.current = serverProgress;
      setProgress(serverProgress);
      setAdaptiveQuiz({
        weakObjectives: response.objective_mastery.mastered
          ? []
          : [
              {
                objectiveId: response.objective_mastery.objective_id,
                correct: response.objective_mastery.correct,
                totalAnswered: response.objective_mastery.total_answered,
                accuracy: response.objective_mastery.accuracy,
                mastered: response.objective_mastery.mastered,
              },
            ],
        nextRecommendedQuestions: response.next_recommended_questions.map((item) => ({
          id: item.id,
          question: item.question,
          objectiveId: item.objective_id,
          sectionId: item.section_id,
        })),
      });
      const remediation = response.remediation;
      if (typeof remediation?.start_seconds === "number") {
        setVideoStartSeconds(remediation.start_seconds);
      }
      if (remediation?.video_resource_id) {
        setActiveSectionId(remediation.video_resource_id);
      } else if (remediation?.section_id) {
        setActiveSectionId(remediation.section_id);
      }
    } catch {
      // Keep deterministic local fallback when BE is unavailable during rollout.
      if (question.remediation?.startSeconds !== undefined) {
        setVideoStartSeconds(question.remediation.startSeconds);
      }
      if (question.remediation?.videoResourceId) {
        setActiveSectionId(question.remediation.videoResourceId);
      }
    }
  };

  const handleRetryQuiz = (questionIds: string[]) => {
    locallyChangedProgressRef.current = true;
    setProgressSessionId(session.id);

    const baseProgress = progressBelongsToCurrentSession ? progressRef.current : visibleProgress;
    const nextQuizAttempts = { ...(baseProgress.quizAttempts ?? {}) };
    for (const questionId of questionIds) {
      delete nextQuizAttempts[questionId];
    }

    const nextProgress = {
      ...baseProgress,
      quizAttempts: nextQuizAttempts,
    };
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    setAdaptiveQuiz(null);
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
              className="rounded-xl gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm cursor-pointer"
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
              progress={visibleProgress}
              onSelectSection={handleSelectSection}
              onToggle={() => setIsSidebarOpen(false)}
              showValidationErrors={showValidationErrors}
            />
          )}

          {/* Center content — scrollable */}
          <MainContentPanel
            session={displaySession}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
            progress={visibleProgress}
            onToggleChecklistItem={handleToggleChecklistItem}
            onExerciseProofChange={handleExerciseProofChange}
            onToggleSaveCourse={handleToggleSaveCourse}
            onAnswerQuizQuestion={handleAnswerQuizQuestion}
            onRetryQuiz={handleRetryQuiz}
            videoStartSeconds={videoStartSeconds}
            onSeekVideo={setVideoStartSeconds}
            adaptiveQuiz={adaptiveQuiz}
            showValidationErrors={showValidationErrors}
            onOpenSandboxWithSection={handleOpenSandboxWithSection}
          />

          {/* Right AI Chat Panel — sticky */}
          {false && isChatOpen && (
            <AIChatPanel
              sessionId={session.id}
              skillCanonical={session.moduleId}
              onClose={() => setIsChatOpen(false)}
            />
          )}

          {/* Floating AI toggle when closed */}
          {false && !isChatOpen && (
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

          {/* Right Code Sandbox Panel */}
          {isSandboxOpen && (
            <CodeSandboxPanel
              sessionId={session.id}
              skillCanonical={session.moduleId}
              sessionTitle={session.title}
              onClose={() => setIsSandboxOpen(false)}
              sectionTitle={sandboxSectionTitle}
            />
          )}
        </div>
      )}
    </div>
  );
}
