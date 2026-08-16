import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Quote,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerSkillContribution } from "@shared/api";
import { Input } from "@/components/ui/input";

interface MatchSkillsMatrixProps {
  skills: PerSkillContribution[];
  className?: string;
}

type FilterStatus = "all" | "matched" | "partial" | "missing" | "required";

export function MatchSkillsMatrix({ skills, className }: MatchSkillsMatrixProps) {
  const { t } = useTranslation("diagnosis");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const matchedCount = useMemo(() => skills.filter((s) => s.status === "matched").length, [skills]);
  const partialCount = useMemo(() => skills.filter((s) => s.status === "partial").length, [skills]);
  const missingCount = useMemo(() => skills.filter((s) => s.status === "missing").length, [skills]);
  const requiredCount = useMemo(() => skills.filter((s) => s.importance === "REQUIRED").length, [skills]);

  const filteredSkills = useMemo(() => {
    let result = [...skills];

    if (filter === "matched") {
      result = result.filter((s) => s.status === "matched");
    } else if (filter === "partial") {
      result = result.filter((s) => s.status === "partial");
    } else if (filter === "missing") {
      result = result.filter((s) => s.status === "missing");
    } else if (filter === "required") {
      result = result.filter((s) => s.importance === "REQUIRED");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.display_name.toLowerCase().includes(q) ||
          s.canonical_name.toLowerCase().includes(q) ||
          (s.cv_evidence_text && s.cv_evidence_text.toLowerCase().includes(q))
      );
    }

    // Sort order: REQUIRED first, then PREFERRED, then NICE_TO_HAVE. Inside importance, missing > partial > matched.
    const importanceWeight = { REQUIRED: 3, PREFERRED: 2, NICE_TO_HAVE: 1 };
    const statusWeight = { missing: 3, partial: 2, matched: 1 };

    return result.sort((a, b) => {
      const impA = importanceWeight[a.importance] || 0;
      const impB = importanceWeight[b.importance] || 0;
      if (impB !== impA) return impB - impA;

      const statA = statusWeight[a.status] || 0;
      const statB = statusWeight[b.status] || 0;
      return statB - statA;
    });
  }, [skills, filter, searchQuery]);

  const INITIAL_DISPLAY_LIMIT = 8;
  const displaySkills = isExpanded ? filteredSkills : filteredSkills.slice(0, INITIAL_DISPLAY_LIMIT);
  const hasMore = filteredSkills.length > INITIAL_DISPLAY_LIMIT;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Title and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>{t("matchDepth.perSkillTitle", { defaultValue: "Chi tiết mức độ đáp ứng từng kỹ năng" })}</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({filteredSkills.length}/{skills.length})
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("matchDepth.perSkillHint", { defaultValue: "Đối chiếu từng yêu cầu trong JD với bằng chứng tìm thấy trong CV." })}
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder={t("results.searchSkills", { defaultValue: "Tìm nhanh kỹ năng..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs rounded-lg bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-fit text-xs font-semibold">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            filter === "all"
              ? "bg-white text-slate-900 shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <span>{t("results.filterAll", { defaultValue: "Tất cả" })}</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
            {skills.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("matched")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            filter === "matched"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-sm font-bold"
              : "text-slate-600 hover:text-emerald-700 hover:bg-white/50"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t("results.matched", { defaultValue: "Đã khớp" })}</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
            {matchedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("partial")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            filter === "partial"
              ? "bg-amber-50 text-amber-800 border border-amber-200/70 shadow-sm font-bold"
              : "text-slate-600 hover:text-amber-700 hover:bg-white/50"
          )}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>{t("results.partial", { defaultValue: "Một phần" })}</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
            {partialCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("missing")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            filter === "missing"
              ? "bg-rose-50 text-rose-800 border border-rose-200/70 shadow-sm font-bold"
              : "text-slate-600 hover:text-rose-700 hover:bg-white/50"
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>{t("results.missing", { defaultValue: "Còn thiếu" })}</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
            {missingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("required")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
            filter === "required"
              ? "bg-slate-900 text-white shadow-sm font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{t("jdIntel.importance.REQUIRED", { defaultValue: "Bắt buộc" })}</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200">
            {requiredCount}
          </span>
        </button>
      </div>

      {/* Skills Grid */}
      {displaySkills.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-white/50">
          <p className="text-xs text-slate-500 font-medium">
            {t("results.noSkillsFound", { defaultValue: "Không tìm thấy kỹ năng nào phù hợp với bộ lọc." })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displaySkills.map((item, idx) => {
            const isMatched = item.status === "matched";
            const isPartial = item.status === "partial";
            const isMissing = item.status === "missing";

            const importanceBadge =
              item.importance === "REQUIRED"
                ? { label: t("jdIntel.importance.REQUIRED", { defaultValue: "Bắt buộc" }), className: "border-rose-200/80 bg-rose-50 text-rose-700 font-bold" }
                : item.importance === "PREFERRED"
                ? { label: t("jdIntel.importance.PREFERRED", { defaultValue: "Ưu tiên" }), className: "border-amber-200/80 bg-amber-50 text-amber-700" }
                : { label: t("jdIntel.importance.NICE_TO_HAVE", { defaultValue: "Điểm cộng" }), className: "border-slate-200 bg-slate-50 text-slate-600" };

            const statusBadge = isMatched
              ? { label: t("results.matched", { defaultValue: "Đã khớp" }), icon: CheckCircle2, className: "text-emerald-700 bg-emerald-50/80 border-emerald-200" }
              : isPartial
              ? { label: t("results.partial", { defaultValue: "Một phần" }), icon: AlertCircle, className: "text-amber-700 bg-amber-50/80 border-amber-200" }
              : { label: t("results.missing", { defaultValue: "Chưa có trong CV" }), icon: XCircle, className: "text-rose-700 bg-rose-50/80 border-rose-200" };

            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={`${item.canonical_name}-${idx}`}
                className={cn(
                  "border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-all bg-white shadow-sm hover:shadow-md",
                  isMatched && "border-emerald-200/60 hover:border-emerald-300",
                  isPartial && "border-amber-200/60 hover:border-amber-300",
                  isMissing && "border-slate-200/80 hover:border-rose-300"
                )}
              >
                {/* Top: Skill Name, Importance, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[13px] text-slate-900 leading-snug truncate" title={item.display_name}>
                        {item.display_name}
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border shrink-0", importanceBadge.className)}>
                        {importanceBadge.label}
                      </span>
                    </div>
                  </div>

                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0", statusBadge.className)}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>

                {/* Evidence / Reason Section */}
                <div className="text-xs">
                  {item.evidence_status === "found_in_cv" && item.cv_evidence_text ? (
                    <div className="flex items-start gap-1.5 p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-900 text-[11px]">
                      <Quote className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="italic leading-relaxed line-clamp-2" title={item.cv_evidence_text}>
                        "{item.cv_evidence_text}"
                      </p>
                    </div>
                  ) : item.status === "missing" ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                      <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="leading-tight">
                        {item.importance === "REQUIRED"
                          ? t("matchDepth.missingRequiredHint", { defaultValue: "Yêu cầu bắt buộc của JD — cần bổ sung dự án hoặc chứng chỉ." })
                          : t("matchDepth.missingOptionalHint", { defaultValue: "Kỹ năng ưu tiên — bổ sung sẽ tăng điểm số cạnh tranh." })}
                      </span>
                    </div>
                  ) : item.evidence_status === "not_verified_from_cv" ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{t("matchDepth.evidence.unverified", { defaultValue: "Chưa trích xuất được bằng chứng cụ thể từ CV" })}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expand / Collapse Button */}
      {hasMore && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all active:scale-[0.98]"
          >
            {isExpanded ? (
              <>
                <span>{t("results.collapseSkills", { defaultValue: "Thu gọn danh sách" })}</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>
                  {t("results.showAllSkills", {
                    count: filteredSkills.length,
                    defaultValue: `Xem tất cả ${filteredSkills.length} kỹ năng`,
                  })}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
