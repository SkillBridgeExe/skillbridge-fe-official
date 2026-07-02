// ─── ProgressBanner ─────────────────────────────────────────────────
// "So với lần quét trước" — deterministic diff giữa 2 lần chấm gần nhất
// (GET /api/cv-matches/:matchId/progress, BE gap-progress-loop). KHÔNG LLM.
// Honest rendering: baseline (chưa có lần trước để so) → ẩn hẳn; template
// đổi giữa 2 lần → ẩn điểm số (không so được) nhưng vẫn hiện trạng thái gap.

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useMatchProgressQuery } from "@/hooks/use-diagnosis";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";
const MAX_STRENGTHS_SHOWN = 3;

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
  const improved = data.transitions.filter((tr) => tr.kind === "improved");
  const newGaps = data.transitions.filter((tr) => tr.kind === "new");
  const kept = data.strengths_kept.slice(0, MAX_STRENGTHS_SHOWN);
  const keptMore = data.strengths_kept.length - kept.length;

  const scoreDelta =
    !data.template_changed && data.prev_score != null && data.curr_score != null
      ? data.curr_score - data.prev_score
      : null;

  return (
    <div className={cn(CARD, "p-5 space-y-3")}>
      <h4 className="text-sm font-bold text-[#2F3437]">{t("progress.title")}</h4>

      {data.template_changed ? (
        <p className="text-xs text-[#956400] bg-[#FBF3DB] border border-[#F1E5C0] rounded-lg px-3 py-2">
          {t("progress.templateChanged")}
        </p>
      ) : (
        scoreDelta !== null && (
          <p className="text-sm font-semibold text-[#2F3437]">
            {t("progress.scoreDelta", { delta: scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}` })}
          </p>
        )
      )}

      {(closed.length > 0 || improved.length > 0 || data.evidence_recognized.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {closed.map((tr) => (
            <span
              key={tr.canonical_name}
              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EDF3EC] text-[#346538] border border-[#DCE9D7]"
            >
              {t("progress.closed")}: {tr.display_name}
            </span>
          ))}
          {improved.map((tr) => (
            <span
              key={tr.canonical_name}
              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FBF3DB] text-[#956400] border border-[#F1E5C0]"
            >
              {t("progress.improved")}: {tr.display_name}
            </span>
          ))}
          {data.evidence_recognized.map((name) => (
            <span
              key={name}
              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100"
            >
              {t("progress.evidence")}: {name}
            </span>
          ))}
        </div>
      )}

      {kept.length > 0 && (
        <p className="text-xs text-[#787774]">
          {t("progress.strengthsKept", {
            names: keptMore > 0 ? `${kept.join(", ")} +${keptMore}` : kept.join(", "),
          })}
        </p>
      )}

      {newGaps.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {newGaps.map((tr) => (
            <span
              key={tr.canonical_name}
              className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FDEBEC] text-[#9F2F2D] border border-[#F6D4D5]"
            >
              {t("progress.newGaps")}: {tr.display_name}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onExplain?.()}
        className="text-xs font-semibold text-ink-accent hover:underline"
      >
        {t("progress.explain")}
      </button>
    </div>
  );
}
