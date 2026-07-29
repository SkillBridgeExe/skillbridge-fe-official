import { useMemo, useState } from "react";
import { Check, AlertTriangle, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { buildKeywordRows } from "@/lib/diagnosis-report";
import { CheckGroup } from "./CheckGroup";
import type { KeywordFrequency, PerSkillContribution } from "@shared/api";

interface KeywordTableProps {
  keywordFrequency: KeywordFrequency[] | undefined | null;
  perSkill: PerSkillContribution[] | undefined | null;
}

const IMPORTANCE_BADGE: Record<string, string> = {
  REQUIRED: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  PREFERRED: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  NICE_TO_HAVE: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUS_ICON = {
  matched: { Icon: Check, color: "text-[#346538]" },
  partial: { Icon: AlertTriangle, color: "text-[#956400]" },
  missing: { Icon: X, color: "text-[#9F2F2D]" },
} as const;

/** Rows shown before "show more" — keeps long skill lists from stretching the page. */
const VISIBLE_ROWS = 10;

export function KeywordTable({ keywordFrequency, perSkill }: KeywordTableProps) {
  const { t } = useTranslation("diagnosis");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(
    () => buildKeywordRows(keywordFrequency, perSkill),
    [keywordFrequency, perSkill],
  );

  // Null when BOTH sources absent → render nothing (no orphan group heading).
  if (!rows) return null;

  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <CheckGroup
      group={{
        id: "keywords",
        label: t("report.keywordTable.groupLabel"),
        issueCount: rows.filter((r) => r.status === "missing").length,
        items: [],
      }}
    >
    <div>
      {/* Mobile stacked card view (< 640px) */}
      <div className="sm:hidden space-y-2.5 divide-y divide-[#F1F1EF]">
        {visibleRows.map((row) => {
          const statusEntry = row.status ? STATUS_ICON[row.status] : null;

          return (
            <div key={row.canonical_name} className="pt-2.5 first:pt-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs text-[#2F3437] break-words flex-1">
                  {row.display_name}
                </span>
                {statusEntry && (
                  <statusEntry.Icon className={cn("w-4 h-4 shrink-0", statusEntry.color)} />
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#787774] flex-wrap gap-1.5">
                <div className="flex items-center gap-3">
                  <span>CV: <strong className="font-mono text-[#2F3437]">{row.cv_count !== null ? row.cv_count : "—"}</strong></span>
                  <span>JD: <strong className="font-mono text-[#2F3437]">{row.jd_count !== null ? row.jd_count : "—"}</strong></span>
                </div>
                {row.importance && (
                  <span
                    className={cn(
                      "inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      IMPORTANCE_BADGE[row.importance] ?? IMPORTANCE_BADGE.NICE_TO_HAVE,
                    )}
                  >
                    {t(`jdIntel.importance.${row.importance}`, { defaultValue: row.importance.replace(/_/g, " ") })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table view (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto -mx-1">
        <table className="w-full text-left text-[13px] border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-[#EAEAEA] text-[10px] font-bold uppercase tracking-wider text-[#787774]">
              <th className="py-2.5 px-3 font-bold">{t("report.keywordTable.thSkill")}</th>
              <th className="py-2.5 px-3 font-bold text-center w-20">{t("report.keywordTable.thCv")}</th>
              <th className="py-2.5 px-3 font-bold text-center w-20">{t("report.keywordTable.thJd")}</th>
              <th className="py-2.5 px-3 font-bold text-center w-28">{t("report.keywordTable.thImportance")}</th>
              <th className="py-2.5 px-3 font-bold text-center w-16">{t("report.keywordTable.thStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const statusEntry = row.status ? STATUS_ICON[row.status] : null;

              return (
                <tr
                  key={row.canonical_name}
                  className="border-b border-[#F1F1EF] last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium text-[#2F3437]">
                    {row.display_name}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[#787774]">
                    {row.cv_count !== null ? row.cv_count : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[#787774]">
                    {row.jd_count !== null ? row.jd_count : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {row.importance ? (
                      <span
                        className={cn(
                          "inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          IMPORTANCE_BADGE[row.importance] ?? IMPORTANCE_BADGE.NICE_TO_HAVE,
                        )}
                      >
                        {t(`jdIntel.importance.${row.importance}`, { defaultValue: row.importance.replace(/_/g, " ") })}
                      </span>
                    ) : (
                      <span className="text-[#A1A1A1]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {statusEntry ? (
                      <statusEntry.Icon className={cn("w-4 h-4 mx-auto", statusEntry.color)} />
                    ) : (
                      <span className="text-[#A1A1A1]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex items-center gap-1 rounded px-3 py-2 text-xs font-bold text-ink-accent hover:underline focus-visible:ring-2 focus-visible:ring-ink-accent/40"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {t("report.keywordTable.showMore", { count: hiddenCount })}
        </button>
      )}
    </div>
    </CheckGroup>
  );
}
