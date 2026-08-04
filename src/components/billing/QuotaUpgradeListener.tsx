import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

/**
 * Global 402 handler. The HTTP interceptor broadcasts `skillbridge:quota-exceeded` whenever a
 * paid action is blocked by quota / plan (HTTP 402). We surface ONE honest "you're out of quota
 * — upgrade" toast instead of each call showing a raw error. `FEATURE_NOT_INCLUDED` (e.g. FREE
 * cv_builder_rewrite=0) gets a "not in your plan" message; `FEATURE_USAGE_LIMIT_REACHED` gets a
 * "used all quota" message. Debounced so a burst of 402s shows a single toast.
 */
export function QuotaUpgradeListener() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const lastShownAt = useRef(0);

  useEffect(() => {
    const onQuota = (event: Event) => {
      const detail = (event as CustomEvent<{
        code?: string | null;
        creditType?: "CV_ANALYSIS" | "INTERVIEW_SESSION" | null;
      }>).detail;
      const code = detail?.code ?? null;
      const now = Date.now();
      if (now - lastShownAt.current < 1500) return; // debounce a burst
      lastShownAt.current = now;

      const notInPlan = code === "FEATURE_NOT_INCLUDED";
      toast({
        title: t("quota402.title"),
        description: notInPlan ? t("quota402.notInPlan") : t("quota402.limitReached"),
        action: (
          <ToastAction
            altText={t("quota402.upgrade")}
            onClick={() => {
              const credit = detail?.creditType;
              window.location.assign(credit ? `/pricing?credit=${credit}` : "/pricing");
            }}
          >
            {t("quota402.upgrade")}
          </ToastAction>
        ),
      });
    };

    window.addEventListener("skillbridge:quota-exceeded", onQuota);
    return () => window.removeEventListener("skillbridge:quota-exceeded", onQuota);
  }, [t, toast]);

  return null;
}
