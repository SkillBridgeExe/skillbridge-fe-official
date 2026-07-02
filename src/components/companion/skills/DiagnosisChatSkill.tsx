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

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, AlertCircle, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThinkingDots } from "../ThinkingDots";
import type { CompanionChatMessage } from "@/store/useCompanionStore";

interface Props {
  messages: CompanionChatMessage[];
  opener: string | null;
  suggestions: string[];
  onSend: (question: string) => void;
  /** Per-row retry: heal the failed assistant row at this index in place + re-send its question. */
  onRetry: (index: number) => void;
  /** F4: jump to a deep-link chip's anchor (gap-, tailor-, or roadmap-anchor). */
  onJump?: (anchorId: string) => void;
  /** True while a request is in flight → disables the composer/chips (anti double-send). */
  isPending: boolean;
}

export function DiagnosisChatSkill({ messages, opener, suggestions, onSend, onRetry, onJump, isPending }: Props) {
  const { t } = useTranslation("diagnosis");
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  // Auto-scroll the thread to the newest message.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, messages]);

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
                  onClick={() => submit(s)}
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
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#2F3437]">
                  {m.text}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <button
                          key={a.anchorId}
                          type="button"
                          onClick={() => onJump?.(a.anchorId)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ink-accent/40 focus:outline-none"
                        >
                          <span>{t(a.labelKey)}</span>
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
