import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  GraduationCap,
  Globe,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Info,
} from "lucide-react";
import type { JdIntelligenceBlock, JdDimensionType, ExperienceVerdict } from "@shared/api";

const DIMENSION_ICON: Record<JdDimensionType, React.ReactNode> = {
  seniority: <Briefcase className="w-3.5 h-3.5" />,
  language: <Globe className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  domain: <Building2 className="w-3.5 h-3.5" />,
  work_mode: <MapPin className="w-3.5 h-3.5" />,
};

const IMPORTANCE_STYLE: Record<string, string> = {
  REQUIRED: "bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]",
  PREFERRED: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  NICE_TO_HAVE: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
};

function VerdictChip({ verdict, t }: { verdict: ExperienceVerdict; t: (key: string) => string }) {
  const config: Record<ExperienceVerdict, { cls: string; icon: React.ReactNode }> = {
    fits: {
      cls: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    stretch: {
      cls: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    over_qualified: {
      cls: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
      icon: <MinusCircle className="w-3 h-3" />,
    },
    unknown: {
      cls: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
      icon: <Info className="w-3 h-3" />,
    },
  };
  const { cls, icon } = config[verdict] ?? config.unknown;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold", cls)}>
      {icon}
      {t(`jdIntel.verdict.${verdict}`)}
    </span>
  );
}

/**
 * W19 — Block "Đọc vị JD: yêu cầu ngoài kỹ năng" (jd_intelligence disclosure).
 * Render-when-present: nếu `data` null/undefined/empty → trả null, không lỗi.
 * Luật trung thực: chỉ hiện dimension BE trả; graded=false → nhãn "chưa chấm";
 * graded=true (seniority) → hiện verdict + cv_signal.
 */
export function JdIntelligenceCard({ data }: { data?: JdIntelligenceBlock | null }) {
  const { t } = useTranslation("diagnosis");

  if (!data?.dimensions?.length) return null;

  return (
    <Card className="border-[#EAEAEA] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <Globe className="w-3.5 h-3.5" />
          {t("jdIntel.title")}
        </div>

        {/* Dimension rows */}
        <div className="space-y-3">
          {data.dimensions.map((dim, i) => (
            <div
              key={`${dim.dimension}-${i}`}
              className="flex flex-col gap-1.5 py-2.5 border-b border-[#F1F1EF] last:border-0"
            >
              {/* Row 1: icon + value + chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#787774] shrink-0">
                  {DIMENSION_ICON[dim.dimension] ?? <Info className="w-3.5 h-3.5" />}
                </span>
                <span className="text-sm font-semibold text-[#2F3437]">
                  {t(`jdIntel.dimension.${dim.dimension}`)}
                </span>
                <span className="text-sm text-[#2F3437]">— {dim.value_text}</span>

                {/* Importance chip */}
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-bold",
                    IMPORTANCE_STYLE[dim.importance] ?? IMPORTANCE_STYLE.NICE_TO_HAVE,
                  )}
                >
                  {t(`jdIntel.importance.${dim.importance}`)}
                </span>

                {/* Deal breaker */}
                {dim.deal_breaker && (
                  <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold bg-[#FDEBEC] text-[#9F2F2D] border-[#F6D4D5]">
                    {t("jdIntel.dealBreaker")}
                  </span>
                )}

                {/* Verdict (seniority only, graded=true) */}
                {dim.graded && dim.verdict && <VerdictChip verdict={dim.verdict} t={t} />}

                {/* Not graded badge */}
                {!dim.graded && (
                  <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold bg-[#F7F6F3] text-[#787774] border-[#E3E3E0]">
                    {t("jdIntel.notGraded")}
                  </span>
                )}
              </div>

              {/* Row 2: CV signal (seniority graded only) */}
              {dim.graded && dim.cv_signal && (
                <p className="text-[11px] text-[#787774] ml-6">
                  <span className="font-semibold">{t("jdIntel.cvSignal")}:</span>{" "}
                  <span className="font-mono">{dim.cv_signal}</span>
                </p>
              )}

              {/* Row 3: evidence (quoted from JD) */}
              <p className="text-[11px] text-[#9B9B97] ml-6 italic">
                JD: &ldquo;{dim.evidence_text}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        {data.note && (
          <p className="text-[11px] text-slate-400 border-t border-[#F1F1EF] pt-3">
            {data.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
