import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  PlayCircle,
} from "lucide-react";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import type { LearningSession } from "./types";

interface SessionEntry {
  session: LearningSession;
  weekNumber: number;
  order: number;
}

interface SubjectGroup {
  id: string;
  title: string;
  entries: SessionEntry[];
  weeks: Array<{
    weekNumber: number;
    entries: SessionEntry[];
  }>;
}

const statusConfig = {
  completed: {
    labelKey: "learning.status.completed",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  "in-progress": {
    labelKey: "learning.status.inProgress",
    icon: PlayCircle,
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  locked: {
    labelKey: "learning.status.locked",
    icon: Lock,
    className: "border-slate-200 bg-slate-50 text-slate-500",
  },
} as const;

export function ListRoadmapView() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const weeks = useActiveWeekPlans();
  const groups = useMemo(() => buildSubjectGroups(weeks), [weeks]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(groups[0]?.id ?? null);

  return (
    <div className="grid gap-4 animate-in fade-in duration-500">
      {groups.map((group) => {
        const completed = group.entries.filter((entry) => entry.session.status === "completed").length;
        const ready = group.entries.filter((entry) => entry.session.status === "in-progress").length;
        const total = group.entries.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const expanded = expandedSubjectId === group.id;

        return (
          <section
            key={group.id}
            className={cn(
              "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
              expanded ? "border-sky-200 shadow-sky-100/60" : "border-slate-200 hover:border-sky-100",
            )}
          >
            <button
              type="button"
              onClick={() => setExpandedSubjectId(expanded ? null : group.id)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-base font-black text-white shadow-lg shadow-sky-200">
                {completed === total ? <CheckCircle2 className="h-5 w-5" /> : progress}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-black text-slate-950">{group.title}</h3>
                  {ready > 0 && (
                    <Badge className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                      {ready} ready
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>{group.weeks.length} weeks</span>
                  <span>•</span>
                  <span>{completed}/{total} sessions</span>
                  <span>•</span>
                  <span>{Math.round(group.entries.reduce((sum, entry) => sum + entry.session.estimatedMinutes, 0) / 60)}h</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="hidden shrink-0 grid-cols-3 gap-1.5 sm:grid">
                {group.weeks.slice(0, 3).map((week) => (
                  <WeekMiniCard key={week.weekNumber} weekNumber={week.weekNumber} entries={week.entries} />
                ))}
                {group.weeks.length > 3 && (
                  <div className="grid h-14 w-16 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                    +{group.weeks.length - 3}
                  </div>
                )}
              </div>

              {expanded ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-sky-500" />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              )}
            </button>

            {expanded && (
              <div className="border-t border-sky-100 bg-sky-50/35 px-4 py-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.weeks.map((week) => (
                    <div key={week.weekNumber} className="rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">
                          {t("learning.common.week", { number: week.weekNumber })}
                        </p>
                        <span className="text-[11px] font-bold text-slate-400">
                          {week.entries.filter((entry) => entry.session.status === "completed").length}/{week.entries.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {week.entries.map((entry) => (
                          <SessionChip
                            key={`${week.weekNumber}-${entry.session.id}`}
                            entry={entry}
                            t={t}
                            onOpen={() => navigate(`/learning/session/${entry.session.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function WeekMiniCard({ weekNumber, entries }: { weekNumber: number; entries: SessionEntry[] }) {
  const completed = entries.filter((entry) => entry.session.status === "completed").length;
  const hasReady = entries.some((entry) => entry.session.status === "in-progress");

  return (
    <div
      className={cn(
        "h-14 w-16 rounded-xl border px-2 py-1.5 text-center",
        completed === entries.length
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : hasReady
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      <p className="text-[10px] font-black">W{weekNumber}</p>
      <p className="mt-1 text-[11px] font-black">{completed}/{entries.length}</p>
    </div>
  );
}

function SessionChip({
  entry,
  t,
  onOpen,
}: {
  entry: SessionEntry;
  t: (key: string, options?: Record<string, unknown>) => string;
  onOpen: () => void;
}) {
  const { session } = entry;
  const config = statusConfig[session.status];
  const StatusIcon = config.icon;
  const completedSections = session.sections.filter((section) => section.completed).length;
  const locked = session.status === "locked";

  return (
    <button
      type="button"
      onClick={() => {
        if (!locked) onOpen();
      }}
      disabled={locked}
      className={cn(
        "group min-h-[92px] rounded-xl border p-3 text-left transition-all",
        locked
          ? "cursor-not-allowed border-slate-100 bg-slate-50/70 opacity-65"
          : "border-sky-100 bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md",
        session.status === "in-progress" && "border-sky-300 ring-2 ring-sky-100",
        session.status === "completed" && "border-emerald-200 bg-emerald-50/50",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black text-slate-500">S{entry.order + 1}</span>
        <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-black leading-none", config.className)}>
          <StatusIcon className="h-3 w-3 shrink-0" />
          <span className="hidden whitespace-nowrap min-[520px]:inline">{t(config.labelKey)}</span>
        </span>
      </div>

      <p className={cn("line-clamp-2 text-sm font-black leading-snug", locked ? "text-slate-500" : "text-slate-900 group-hover:text-sky-700")}>
        {session.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.estimatedMinutes}m
        </span>
        <span>{completedSections}/{session.sections.length} sections</span>
      </div>
    </button>
  );
}

function buildSubjectGroups(weeks: ReturnType<typeof useActiveWeekPlans>): SubjectGroup[] {
  const groupMap = new Map<string, SubjectGroup>();

  weeks.forEach((week) => {
    week.sessions.forEach((session, order) => {
      const id = session.skillCanonical ?? session.moduleId ?? session.skill;
      const group = groupMap.get(id) ?? {
        id,
        title: session.skill,
        entries: [],
        weeks: [],
      };
      const entry = { session, weekNumber: week.weekNumber, order };
      group.entries.push(entry);
      const weekGroup = group.weeks.find((item) => item.weekNumber === week.weekNumber);
      if (weekGroup) {
        weekGroup.entries.push(entry);
      } else {
        group.weeks.push({ weekNumber: week.weekNumber, entries: [entry] });
      }
      groupMap.set(id, group);
    });
  });

  return [...groupMap.values()].map((group) => ({
    ...group,
    entries: group.entries.sort(compareEntries),
    weeks: group.weeks
      .map((week) => ({ ...week, entries: week.entries.sort(compareEntries) }))
      .sort((a, b) => a.weekNumber - b.weekNumber),
  }));
}

function compareEntries(a: SessionEntry, b: SessionEntry) {
  return (
    a.weekNumber - b.weekNumber ||
    dayOrder(a.session.dayOfWeek) - dayOrder(b.session.dayOfWeek) ||
    (a.session.laneIndex ?? 0) - (b.session.laneIndex ?? 0) ||
    a.order - b.order ||
    a.session.id.localeCompare(b.session.id)
  );
}

function dayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}
