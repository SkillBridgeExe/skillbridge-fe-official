import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GitBranch,
  Lock,
  PlayCircle,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActiveWeekPlans } from "@/components/learning/roadmap-store";
import { DEFAULT_SKILL_COLOR, SKILL_COLORS } from "@/components/learning/skill-colors";
import type { LearningSession } from "./types";

interface SkillNode {
  id: string;
  title: string;
  sessions: LearningSession[];
  status: LearningSession["status"];
  completedCount: number;
  totalMinutes: number;
  activeSession?: LearningSession;
  nextSession?: LearningSession;
}

const statusCopy = {
  completed: "Done",
  "in-progress": "Ready",
  locked: "Locked",
} as const;

export function SkillRoadmapMapView() {
  const navigate = useNavigate();
  const weeks = useActiveWeekPlans();
  const nodes = useMemo(() => buildSkillNodes(weeks.flatMap((week) => week.sessions)), [weeks]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const activeNode = nodes.find((node) => node.status === "in-progress") ?? selectedNode;
  const completedCount = nodes.filter((node) => node.status === "completed").length;
  const readyCount = nodes.filter((node) => node.status === "in-progress").length;
  const lockedCount = nodes.filter((node) => node.status === "locked").length;

  if (nodes.length === 0) return null;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-primary">
              <GitBranch className="h-4 w-4" />
              Skill roadmap
            </div>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">
              {activeNode?.title ?? "Learning path"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {nodes.length} subjects - {readyCount} ready - {completedCount} done
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatPill label="Ready" value={readyCount} tone="primary" />
            <StatPill label="Done" value={completedCount} tone="success" />
            <StatPill label="Locked" value={lockedCount} tone="muted" />
            {activeNode?.nextSession && (
              <Button
                onClick={() => navigate(`/learning/session/${activeNode.nextSession?.id}`)}
                className="h-10 shrink-0 rounded-xl px-4 text-sm font-bold"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Continue
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="bg-white px-5 py-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Learning path</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  All selected subjects are visible here. Pick one to inspect the next session.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              {nodes.map((node, index) => (
                <SkillRoadmapNode
                  key={node.id}
                  node={node}
                  index={index}
                  active={selectedNode?.id === node.id}
                  onSelect={() => setSelectedId(node.id)}
                />
              ))}
            </div>
          </div>

          {selectedNode && (
            <aside className="border-t border-slate-100 bg-slate-50/70 p-5 xl:border-l xl:border-t-0">
              <NodeDetail node={selectedNode} onOpen={(sessionId) => navigate(`/learning/session/${sessionId}`)} />
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}

function SkillRoadmapNode({
  node,
  index,
  active,
  onSelect,
}: {
  node: SkillNode;
  index: number;
  active: boolean;
  onSelect: () => void;
}) {
  const colors = SKILL_COLORS[node.title] || DEFAULT_SKILL_COLOR;
  const progress = node.sessions.length > 0 ? Math.round((node.completedCount / node.sessions.length) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[172px] w-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        active && "border-primary/50 ring-2 ring-primary/10",
        node.status === "completed" && "border-emerald-200 bg-emerald-50/20",
        node.status === "locked" && "border-slate-200 bg-slate-50/80",
        node.status === "in-progress" && !active && "border-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl text-xs font-black",
            node.status === "completed" && "bg-emerald-500 text-white",
            node.status === "in-progress" && "bg-primary text-white",
            node.status === "locked" && "bg-slate-200 text-slate-400",
          )}
        >
          {node.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
        </div>
        <Badge
          className={cn(
            "border px-2 py-0.5 text-[10px] font-black",
            node.status === "locked" ? "border-slate-200 bg-white text-slate-400" : [colors.bg, colors.text, colors.border],
          )}
        >
          {statusCopy[node.status]}
        </Badge>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{node.title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {node.sessions.length} sessions - {Math.round(node.totalMinutes / 60)}h
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
          <span>{progress}%</span>
          <span>
            {node.completedCount}/{node.sessions.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              node.status === "completed" ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function NodeDetail({
  node,
  onOpen,
}: {
  node: SkillNode;
  onOpen: (sessionId: string) => void;
}) {
  const next = node.nextSession;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
          <Target className="h-4 w-4" />
          Current subject
        </div>
        <h3 className="mt-2 text-lg font-black text-slate-950">{node.title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric icon={BookOpen} label="Sessions" value={`${node.completedCount}/${node.sessions.length}`} />
        <Metric icon={Clock} label="Time" value={`${Math.round(node.totalMinutes / 60)}h`} />
      </div>

      {next ? (
        <div className="rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
          <Badge className="border border-primary/20 bg-primary/10 text-[10px] font-black uppercase text-primary">
            Up next
          </Badge>
          <p className="mt-3 text-sm font-black leading-snug text-slate-900">{node.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Session {sessionPosition(node.sessions, next)}/{node.sessions.length} - {next.estimatedMinutes} mins
          </p>
          <Button onClick={() => onOpen(next.id)} className="mt-4 h-9 w-full rounded-xl text-sm font-bold">
            <PlayCircle className="mr-2 h-4 w-4" />
            Start
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
          {node.status === "completed" ? "Subject completed." : "Complete the active subject to unlock this."}
        </div>
      )}

      <div className="space-y-2">
        {node.sessions.slice(0, 5).map((session) => {
          const StatusIcon = session.status === "completed" ? CheckCircle2 : session.status === "locked" ? Lock : PlayCircle;
          return (
            <div key={session.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2">
              <StatusIcon
                className={cn(
                  "h-4 w-4 shrink-0",
                  session.status === "completed" && "text-emerald-500",
                  session.status === "in-progress" && "text-primary",
                  session.status === "locked" && "text-slate-300",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-700">Session {sessionPosition(node.sessions, session)}/{node.sessions.length}</p>
                <p className="truncate text-[10px] font-semibold text-slate-400">
                  {session.estimatedMinutes} mins
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-xs font-black",
        tone === "primary" && "border-sky-200 bg-sky-50 text-primary",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-600",
        tone === "muted" && "border-slate-200 bg-white text-slate-500",
      )}
    >
      <span className="mr-1 text-slate-400">{label}</span>
      {value}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function buildSkillNodes(sessions: LearningSession[]): SkillNode[] {
  const groups = new Map<string, LearningSession[]>();

  for (const session of sessions) {
    const key = session.skillCanonical ?? session.moduleId ?? session.skill;
    const group = groups.get(key) ?? [];
    group.push(session);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .map(([id, group]) => {
      const orderedSessions = [...group].sort(compareSessions);
      const completedCount = orderedSessions.filter((session) => session.status === "completed").length;
      const activeSession = orderedSessions.find((session) => session.status === "in-progress");
      const nextSession = activeSession ?? orderedSessions.find((session) => session.status !== "locked");
      const allCompleted = orderedSessions.length > 0 && completedCount === orderedSessions.length;
      const status: LearningSession["status"] = allCompleted
        ? "completed"
        : activeSession || nextSession
          ? "in-progress"
          : "locked";

      return {
        id,
        title: orderedSessions[0]?.skill ?? id,
        sessions: orderedSessions,
        status,
        completedCount,
        totalMinutes: orderedSessions.reduce((sum, session) => sum + session.estimatedMinutes, 0),
        activeSession,
        nextSession,
      };
    })
    .sort((a, b) => compareSessions(a.sessions[0], b.sessions[0]));
}

function compareSessions(a: LearningSession, b: LearningSession) {
  return (
    (a.laneIndex ?? 0) - (b.laneIndex ?? 0) ||
    dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) ||
    a.sessionNumber - b.sessionNumber ||
    a.id.localeCompare(b.id)
  );
}

function sessionPosition(sessions: LearningSession[], session: LearningSession) {
  const index = sessions.findIndex((item) => item.id === session.id);
  return index >= 0 ? index + 1 : session.sessionNumber;
}

function dayOrder(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}
