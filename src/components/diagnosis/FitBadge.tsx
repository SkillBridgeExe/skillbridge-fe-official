import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import type { FitReasonCode, FitVerdict } from "@shared/api";

interface FitBadgeProps {
  fit: { verdict: FitVerdict; reasons: FitReasonCode[] };
  className?: string;
}

export function FitBadge({ fit, className }: FitBadgeProps) {
  const { t } = useTranslation();

  const colorClass =
    fit.verdict === "safe_apply"
      ? "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]"
      : fit.verdict === "stretch"
        ? "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]"
        : "bg-[#FDEBEC] text-[#9F2F2D] border-[#F5C9C7]"; // not_recommended

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold", colorClass)}>
        {t(`diagnosis.fit.verdict.${fit.verdict}`)}
      </span>
      {fit.reasons && fit.reasons.length > 0 && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3.5 h-3.5 text-[#787774] cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              <ul className="list-disc pl-3">
                {fit.reasons.map((reason, idx) => (
                  <li key={idx}>
                    {t(`diagnosis.fit.reason.${reason}`, {
                      defaultValue: reason,
                    })}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
