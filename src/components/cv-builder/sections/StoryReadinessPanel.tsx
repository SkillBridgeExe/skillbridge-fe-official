import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  AlertCircle,
  BookOpen,
  ArrowRight,
  XCircle,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import type { StoryReadinessResponse } from "@shared/api";

interface StoryReadinessPanelProps {
  /** The computed readiness response. */
  data: StoryReadinessResponse;
  /** Callback to close the panel / reset story flow. */
  onClose: () => void;
}

export function StoryReadinessPanel({ data, onClose }: StoryReadinessPanelProps) {
  const { t } = useTranslation("diagnosis");
  const navigate = useNavigate();

  const {
    readiness,
    band,
    matched_count,
    missing_count,
    gap_items = [],
    roadmap_pointer,
    role_has_rubric,
  } = data;

  // ── Band color config ──
  const getBandStyles = (b: typeof band) => {
    switch (b) {
      case "ready":
        return {
          bg: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
          stroke: "stroke-emerald-500",
          badgeBg: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
          label: t("builder.storyReadiness.band.ready", { defaultValue: "Sẵn sàng" }),
        };
      case "building":
        return {
          bg: "bg-amber-50 border-amber-200",
          text: "text-amber-700",
          stroke: "stroke-amber-500",
          badgeBg: "bg-amber-100 text-amber-800 hover:bg-amber-100",
          label: t("builder.storyReadiness.band.building", { defaultValue: "Đang tích lũy" }),
        };
      case "starting":
      default:
        return {
          bg: "bg-rose-50 border-rose-200",
          text: "text-rose-700",
          stroke: "stroke-rose-500",
          badgeBg: "bg-rose-100 text-rose-800 hover:bg-rose-100",
          label: t("builder.storyReadiness.band.starting", { defaultValue: "Mới bắt đầu" }),
        };
    }
  };

  const bandStyles = getBandStyles(band);

  // ── Roadmap navigation ──
  const handleGenerateRoadmap = () => {
    if (roadmap_pointer) {
      navigate(roadmap_pointer.route, { state: roadmap_pointer.payload });
    }
  };

  // SVG Circle geometry
  const radius = 32;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const displayScore = role_has_rubric ? readiness : 0;
  const strokeDashoffset = circumference * (1 - displayScore / 100);

  return (
    <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-md animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-slate-900">
            {t("builder.storyReadiness.panelTitle", { defaultValue: "Đánh giá mức độ sẵn sàng" })}
          </h3>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600"
          onClick={onClose}
          aria-label={t("builder.storyReadiness.close", { defaultValue: "Đóng" })}
        >
          <XCircle className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Section 1: Readiness Score & Honest Rubric State ── */}
      <div
        className={cn(
          "flex flex-col sm:flex-row items-center gap-4 rounded-lg border p-4",
          role_has_rubric ? bandStyles.bg : "bg-slate-50 border-slate-200"
        )}
      >
        {/* Circular Progress */}
        <div className="relative shrink-0">
          <svg className="h-20 w-20 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-slate-100/80"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Active circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              className={cn(
                "transition-all duration-500 ease-out",
                role_has_rubric ? bandStyles.stroke : "stroke-slate-300"
              )}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-lg font-extrabold leading-none", role_has_rubric ? "text-slate-800" : "text-slate-400")}>
              {role_has_rubric ? `${readiness}%` : "—"}
            </span>
          </div>
        </div>

        {/* Score Explainer & Band */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          {role_has_rubric ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {t("builder.storyReadiness.statusLabel", { defaultValue: "Mức độ phù hợp:" })}
                </span>
                <Badge variant="secondary" className={cn("w-fit mx-auto sm:mx-0", bandStyles.badgeBg)}>
                  {bandStyles.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 italic">
                * {t("builder.storyReadiness.preliminaryNote", { defaultValue: "Điểm số là ước lượng sơ bộ dựa trên CV hiện tại." })}
              </p>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-700 flex items-center justify-center sm:justify-start gap-1.5">
                <HelpCircle className="h-4 w-4 shrink-0" />
                {t("builder.storyReadiness.noRubricTitle", { defaultValue: "Chưa có tiêu chuẩn đánh giá" })}
              </p>
              <p className="text-xs text-slate-600">
                {t("builder.storyReadiness.noRubricDesc", { defaultValue: "SkillBridge chưa có bộ tiêu chuẩn rubric chuẩn cho vai trò này nên chưa thể đo lường mức độ sẵn sàng." })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Gaps List ── */}
      {role_has_rubric && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>{t("builder.storyReadiness.gapListTitle", { defaultValue: "Khoảng trống năng lực (Gaps)" })}</span>
            <span className="normal-case font-medium">
              {t("builder.storyReadiness.matchedVsMissing", {
                defaultValue: "Khớp {{matched}} / Thiếu {{missing}}",
                matched: matched_count,
                missing: missing_count,
              })}
            </span>
          </div>

          {gap_items.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-800">
                {t("builder.storyReadiness.noGapsTitle", { defaultValue: "Tuyệt vời! Không phát hiện khoảng trống" })}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t("builder.storyReadiness.noGapsDesc", { defaultValue: "Hồ sơ của bạn đã đáp ứng đầy đủ các yêu cầu cơ bản cho vai trò này." })}
              </p>
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
              {gap_items.map((gap) => {
                const isMissing = gap.cv_status === "missing";
                return (
                  <div
                    key={gap.requirement_id}
                    className={cn(
                      "rounded-lg border p-3.5 space-y-2 transition-all hover:shadow-sm",
                      isMissing ? "border-rose-100 bg-rose-50/20" : "border-amber-100 bg-amber-50/20"
                    )}
                  >
                    {/* Header: Skill name & Status tag */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {gap.display_name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] shrink-0 font-medium px-2 py-0.5",
                          isMissing
                            ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                        )}
                      >
                        {isMissing
                          ? t("builder.storyReadiness.gap.missing", { defaultValue: "Thiếu hẳn" })
                          : t("builder.storyReadiness.gap.partial", { defaultValue: "Thiếu cấp độ" })}
                      </Badge>
                    </div>

                    {/* Level Details */}
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-dashed border-slate-100 pb-1.5">
                      <span>
                        {t("builder.storyReadiness.gap.levels", {
                          defaultValue: "Yêu cầu: Lvl {{req}} / CV: Lvl {{cv}}",
                          req: gap.required_level ?? 1,
                          cv: gap.cv_level ?? 0,
                        })}
                      </span>
                      {gap.importance === "REQUIRED" && (
                        <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-200 bg-rose-50/50">
                          {t("builder.storyReadiness.gap.required", { defaultValue: "Bắt buộc" })}
                        </Badge>
                      )}
                    </div>

                    {/* Action Suggestion */}
                    <p className="text-xs text-slate-600 leading-relaxed bg-white/70 rounded p-1.5 border border-slate-100/50 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>{gap.recommended_next_action}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Actions ── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-100 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto text-slate-600 text-xs h-9"
          onClick={onClose}
        >
          {t("builder.storyReadiness.doneBtn", { defaultValue: "Đóng" })}
        </Button>
        {role_has_rubric && roadmap_pointer && (
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-white text-xs h-9 flex items-center justify-center gap-1.5 shadow-sm"
            onClick={handleGenerateRoadmap}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t("builder.storyReadiness.roadmapBtn", { defaultValue: "Tạo lộ trình học từ gap này" })}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
