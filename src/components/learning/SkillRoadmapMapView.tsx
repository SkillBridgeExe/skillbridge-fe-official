import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  Lock,
  Maximize2,
  Minimize2,
  PlayCircle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { useSidebarStore } from "@/store/useSidebarStore";
import type { LearningSession, WeekPlan } from "./types";

interface ScheduleSession {
  id: string;
  session: LearningSession;
  weekNumber: number;
  sessionIndex: number;
  globalIndex: number;
}

interface SubjectRoadmap {
  id: string;
  title: string;
  weeks: Array<{
    weekNumber: number;
    sessions: ScheduleSession[];
  }>;
}

type DrawerTarget =
  | { type: "session"; item: ScheduleSession }
  | { type: "week"; week: SubjectRoadmap["weeks"][number] };

const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function SkillRoadmapMapView() {
  const navigate = useNavigate();
  const { i18n } = useTranslation("common");
  const isVi = i18n.language.startsWith("vi");
  const weeks = useActiveWeekPlans();
  const subjects = useMemo(() => buildSubjectRoadmaps(weeks), [weeks]);
  const sessions = subjects.flatMap((subject) => subject.weeks.flatMap((week) => week.sessions));
  const firstOpen = sessions.find((item) => item.session.status === "in-progress") ?? sessions.find((item) => item.session.status !== "locked");
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);
  const [expanded, setExpanded] = useState(false);
  const sidebarCollapsed = useSidebarStore((state) => state.collapsed);
  const selectedId = drawerTarget?.type === "session" ? drawerTarget.item.id : null;

  useEffect(() => {
    if (!expanded || subjects.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (drawerTarget) {
        setDrawerTarget(null);
        return;
      }
      setExpanded(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerTarget, expanded, subjects.length]);

  if (subjects.length === 0) return null;

  return (
    <>
      {expanded && <div className="fixed inset-0 z-[2147483646] bg-slate-950/70 backdrop-blur-sm" />}
      <section
        className={cn(
          "relative overflow-hidden rounded-[26px] border border-sky-100 bg-sky-50/40 shadow-sm",
          expanded && [
            "fixed bottom-3 right-3 top-3 left-3 z-[2147483647] isolate flex flex-col rounded-[22px]",
            sidebarCollapsed ? "md:left-[76px]" : "md:left-[252px]",
          ],
        )}
      >
      <div className="flex flex-col gap-3 border-b border-sky-100 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            <GitBranch className="h-4 w-4 text-blue-600" />
            {isVi ? "Roadmap theo môn" : "Subject roadmap"}
          </div>

          <p className="mt-1 text-sm font-medium text-slate-500">
            {isVi
              ? "Tên môn nối tới week, week nối tới các session. Bấm session để mở bảng lớn."
              : "Subject connects to week boxes, and each week connects to its sessions."}
            </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded((value) => !value)}
            className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
            {expanded ? (isVi ? "Thu nhỏ" : "Exit full screen") : (isVi ? "Toàn màn hình" : "Full screen")}
          </Button>
          {firstOpen && (
            <Button
              onClick={() => {
                setDrawerTarget({ type: "session", item: firstOpen });
                setExpanded(true);
              }}
              className="h-10 rounded-xl px-4 text-sm font-bold"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              {isVi ? "Mở buổi đang học" : "Open active session"}
            </Button>
          )}
        </div>
      </div>

      <div className={cn("relative overflow-hidden", expanded ? "min-h-0 flex-1" : "max-h-[760px]")}>
        <div className={cn("relative overflow-auto", expanded ? "h-full" : "max-h-[760px]")}>
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgb(125 211 252 / 0.55) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative mx-auto w-full min-w-[760px] max-w-[1040px] px-5 py-7">
            <div className="space-y-8">
              {subjects.map((subject) => (
                <SubjectFlow
                  key={subject.id}
                  subject={subject}
                  isVi={isVi}
                  selectedId={selectedId}
                  onSelectSession={(item) => {
                    setDrawerTarget({ type: "session", item });
                    setExpanded(true);
                  }}
                  onSelectWeek={(week) => {
                    setDrawerTarget({ type: "week", week });
                    setExpanded(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {drawerTarget?.type === "session" && (
          <SessionDrawer
            item={drawerTarget.item}
            isVi={isVi}
            total={sessions.length}
            onClose={() => setDrawerTarget(null)}
            onOpenSession={() => navigate(`/learning/session/${drawerTarget.item.session.id}`)}
            onOpenSection={() => navigate(`/learning/session/${drawerTarget.item.session.id}`)}
          />
        )}
        {drawerTarget?.type === "week" && (
          <WeekDrawer
            week={drawerTarget.week}
            isVi={isVi}
            onClose={() => setDrawerTarget(null)}
            onSelectSession={(item) => {
              setDrawerTarget({ type: "session", item });
              setExpanded(true);
            }}
            onOpenSession={(item) => navigate(`/learning/session/${item.session.id}`)}
          />
        )}
      </div>
    </section>
    </>
  );
}

function SubjectFlow({
  subject,
  isVi,
  selectedId,
  onSelectSession,
  onSelectWeek,
}: {
  subject: SubjectRoadmap;
  isVi: boolean;
  selectedId: string | null;
  onSelectSession: (item: ScheduleSession) => void;
  onSelectWeek: (week: SubjectRoadmap["weeks"][number]) => void;
}) {
  const totalSessions = subject.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
  const hasSingleWeek = subject.weeks.length === 1;

  return (
    <div className="relative py-2 pl-[214px]">
      <div className="absolute left-0 top-1/2 z-10 w-[168px] -translate-y-1/2">
        <RoadmapBox tone="subject" className="min-h-[68px] px-3">
          <span className="text-base font-black leading-tight text-white">{subject.title}</span>
          <span className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50">
            {subject.weeks.length} {isVi ? "tuần" : "weeks"} · {totalSessions} {isVi ? "buổi" : "sessions"}
          </span>
        </RoadmapBox>
      </div>

      <span
        className={cn(
          "absolute left-[168px] top-1/2 h-0 -translate-y-1/2 border-t-[4px] border-sky-500",
          hasSingleWeek ? "w-[46px]" : "w-[34px]",
        )}
      />

      <div className="relative space-y-3">
        {subject.weeks.map((week, weekIndex) => (
          <div
            key={week.weekNumber}
            className={cn(
              "relative grid grid-cols-[142px_34px_minmax(300px,1fr)]",
              hasSingleWeek ? "items-center" : "items-start",
            )}
          >
            {weekIndex < subject.weeks.length - 1 && (
              <span className="absolute left-[-14px] top-6 h-[calc(100%+0.75rem)] w-[4px] rounded-full bg-sky-500" />
            )}
            {!hasSingleWeek && <span className="absolute left-[-14px] top-6 h-0 w-4 border-t-[4px] border-sky-500" />}
            <div className="relative z-10">
              <RoadmapBox tone="week" className="min-h-[42px] px-3 py-2">
                <span className="text-[13px] font-black text-sky-950">
                  {isVi ? `Tuần ${week.weekNumber}` : `Week ${week.weekNumber}`}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.11em] text-sky-700">
                  {week.sessions.length} {isVi ? "buổi" : "sessions"}
                </span>
              </RoadmapBox>
            </div>

            <div className="relative h-full min-h-[48px]">
              <Connector className={cn("left-0 right-0", hasSingleWeek ? "top-1/2" : "top-6")} dotted />
              <span
                className={cn(
                  "absolute -right-1 h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(186,230,253,0.9)]",
                  hasSingleWeek ? "top-1/2 -translate-y-1/2" : "top-[19px]",
                )}
              />
            </div>

            <WeekSessionsCluster
              week={week}
              isVi={isVi}
              selectedId={selectedId}
              centerConnector={hasSingleWeek}
              onSelectSession={onSelectSession}
              onSelectWeek={() => onSelectWeek(week)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekSessionsCluster({
  week,
  isVi,
  selectedId,
  centerConnector = false,
  onSelectSession,
  onSelectWeek,
}: {
  week: SubjectRoadmap["weeks"][number];
  isVi: boolean;
  selectedId: string | null;
  centerConnector?: boolean;
  onSelectSession: (item: ScheduleSession) => void;
  onSelectWeek: () => void;
}) {
  const maxVisible = week.sessions.length > 5 ? 4 : week.sessions.length;
  const visibleSessions = week.sessions.slice(0, maxVisible);
  const hiddenCount = Math.max(0, week.sessions.length - visibleSessions.length);
  const clusterWidthClass =
    visibleSessions.length <= 1 && hiddenCount === 0
      ? "w-[178px]"
      : visibleSessions.length <= 2 && hiddenCount === 0
        ? "w-[330px]"
        : "w-[480px]";

  return (
    <div className="relative pb-1 pl-2">
      <span
        className={cn(
          "absolute left-[-24px] h-0 w-6 border-t-[4px] border-dotted border-sky-500",
          centerConnector ? "top-1/2 -translate-y-1/2" : "top-6",
        )}
      />
      <div
        className={cn(
          "rounded-md border-[3px] border-sky-700 bg-gradient-to-br from-sky-50 to-cyan-100 p-2 shadow-[2px_2px_0_rgb(14_116_144_/_0.18)]",
          clusterWidthClass,
        )}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
            {week.sessions.length} {isVi ? "buổi" : "sessions"}
          </span>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onSelectWeek}
              className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-black text-white hover:bg-sky-500"
            >
              +{hiddenCount}
            </button>
          )}
        </div>
        <div
          className={cn(
            "grid gap-1.5",
            visibleSessions.length <= 1 && hiddenCount === 0 ? "grid-cols-1" : "grid-cols-2",
            visibleSessions.length > 2 && "min-[1180px]:grid-cols-3",
          )}
        >
          {visibleSessions.map((item) => (
            <SessionChip
              key={item.id}
              item={item}
              isVi={isVi}
              selected={selectedId === item.id}
              onSelect={() => onSelectSession(item)}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onSelectWeek}
              className="min-h-[42px] rounded-md border-2 border-dashed border-sky-400 bg-white/75 px-2 text-center text-xs font-black text-sky-700 hover:bg-white"
            >
              {isVi ? "Xem tất cả" : "View all"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionChip({
  item,
  isVi,
  selected,
  onSelect,
}: {
  item: ScheduleSession;
  isVi: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { session } = item;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative min-h-[42px] rounded-md border-2 px-2 py-1.5 text-left transition hover:-translate-y-0.5",
        session.status === "locked" ? "border-sky-200 bg-sky-100/70 opacity-70" : "border-sky-500 bg-white",
        selected && "ring-4 ring-cyan-400/40",
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div>
          <p className="text-[10px] font-black leading-none text-slate-950">S{item.sessionIndex + 1}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] font-black leading-snug text-slate-900">{session.title}</p>
        </div>
        <div className="text-right text-[10px] font-black text-slate-900">
          <p>{formatDay(session.dayOfWeek, isVi)}</p>
          <p className="text-slate-600">{Math.round(session.estimatedMinutes / 60)}h</p>
        </div>
      </div>
      <StatusBubble status={session.status} selected={selected} />
    </button>
  );
}

function SessionDrawer({
  item,
  isVi,
  total,
  onClose,
  onOpenSession,
  onOpenSection,
}: {
  item: ScheduleSession;
  isVi: boolean;
  total: number;
  onClose: () => void;
  onOpenSession: () => void;
  onOpenSection: () => void;
}) {
  const { session } = item;
  const isLocked = session.status === "locked";

  return (
    <aside className="absolute right-4 top-4 z-30 w-[min(460px,calc(100%-32px))] max-h-[calc(100%-32px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[-16px_16px_40px_rgb(15_23_42_/_0.24)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Badge className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-black text-white">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {isVi ? "Tài nguyên" : "Resources"}
          </Badge>
          <Badge className={cn("rounded-md border px-3 py-1.5 text-xs font-black", drawerStatusClass(session.status))}>
            {statusText(session.status, isVi)}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div>
          <h3 className="text-2xl font-black leading-tight text-slate-950">{session.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isVi
              ? `Buổi này thuộc ${session.skill}, nằm ở ${formatDay(session.dayOfWeek, isVi)}, tuần ${item.weekNumber}.`
              : `This session belongs to ${session.skill}, scheduled on ${formatDay(session.dayOfWeek, isVi)}, week ${item.weekNumber}.`}
          </p>
        </div>

        <div className="rounded-xl border-2 border-sky-300 bg-sky-50 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">
                {isVi ? "Theo schedule" : "Scheduled"}
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {isVi ? "Thứ tự" : "Order"} {item.globalIndex + 1}/{total}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {session.estimatedMinutes} mins
              </p>
            </div>
            {!isLocked && (
              <Button onClick={onOpenSession} className="rounded-lg bg-sky-500 font-black text-white hover:bg-sky-400">
                {session.status === "completed" ? (isVi ? "Xem lại" : "Review") : (isVi ? "Bắt đầu" : "Start")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="mb-3 text-sm font-black text-sky-700">
            {isVi ? "Bấm từng phần trong session" : "Click anything in this session"}
          </p>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {session.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={onOpenSection}
                disabled={isLocked}
                className="flex w-full items-center gap-2 rounded-lg bg-sky-50/70 px-3 py-3 text-left transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {section.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                )}
                <span className="text-sm font-semibold text-slate-700">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {session.resources.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="mb-3 text-sm font-black text-sky-700">
              {isVi ? "Tài nguyên" : "Resources"}
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {session.resources.map((resource) => (
                <a
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg bg-sky-50/70 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-cyan-50 hover:text-sky-700"
                >
                  <span className="line-clamp-1">{resource.title}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {isLocked && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            <Lock className="mb-2 h-4 w-4" />
            {isVi ? "Session này chưa mở theo tiến độ hiện tại." : "This session is locked by the current progress."}
          </div>
        )}
      </div>
    </aside>
  );
}

function WeekDrawer({
  week,
  isVi,
  onClose,
  onSelectSession,
  onOpenSession,
}: {
  week: SubjectRoadmap["weeks"][number];
  isVi: boolean;
  onClose: () => void;
  onSelectSession: (item: ScheduleSession) => void;
  onOpenSession: (item: ScheduleSession) => void;
}) {
  const completed = week.sessions.filter((item) => item.session.status === "completed").length;

  return (
    <aside className="absolute right-4 top-4 z-30 w-[min(460px,calc(100%-32px))] max-h-[calc(100%-32px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[-16px_16px_40px_rgb(15_23_42_/_0.24)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Badge className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-black text-white">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {isVi ? `Tuần ${week.weekNumber}` : `Week ${week.weekNumber}`}
          </Badge>
          <Badge className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
            {completed}/{week.sessions.length}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div>
          <h3 className="text-2xl font-black leading-tight text-slate-950">
            {isVi ? `Tuần ${week.weekNumber}` : `Week ${week.weekNumber}`}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isVi
              ? "Tất cả session trong tuần này được gom vào đây để roadmap không bị spam quá nhiều node."
              : "All sessions in this week are grouped here so the roadmap stays readable."}
          </p>
        </div>

        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {week.sessions.map((item) => {
            const locked = item.session.status === "locked";
            const StatusIcon = item.session.status === "completed" ? CheckCircle2 : locked ? Lock : PlayCircle;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectSession(item);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectSession(item);
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
              >
                <StatusIcon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    item.session.status === "completed" && "text-emerald-500",
                    item.session.status === "in-progress" && "text-sky-500",
                    locked && "text-slate-400",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{item.session.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {formatDay(item.session.dayOfWeek, isVi)} · {item.session.estimatedMinutes} mins
                  </p>
                </div>
                {!locked && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenSession(item);
                    }}
                    className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-black text-white hover:bg-sky-400"
                  >
                    {isVi ? "Mở" : "Open"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function RoadmapBox({
  tone,
  className,
  children,
}: {
  tone: "subject" | "week";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col justify-center rounded-md border-[3px] px-4 py-3 text-center",
        tone === "subject"
          ? "border-sky-800 bg-gradient-to-r from-sky-500 to-blue-600 shadow-[3px_3px_0_rgb(3_105_161_/_0.24)]"
          : "border-sky-700 bg-gradient-to-r from-cyan-100 to-sky-200 shadow-[3px_3px_0_rgb(14_116_144_/_0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Connector({ className, dotted }: { className?: string; dotted?: boolean }) {
  return (
    <span
      className={cn(
        "absolute h-0 border-t-[4px] border-sky-500",
        dotted && "border-dotted",
        className,
      )}
    />
  );
}

function StatusBubble({
  status,
  selected,
}: {
  status: LearningSession["status"];
  selected: boolean;
}) {
  const Icon = status === "locked" ? Lock : status === "completed" ? CheckCircle2 : PlayCircle;
  return (
    <span
      className={cn(
        "absolute -right-2 -top-2 grid h-5 w-5 rounded-full border-2 border-white text-white",
        selected ? "bg-sky-500" : status === "completed" ? "bg-emerald-600" : status === "locked" ? "bg-slate-400" : "bg-sky-500",
      )}
    >
      <Icon className="m-auto h-3 w-3" />
    </span>
  );
}

function buildSubjectRoadmaps(weeks: WeekPlan[]): SubjectRoadmap[] {
  const allItems = weeks
    .flatMap((week) =>
      week.sessions.map((session, sessionIndex) => ({
        id: `${week.weekNumber}-${session.id}`,
        session,
        weekNumber: week.weekNumber,
        sessionIndex,
        globalIndex: 0,
      })),
    )
    .sort(compareScheduleSessions)
    .map((item, globalIndex) => ({ ...item, globalIndex }));

  const subjectMap = new Map<string, SubjectRoadmap>();
  for (const item of allItems) {
    const subjectId = item.session.skillCanonical ?? item.session.moduleId ?? item.session.skill;
    const existing = subjectMap.get(subjectId) ?? {
      id: subjectId,
      title: item.session.skill,
      weeks: [],
    };
    let week = existing.weeks.find((entry) => entry.weekNumber === item.weekNumber);
    if (!week) {
      week = { weekNumber: item.weekNumber, sessions: [] };
      existing.weeks.push(week);
    }
    week.sessions.push(item);
    subjectMap.set(subjectId, existing);
  }

  return [...subjectMap.values()].map((subject) => ({
    ...subject,
    weeks: subject.weeks
      .map((week) => ({ ...week, sessions: week.sessions.sort(compareScheduleSessions) }))
      .sort((a, b) => a.weekNumber - b.weekNumber),
  }));
}

function compareScheduleSessions(a: ScheduleSession, b: ScheduleSession) {
  return (
    a.weekNumber - b.weekNumber ||
    dayOrder(a.session.dayOfWeek) - dayOrder(b.session.dayOfWeek) ||
    a.sessionIndex - b.sessionIndex ||
    a.session.sessionNumber - b.session.sessionNumber ||
    a.session.id.localeCompare(b.session.id)
  );
}

function drawerStatusClass(status: LearningSession["status"]) {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in-progress") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusText(status: LearningSession["status"], isVi: boolean) {
  if (status === "completed") return isVi ? "Đã xong" : "Done";
  if (status === "in-progress") return isVi ? "Sẵn sàng" : "Pending";
  return isVi ? "Khóa" : "Locked";
}

function formatDay(dayOfWeek: number, isVi: boolean) {
  const labels = isVi ? DAY_LABELS_VI : DAY_LABELS_EN;
  return labels[dayOrder(dayOfWeek) - 1] ?? String(dayOfWeek);
}

function dayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}
