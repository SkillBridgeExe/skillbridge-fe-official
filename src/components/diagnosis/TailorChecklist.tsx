import { useEffect, useMemo, useState } from "react";
import { Clipboard, Copy, FilePenLine, Lightbulb, LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGapReportQuery, useTailorRewriteMutation } from "@/hooks/use-diagnosis";
import type { CanonicalCvDocument, TailorAction, TailorActionType } from "@shared/api";
import { JdMarketPosition } from "./JdMarketPosition";
import { useQueryClient } from "@tanstack/react-query";
import { ToastAction } from "@/components/ui/toast";
import { getApiErrorCode, isThrottledError } from "@/lib/api-error";
import { useDiagnosisStore } from "@/store/useDiagnosisStore";
import { OPEN_TAILOR_REWRITE_EVENT, type OpenTailorRewriteEventDetail } from "@/components/companion/skills/chat-action-events";
import { canOpenTailorRewrite } from "@/components/companion/skills/chat-action-chips";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

const ACTION_CLASS: Record<TailorActionType, string> = {
  missing_required: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  add_evidence: "bg-[#E1F3FE] text-[#1F6C9F] border-[#BEE3F8]",
  emphasize: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
  deepen_wording: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
  not_fixable_now: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
  already_met: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
};

export function TailorChecklist({
  matchId,
  cvId,
  document,
}: {
  matchId?: string | null;
  cvId: string | null;
  document?: CanonicalCvDocument;
}) {
  const { t, i18n } = useTranslation("diagnosis");
  const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
  const { data, isLoading, isError } = useGapReportQuery(matchId, lang);
  const [activeAction, setActiveAction] = useState<TailorAction | null>(null);
  const actions = useMemo(() => data?.recommended_actions ?? [], [data?.recommended_actions]);

  // Reset any open rewrite dialog when the match changes — never carry an action from a previous
  // report onto a new match (it would submit a stale action_id against the wrong match_id).
  useEffect(() => {
    setActiveAction(null);
  }, [matchId]);

  useEffect(() => {
    const openRewrite = (event: Event) => {
      const detail = (event as CustomEvent<OpenTailorRewriteEventDetail>).detail;
      if (!detail?.actionId) return;
      const action = actions.find((item) => item.action_id === detail.actionId);
      if (cvId && canOpenTailorRewrite(action)) setActiveAction(action);
    };

    window.addEventListener(OPEN_TAILOR_REWRITE_EVENT, openRewrite);
    return () => window.removeEventListener(OPEN_TAILOR_REWRITE_EVENT, openRewrite);
  }, [actions, cvId]);

  if (!matchId || isError) return null;

  if (!isLoading && actions.length === 0) return null;

  return (
    <div className="space-y-6">
      <section className={cn(CARD, "overflow-hidden")}>
        <div className="border-b border-[#EAEAEA] p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#2F3437]">
            <FilePenLine className="h-5 w-5 text-primary" />
            {t("tailor.title")}
          </h3>
          <p className="mt-1 text-xs text-[#787774]">{t("review.actionList.rankedCaption", { defaultValue: "Xếp theo mức ảnh hưởng tới điểm của bạn" })}</p>
          {data?.generated_with_ledger === false && (
            <p className="mt-3 rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] px-3 py-2 text-xs text-[#787774]">
              {t("tailor.noLedger")}
            </p>
          )}
        </div>

        <div className="space-y-3 p-5">
          {isLoading ? (
            <TailorSkeleton />
          ) : (
            actions.slice(0, 8).map((action, index) => {
              // deepen_wording needs the located `before` bullet — without it the server rejects
              // with NO_ANCHOR, so don't even offer the button. emphasize has no such requirement.
              const canRewrite = Boolean(cvId) && canOpenTailorRewrite(action);

              return (
              <div
                key={action.action_id ?? `${action.skill_canonical}-${action.action_type}-${index}`}
                id={action.action_id ? `tailor-${action.action_id}` : undefined}
                className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", ACTION_CLASS[action.action_type])}>
                        {action.action_type === 'not_fixable_now' || action.action_type === 'already_met'
                          ? t('review.actionClass.not_fixable_now', { defaultValue: "Đã đạt hoặc chưa xử lý được ngay" })
                          : t(`tailor.action.${action.action_type}`)}
                      </span>
                      {action.jd_importance && (
                        <span className="rounded-full border border-[#EAEAEA] bg-white px-2 py-0.5 text-[11px] font-bold text-[#787774]">
                          {action.jd_importance}
                        </span>
                      )}
                      {typeof action.gap_severity === "number" && (
                        <span
                          title={t("review.actionList.impactHint")}
                          className="rounded-full border border-[#DCE9D7] bg-white px-2 py-0.5 text-[11px] font-bold text-[#346538]"
                        >
                          {t("review.actionList.impact", { severity: action.gap_severity.toFixed(2) })}
                        </span>
                      )}
                      {/* W41: expected_impact badge — honest framing */}
                      {action.expected_impact && (() => {
                        const { score_min, score_max, severity_drop } = action.expected_impact;
                        if (score_max > 0) {
                          const label = score_min === score_max
                            ? t("tailor.impact.pointsSingle", { max: score_max })
                            : t("tailor.impact.points", { min: score_min, max: score_max });
                          return (
                            <span
                              title={t("tailor.impact.disclaimer")}
                              className="rounded-full border border-[#BEE3F8] bg-[#E1F3FE] px-2 py-0.5 text-[11px] font-bold text-[#1F6C9F]"
                            >
                              {label}
                            </span>
                          );
                        }
                        if (score_min === 0 && score_max === 0 && (severity_drop ?? 0) > 0) {
                          return (
                            <span
                              title={t("tailor.impact.riskReductionTooltip")}
                              className="rounded-full border border-[#EAEAEA] bg-[#F1F1EF] px-2 py-0.5 text-[11px] font-bold text-[#787774]"
                            >
                              {t("tailor.impact.riskReduction")}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-[#2F3437]">{action.display_name}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#787774]">{action.why}</p>
                    {(action.cv_section || action.anchor?.ref) && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#787774]">
                        <LocateFixed className="h-3.5 w-3.5 text-primary" />
                        {action.cv_section ||
                          (action.anchor?.ref ? t("tailor.anchor", { ref: action.anchor.ref }) : "")}
                      </p>
                    )}
                    {/* Honest disclosure: the BE could not pin the exact bullet — double-check the spot. */}
                    {action.anchor_confidence === "low" && (
                      <p className="mt-1 text-xs font-medium text-[#956400]">
                        ⚠ {t("tailor.lowAnchor")}
                      </p>
                    )}
                    {/* emphasize: surface-the-skill hint (BE-provided, deterministic) — never a bullet rewrite */}
                    {action.insertion_hint && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-[#1F6C9F]">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {action.insertion_hint}
                          {action.target_section && (
                            <span className="text-[#787774]">
                              {" "}
                              {t("tailor.surfaceAt", { ref: action.target_section })}
                            </span>
                          )}
                        </span>
                      </p>
                    )}
                    {/* deepen_wording: the exact CV bullet to reword (only when BE located it with evidence) */}
                    {action.before && (
                      <div className="mt-3 rounded-lg border border-[#EAEAEA] bg-white px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#9B9A97]">
                          {t("tailor.before")}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#2F3437]">{action.before}</p>
                      </div>
                    )}
                  </div>
                  {canRewrite && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveAction(action)}
                      className="shrink-0 rounded-lg border-[#BEE3F8] text-xs font-bold text-[#1F6C9F] hover:bg-[#E1F3FE]"
                    >
                      <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                      {t("tailor.rewriteBtn")}
                    </Button>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      </section>

      <JdMarketPosition market={data?.jd_market_position} />

      {activeAction && cvId && (
        <TailorRewriteDialog
          // Remount on match/action change → seed the textarea from the NEW action, never reuse
          // text/action state from a previously-opened dialog.
          key={`${matchId}:${activeAction.action_id ?? activeAction.skill_canonical}`}
          action={activeAction}
          cvId={cvId}
          matchId={matchId}
          document={document}
          open={Boolean(activeAction)}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null);
          }}
        />
      )}
    </div>
  );
}

function TailorRewriteDialog({
  action,
  cvId,
  matchId,
  document,
  open,
  onOpenChange,
}: {
  action: TailorAction;
  cvId: string;
  matchId: string;
  document?: CanonicalCvDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("diagnosis");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rewriteMutation = useTailorRewriteMutation();
  const candidates = useMemo(() => findAnchorBullets(document, action.anchor?.ref), [document, action.anchor?.ref]);
  // PR4: BE-resolved exact bullet wins over the FE's anchor guess; fall back to the guess when absent.
  const [text, setText] = useState(action.before ?? candidates[0] ?? "");

  const suggestion = rewriteMutation.data?.suggestion ?? "";

  const copySuggestion = async () => {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    toast({ title: t("tailor.copied") });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("tailor.dialogTitle", { skill: action.display_name })}</DialogTitle>
          <DialogDescription>{t("tailor.dialogDesc")}</DialogDescription>
        </DialogHeader>

        {candidates.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold text-[#2F3437]">{t("tailor.detectedBullets")}</p>
            <div className="space-y-2">
              {candidates.slice(0, 4).map((candidate, index) => (
                <button
                  key={`${candidate}-${index}`}
                  type="button"
                  onClick={() => setText(candidate)}
                  className="w-full rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-2 text-left text-xs leading-relaxed text-[#2F3437] hover:border-primary/40"
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold text-[#2F3437]">{t("tailor.pasteBullet")}</p>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-28" />
        </div>

        {suggestion && (
          <div className="rounded-xl border border-[#DCE9D7] bg-[#EDF3EC] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-[#346538]">{t("tailor.suggestion")}</p>
              <Button type="button" size="sm" variant="outline" onClick={copySuggestion} className="h-8 gap-1.5 rounded-lg text-xs">
                <Copy className="h-3.5 w-3.5" />
                {t("tailor.copy")}
              </Button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2F3437]">{suggestion}</p>
            {rewriteMutation.data?.fallback && (
              <p className="mt-2 text-xs font-medium text-[#787774]">{t("tailor.fallbackNote")}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("tailor.close")}</Button>
          <Button
            type="button"
            disabled={!text.trim() || rewriteMutation.isPending}
            onClick={() =>
              rewriteMutation.mutate(
                { cvId, matchId, text, action },
                {
                  // BE may reject (NO_ANCHOR / TEXT_NOT_IN_CV / ACTION_NOT_FOUND / quota / auth) —
                  // surface a friendly reason instead of silently doing nothing.
                  onError: (err: unknown) => {
                    const errorObject = typeof err === "object" && err !== null
                      ? (err as { code?: string; errorCode?: string })
                      : {};
                    const code = errorObject.code ?? errorObject.errorCode ?? getApiErrorCode(err);
                    if (code === "MATCH_TOO_OLD") {
                      toast({
                        title: t("tailor.errors.matchTooOldTitle", { defaultValue: "Kết quả so khớp cũ" }),
                        description: t("tailor.errors.matchTooOldDesc", { defaultValue: "Kết quả so khớp đã cũ, hãy chạy lại so khớp JD" }),
                        variant: "destructive",
                        action: (
                          <ToastAction
                            altText={t("tailor.errors.gotoMatch", { defaultValue: "Chuyển tới" })}
                            // Khu so khớp JD nằm ở step "cv-review" (view khác) — scrollIntoView
                            // không với tới; đổi step qua store rồi cuộn lên đầu.
                            onClick={() => {
                              useDiagnosisStore.getState().setStep("cv-review");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            {t("tailor.errors.gotoMatch", { defaultValue: "Chuyển tới" })}
                          </ToastAction>
                        ),
                      });
                    } else if (code === "ACTION_NOT_FOUND" || code === "ACTION_NOT_REWRITABLE") {
                      toast({
                        title: t("tailor.errors.actionInvalidTitle", { defaultValue: "Gợi ý hết hiệu lực" }),
                        description: t("tailor.errors.actionInvalidDesc", { defaultValue: "Gợi ý này không còn hợp lệ, đang tải lại checklist..." }),
                        variant: "destructive",
                      });
                      queryClient.invalidateQueries({ queryKey: ["gap-report", matchId] });
                    } else if (code === "NO_ANCHOR" || code === "TEXT_NOT_IN_CV") {
                      toast({
                        title: t("tailor.errors.textNotInCvTitle", { defaultValue: "Mất dấu gợi ý" }),
                        description: t("tailor.errors.textNotInCvDesc", { defaultValue: "Nội dung CV đã thay đổi so với lúc chấm hoặc gợi ý không khớp." }),
                        variant: "destructive",
                      });
                    } else if (isThrottledError(err)) {
                      toast({
                        title: t("degraded.throttled", { defaultValue: "Bạn thao tác hơi nhanh, thử lại sau giây lát" }),
                        variant: "default",
                        action: (
                          <ToastAction
                            altText={t("gapReport.retry", { defaultValue: "Thử lại" })}
                            onClick={() => {
                              rewriteMutation.mutate(
                                { cvId, matchId, text, action }
                              );
                            }}
                          >
                            {t("gapReport.retry", { defaultValue: "Thử lại" })}
                          </ToastAction>
                        ),
                      });
                    } else {
                      toast({ title: t("tailor.rewriteError"), variant: "destructive" });
                    }
                  },
                },
              )
            }
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Clipboard className="mr-2 h-4 w-4" />
            {rewriteMutation.isPending ? t("tailor.rewriting") : t("tailor.rewriteBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function findAnchorBullets(document?: CanonicalCvDocument, ref?: string | null): string[] {
  if (!document || !ref) return [];
  const needle = normalize(ref);
  const experience = document.experience.find((entry) =>
    needle.includes(normalize(entry.org)) || (entry.role ? needle.includes(normalize(entry.role)) : false),
  );
  if (experience?.bullets?.length) return experience.bullets;

  const project = document.projects.find((entry) => needle.includes(normalize(entry.name)));
  if (project?.bullets?.length) return project.bullets;

  return [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function TailorSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
          <div className="h-5 w-32 rounded-full bg-[#F1F1EF]" />
          <div className="mt-3 h-4 w-44 rounded bg-[#F1F1EF]" />
          <div className="mt-3 h-3 w-full rounded bg-[#F1F1EF]" />
        </div>
      ))}
    </>
  );
}
