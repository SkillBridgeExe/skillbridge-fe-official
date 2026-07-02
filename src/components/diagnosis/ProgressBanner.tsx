// ─── ProgressBanner ─────────────────────────────────────────────────
// "So với lần quét trước" — deterministic diff giữa 2 lần chấm gần nhất
// (GET /api/cv-matches/:matchId/progress, BE gap-progress-loop). KHÔNG LLM.
// Honest rendering: baseline (chưa có lần trước để so) → ẩn hẳn; template
// đổi giữa 2 lần → ẩn điểm số (không so được) nhưng vẫn hiện trạng thái gap.

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMatchProgressQuery } from "@/hooks/use-diagnosis";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

export function ProgressBanner({
  matchId,
  onExplain,
}: {
  matchId?: string | null;
  onExplain?: () => void;
}) {
  const { t } = useTranslation("diagnosis");
  const { data, isLoading, isError } = useMatchProgressQuery(matchId);

  if (isLoading || isError || !data || data.baseline) return null;

  const closed = data.transitions.filter((tr) => tr.kind === "closed");
  const closedShown = closed.slice(0, 6);
  const closedMore = closed.length - closedShown.length;

  const improved = data.transitions.filter((tr) => tr.kind === "improved");
  const improvedShown = improved.slice(0, 6);
  const improvedMore = improved.length - improvedShown.length;

  const evidence = data.evidence_recognized;
  const evidenceShown = evidence.slice(0, 6);
  const evidenceMore = evidence.length - evidenceShown.length;

  const newGaps = data.transitions.filter((tr) => tr.kind === "new");
  const newGapsShown = newGaps.slice(0, 6);
  const newGapsMore = newGaps.length - newGapsShown.length;

  const kept = data.strengths_kept.slice(0, 6);
  const keptMore = data.strengths_kept.length - kept.length;

  const scoreDelta =
    !data.template_changed && data.prev_score != null && data.curr_score != null
      ? data.curr_score - data.prev_score
      : null;

  return (
    <div className={cn(CARD, "p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 motion-reduce:animate-none")}>
      <div className="flex items-center justify-between">
        <h4 className="font-serif text-base font-bold text-[#0F5C4D]">
          {t("progress.title")}
        </h4>
      </div>

      {data.template_changed ? (
        <p className="text-xs text-[#956400] bg-[#FBF3DB]/50 border border-[#F1E5C0] rounded-xl px-3 py-2 leading-relaxed">
          {t("progress.templateChanged")}
        </p>
      ) : (
        scoreDelta !== null && (
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold font-mono border",
              scoreDelta > 0 
                ? "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]" 
                : "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]"
            )}>
              {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`}
            </span>
            <span className="text-xs font-semibold text-[#2F3437]">
              {t("progress.scoreDeltaLabel")}
            </span>
          </div>
        )
      )}

      {(closed.length > 0 || improved.length > 0 || evidence.length > 0 || newGaps.length > 0 || kept.length > 0) && (
        <div className="border-t border-[#EAEAEA]/80 my-2" />
      )}

      {(closedShown.length > 0 || improvedShown.length > 0 || evidenceShown.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {closedShown.map((tr) => (
            <span
              key={tr.canonical_name}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EDF3EC] text-[#346538] border border-[#DCE9D7]"
            >
              {t("progress.closed")}: {tr.display_name}
            </span>
          ))}
          {closedMore > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              +{closedMore}
            </span>
          )}

          {improvedShown.map((tr) => (
            <span
              key={tr.canonical_name}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FBF3DB] text-[#956400] border border-[#F1E5C0]"
            >
              {t("progress.improved")}: {tr.display_name}
            </span>
          ))}
          {improvedMore > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              +{improvedMore}
            </span>
          )}

          {evidenceShown.map((name) => (
            <span
              key={name}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E1F3FE] text-[#1F6C9F] border border-[#BEE3F8]"
            >
              {t("progress.evidence")}: {name}
            </span>
          ))}
          {evidenceMore > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              +{evidenceMore}
            </span>
          )}
        </div>
      )}

      {kept.length > 0 && (
        <p className="text-xs text-[#787774] leading-relaxed">
          {t("progress.strengthsKept", {
            names: keptMore > 0 ? `${kept.join(", ")} +${keptMore}` : kept.join(", "),
          })}
        </p>
      )}

      {newGapsShown.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {newGapsShown.map((tr) => (
            <span
              key={tr.canonical_name}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5]"
            >
              {t("progress.newGaps")}: {tr.display_name}
            </span>
          ))}
          {newGapsMore > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
              +{newGapsMore}
            </span>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => onExplain?.()}
          className="text-xs font-bold text-primary hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ink-accent/40 focus:outline-none rounded px-2.5 py-1 bg-primary/5 hover:bg-primary/10"
        >
          {t("progress.explain")}
        </button>
      </div>
    </div>
  );
}
