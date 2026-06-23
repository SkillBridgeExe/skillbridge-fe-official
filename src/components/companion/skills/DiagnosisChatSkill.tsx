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
import { Send, RotateCcw, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThinkingDots } from "../ThinkingDots";
import type { CompanionChatMessage } from "@/store/useCompanionStore";

interface Props {
  messages: CompanionChatMessage[];
  opener: string | null;
  suggestions: string[];
  onSend: (question: string) => void;
}

export function DiagnosisChatSkill({ messages, opener, suggestions, onSend }: Props) {
  const { t } = useTranslation("diagnosis");
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const lastUserText = useRef<string>("");

  const hasMessages = messages.length > 0;

  // Auto-scroll the thread to the newest message.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, messages]);

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    lastUserText.current = q;
    onSend(q);
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  };

  // Find the most recent user message to retry from (error row → resend it).
  const lastUserMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].text;
    }
    return lastUserText.current;
  })();

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
                  className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-primary/10 transition-colors active:scale-[0.97]"
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
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm border border-[#F1E5C0] bg-[#FBF3DB] px-3 py-2">
                    <p className="flex items-start gap-1.5 text-[12px] font-medium leading-relaxed text-[#956400]">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t("companion.chat.error")}
                    </p>
                    {lastUserMessage && (
                      <button
                        type="button"
                        onClick={() => submit(lastUserMessage)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold text-[#956400] hover:bg-[#F1E5C0]/40 transition-colors"
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Composer ── */}
      <div className="flex items-end gap-2 border-t border-[#F1F1EF] pt-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={t("companion.chat.placeholder")}
          aria-label={t("companion.chat.placeholder")}
          className="max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-[#EAEAEA] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#2F3437] placeholder:text-[#9AA1A6] focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={() => submit(draft)}
          disabled={!draft.trim()}
          aria-label={t("companion.chat.send")}
          className={cn(
            "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-all active:scale-[0.95]",
            draft.trim()
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-[#F1F1EF] text-[#9AA1A6]",
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
