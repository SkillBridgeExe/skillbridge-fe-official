// ─── DiagnosisChatSkill ─────────────────────────────────────────────
// The calm corner advisor's bubble UI (owner decision 06-23). The dolphin sits
// idle at the home corner and INVITES the user to chat about HOW their CV was
// scored / where it's weak. The user drives everything via chat:
//   • a grounded opener (REAL score + STATIC i18n template — no LLM, no fabrication)
//   • suggested-question chips that seed the conversation
//   • a two-way message thread (user right / assistant left)
//   • a "thinking" row while the answer is in flight
//   • a friendly error + retry row when the BE chat endpoint isn't reachable yet
//   • a bottom textarea (Enter to send, Shift+Enter newline) + send button
//
// onPointerDown stopPropagation on the input area so typing never drags the unit.
// Rendered INSIDE the existing bubble container (which carries max-h/overflow/aria/focus).

import { useState, useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { useTypewriter } from "@/hooks/use-typewriter";
import { Send, RotateCcw, AlertCircle, ArrowUpRight, Trash2, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThinkingDots } from "../ThinkingDots";
import type { CompanionChatMessage } from "@/store/useCompanionStore";
import type { ChatActionChip } from "./chat-action-chips";
import type { ChatKnownState, GroundedFact } from "@/types/companion";

interface Props {
  messages: CompanionChatMessage[];
  opener: string | null;
  suggestions: string[];
  onSend: (question: string) => void;
  /** Suggestion chips can be plain questions or local deterministic coaching flows. */
  onSuggestionTap?: (question: string) => void;
  /** Per-row retry: heal the failed assistant row at this index in place + re-send its question. */
  onRetry: (index: number) => void;
  /** Erase persisted chat memory for this match, then clear the local thread. */
  onDeleteThread?: () => void;
  /** F4+: dispatch a chip action (jump/rewrite/roadmap/prove-it/copy). */
  onAction?: (chip: ChatActionChip) => void;
  pendingAction?: ChatActionChip | null;
  onConfirmAction?: () => void;
  onCancelAction?: () => void;
  /** True while a request is in flight → disables the composer/chips (anti double-send). */
  isPending: boolean;
  /** Wave 2: the BE's deterministic memory mirror — renders the collapsed memory card. */
  knownState?: ChatKnownState | null;
}

function toolLabel(tool: string): string {
  if (tool === "github.enrich") return "GitHub";
  if (tool === "resource.validate") return "Link";
  return tool;
}

export function DiagnosisChatSkill({
  messages,
  opener,
  suggestions,
  onSend,
  onSuggestionTap,
  onRetry,
  onDeleteThread,
  onAction,
  pendingAction,
  onConfirmAction,
  onCancelAction,
  isPending,
  knownState,
}: Props) {
  const { t } = useTranslation("diagnosis");
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  // ── Reduced-motion (R3) — same pattern as ThinkingDots ──
  const prefersReducedMotion = useReducedMotion() === true;

  // ── Which indexes are pending RIGHT NOW, snapshotted after paint (R1). ──
  // The render map reads this ref DURING render: on the exact render where a row
  // flips pending→resolved, this effect hasn't run yet, so the set still contains
  // that index — that single render mounts the row already animating, with no
  // post-paint state flip (a state-based approach showed the full text for one
  // frame, then wiped it). At most one row is ever pending (single-flight
  // isChatBusy send guard), so at most one row animates — no extra bookkeeping.
  const prevPendingRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const nowPending = new Set<number>();
    messages.forEach((m, i) => {
      if (m.role === "assistant" && m.pending) nowPending.add(i);
    });
    prevPendingRef.current = nowPending;
  }, [messages]);

  // Auto-scroll the thread to the newest message.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, messages]);

  // R7: also scroll during the reveal (follow the growing row).
  const scrollIfNearBottom = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    // "near bottom" = within 80px of the scroll end.
    const isNear = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isNear) el.scrollTop = el.scrollHeight;
  }, []);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q || isPending) return;
    onSend(q);
    setDraft("");
    // Re-focus the composer so the user can keep typing after send / chip-click.
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Ignore Enter while a request is in flight (anti double-send race).
      if (isPending) return;
      submit(draft);
    }
  };

  return (
    // stopPropagation so typing/clicking inside the chat never starts a unit drag.
    <div className="space-y-3 text-sm" onPointerDown={(e) => e.stopPropagation()}>
      {/* ── Opener (only before the first exchange) + suggestion chips ── */}
      {!hasMessages && (
        <div className="space-y-3">
          {opener && (
            <p className="text-[13px] leading-relaxed text-[#2F3437]">{opener}</p>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const q = s.trim();
                    if (!q || isPending) return;
                    if (onSuggestionTap) onSuggestionTap(q);
                    else submit(q);
                    setDraft("");
                    textareaRef.current?.focus();
                  }}
                  disabled={isPending}
                  className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Thread ── */}
      {hasMessages && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-[#F1F1EF] pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B949E]">
              {t("companion.chat.thread")}
            </span>
            {onDeleteThread && (
              <button
                type="button"
                onClick={onDeleteThread}
                disabled={isPending}
                aria-label={t("companion.chat.deleteThread")}
                title={t("companion.chat.deleteThread")}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#8B949E] transition-colors hover:bg-[#F5F5F3] hover:text-[#2F3437] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{t("companion.chat.deleteThread")}</span>
              </button>
            )}
          </div>
          <div
            ref={threadRef}
            className="max-h-[44vh] space-y-2.5 overflow-y-auto pr-1"
            role="log"
            aria-live="polite"
          >
            {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[13px] leading-relaxed text-white">
                    {m.text}
                  </div>
                </div>
              );
            }
            // assistant
            if (m.pending) {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[#EAEAEA] bg-[#FBFBFA] px-3 py-2">
                    <ThinkingDots label={t("companion.chat.thinking")} />
                  </div>
                </div>
              );
            }
            if (m.error) {
              // Daily-cap 429 → distinct "limit reached" copy with NO retry (retrying
              // can't help until the quota resets). Other errors are transient → retry.
              const isLimit = m.errorKind === "limit";
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm border border-[#F1E5C0] bg-[#FBF3DB] px-3 py-2">
                    <p className="flex items-start gap-1.5 text-[12px] font-medium leading-relaxed text-[#956400]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {isLimit ? t("companion.chat.limitReached") : t("companion.chat.error")}
                    </p>
                    {!isLimit && (
                      <button
                        type="button"
                        onClick={() => onRetry(i)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold text-[#956400] hover:bg-[#F1E5C0]/40 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" /> {t("companion.retry")}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <AssistantTextRow
                key={i}
                message={m}
                animate={prevPendingRef.current.has(i) && !prefersReducedMotion}
                onScrollDuringReveal={scrollIfNearBottom}
                isPending={isPending}
                onSend={onSend}
                onAction={onAction}
                t={t}
              />
            );
            })}
          </div>
          {pendingAction && (
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-2.5">
              <p className="text-[12px] font-medium leading-relaxed text-[#2F3437]">
                {pendingAction.kind === "rewrite"
                  ? t("companion.chat.confirmRewrite")
                  : pendingAction.kind === "roadmap"
                    ? t("companion.chat.confirmRoadmap")
                    : t("companion.chat.confirmAction")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={onConfirmAction}
                  disabled={isPending}
                  className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("companion.chat.confirmYes")}
                </button>
                <button
                  type="button"
                  onClick={onCancelAction}
                  disabled={isPending}
                  className="rounded-full border border-[#EAEAEA] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5F6B76] transition-colors hover:bg-[#F8F8F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("companion.chat.confirmNo")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Memory mirror (Wave 2) — what the dolphin remembers, verbatim from the BE. ── */}
      <MemoryCard state={knownState} t={t} />

      {/* ── Composer ── */}
      <div className="flex items-end gap-2 border-t border-[#F1F1EF] pt-2.5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          rows={1}
          placeholder={t("companion.chat.placeholder")}
          aria-label={t("companion.chat.placeholder")}
          className="max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#2F3437] placeholder:text-[#9AA1A6] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-[#F8F8F7] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => submit(draft)}
          disabled={!draft.trim() || isPending}
          aria-label={t("companion.chat.send")}
          className={cn(
            "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-all active:scale-[0.95]",
            draft.trim() && !isPending
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-[#F1F1EF] text-[#9AA1A6] cursor-not-allowed",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Wave 2 positioning line — the one-sentence trust contract, always visible. */}
      <p className="text-center text-[10px] leading-snug text-[#9AA1A6]">
        {t("companion.chat.positioning")}
      </p>
    </div>
  );
}

// ─── MemoryCard ("Cá heo đang nhớ gì", Wave 2) ───────────────────────
// Renders the BE's deterministic known_state VERBATIM — there is no client-side
// inference, so the card is 100% accurate by definition. Honest-empty: no card
// at all when nothing is known (an empty "I remember nothing" card is noise).
// Native <details> = collapsed by default, zero state to manage.

export function MemoryCard({
  state,
  t,
}: {
  state?: ChatKnownState | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const known =
    !!state && (state.target_role !== null || state.deadline !== null || state.covered_gaps.length > 0);
  if (!known) return null;
  const lines = [
    state.target_role ? t("companion.chat.memoryRole", { value: state.target_role }) : null,
    state.deadline ? t("companion.chat.memoryDeadline", { value: state.deadline }) : null,
    state.covered_gaps.length
      ? t("companion.chat.memoryCovered", { value: state.covered_gaps.join(", ") })
      : null,
  ].filter((line): line is string => line !== null);
  return (
    <details className="rounded-lg border border-[#EAEAEA] bg-[#FAFAF9] px-2.5 py-1.5 text-[11px] text-[#8A94A6]">
      <summary className="cursor-pointer select-none font-medium transition-colors hover:text-[#5F6B76]">
        {t("companion.chat.memoryTitle")}
      </summary>
      <div className="mt-1 space-y-0.5 text-[#5F6B76]">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </details>
  );
}

// ─── ProvenanceRow ("Dựa trên N dữ kiện", Wave 2) ────────────────────
// Exact-by-construction: the facts arrive from the BE gate's OWN resolution —
// this component only renders, never derives. Collapsed by default (one quiet
// line under the answer); expanding shows one chip per fact. dimension/gap
// chips reuse the existing jump pipeline; 'conversation' facts ("you said 2")
// are informational text, deliberately NOT clickable — a user-said number has
// no report anchor and must not dress up as verification.

export function ProvenanceRow({
  facts,
  answerKind,
  onAction,
  t,
}: {
  facts?: GroundedFact[];
  answerKind?: CompanionChatMessage["answerKind"];
  onAction?: (chip: ChatActionChip) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);
  // Double guard: the BE already sends [] on refusal/canned; a refusal must never advertise.
  if (!facts?.length || answerKind === "refusal") return null;

  const chipClass =
    "inline-flex items-center gap-1 rounded-full border border-[#D8DEE4] bg-[#F8F9FA] px-2 py-0.5 text-[11px] text-[#5F6B76]";
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A94A6] hover:text-[#5F6B76] transition-colors"
      >
        <ShieldCheck className="h-3 w-3" />
        {t("companion.chat.provenance", { count: facts.length })}
      </button>
      {open && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {facts.map((f) => {
            if (f.kind === "dimension" || f.kind === "gap") {
              const anchorId = f.kind === "dimension" ? `dim-${f.id}` : `gap-${f.id}`;
              const label =
                f.kind === "dimension"
                  ? t(`review.dims.${f.id}`, { defaultValue: f.label })
                  : f.label;
              return (
                <button
                  key={`${f.kind}-${f.id}`}
                  type="button"
                  onClick={() =>
                    onAction?.({ kind: "jump", labelKey: "companion.chat.chipViewGap", anchorId })
                  }
                  className={cn(chipClass, "hover:bg-[#EFF1F4] transition-colors")}
                >
                  <span>{label}</span>
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                </button>
              );
            }
            if (f.kind === "conversation") {
              return (
                <span key={`conv-${f.id}`} className={chipClass}>
                  {t("companion.chat.provenanceYouSaid", { value: f.label })}
                </span>
              );
            }
            // tool / other_match: informational label (other_match has no on-page anchor).
            return (
              <span key={`${f.kind}-${f.id}`} className={chipClass}>
                {f.kind === "tool" ? toolLabel(f.id) : f.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AssistantTextRow (typewriter-enabled) ───────────────────────────
// Extracted so the useTypewriter hook runs per-row. Hooks cannot be called
// inside map callbacks, so a sub-component is required.

interface AssistantTextRowProps {
  message: CompanionChatMessage;
  animate: boolean;
  onScrollDuringReveal: () => void;
  isPending: boolean;
  onSend: (q: string) => void;
  onAction?: (chip: ChatActionChip) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function AssistantTextRow({
  message: m,
  animate,
  onScrollDuringReveal,
  isPending,
  onSend,
  onAction,
  t,
}: AssistantTextRowProps) {
  // Sticky at mount: this row REMOUNTS exactly at pending→resolved (the pending
  // branch renders a host div, this component replaces it under the same key →
  // type switch → fresh mount). Later renders pass animate=false (the parent's
  // pending snapshot has moved on) — the mount-captured value keeps the reveal alive.
  const [shouldAnimate] = useState(animate);
  const { displayed, done } = useTypewriter(m.text, { animate: shouldAnimate });

  // R7: scroll while revealed text grows — AND once more on the `done` flip:
  // the chips/badge/next-step mount exactly then, and the parent's scroll only
  // reacts to `messages` changes, so without this last call they mount clipped
  // below the fold for a reader pinned to the bottom.
  useEffect(() => {
    if (shouldAnimate) {
      onScrollDuringReveal();
    }
  }, [displayed, shouldAnimate, done, onScrollDuringReveal]);

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#2F3437]">
        {/* R5: the visible span stays aria-hidden even AFTER the reveal. Swapping a
            bare text node in at `done` re-announces the whole answer — the thread
            is an aria-live region and swapped-in text counts as an addition. The
            sr-only sibling (announced once at mount) stays the accessible copy;
            select-none keeps it out of copy-paste. */}
        {shouldAnimate ? (
          <>
            <span aria-hidden="true">{displayed}</span>
            <span className="sr-only select-none">{m.text}</span>
          </>
        ) : (
          m.text
        )}
        {/* R6: chips wait for the reveal (non-animating rows render immediately). */}
        {(!shouldAnimate || done) && (
          <>
            {m.citedTool && (
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" />
                  {t("companion.chat.verifiedWithTool", { tool: toolLabel(m.citedTool) })}
                </span>
              </div>
            )}
            {m.actions && m.actions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.actions.map((a) => (
                  <button
                    key={a.anchorId ?? `${a.labelKey}-${a.kind}`}
                    type="button"
                    onClick={() => onAction?.(a)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ink-accent/40 focus:outline-none"
                  >
                    <span>{t(a.labelKey)}</span>
                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {m.suggestedNextStep && (
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => onSend(m.suggestedNextStep!)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#D8DEE4] bg-transparent px-2.5 py-1 text-[11px] font-medium text-[#5F6B76] hover:bg-[#F5F5F3] transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{m.suggestedNextStep}</span>
                </button>
              </div>
            )}
            {/* Wave 2: provenance row — same reveal gate as the other chrome. */}
            <ProvenanceRow
              facts={m.groundedFacts}
              answerKind={m.answerKind}
              onAction={onAction}
              t={t}
            />
          </>
        )}
      </div>
    </div>
  );
}
