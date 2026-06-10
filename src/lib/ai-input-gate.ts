// ─── AI input gate (FE mirror of the BE gate) ───────────────────────
// Faithful client-side mirror of the BE rules (skillbridge-ai text-quality.ts)
// so users get INSTANT feedback before any request is sent. The BE stays the
// source of truth — same thresholds here, the FE only short-circuits the
// obvious failures and maps the BE 400 codes to friendly i18n copy.

/** Machine codes the BE rewrite gate returns on HTTP 400. */
export type AiGateCode = "INSUFFICIENT_CONTEXT" | "OFF_TOPIC";

const AI_GATE_CODES: readonly AiGateCode[] = ["INSUFFICIENT_CONTEXT", "OFF_TOPIC"];

export interface AiInputVerdict {
  ok: boolean;
  reason?: "INSUFFICIENT_CONTEXT";
}

/** Placeholder/keyboard-mash tokens the BE ignores (compared lowercase). */
const BLOCKLIST = new Set([
  "test", "asdf", "qwerty", "lorem", "ipsum", "abc", "xyz",
  "aaa", "sss", "ddd", "foo", "bar", "baz",
]);

/** "aaaa", "-----", "111" — one character repeated all the way through. */
const SINGLE_REPEATED_CHAR = /^(.)\1+$/;
const HAS_LETTER = /\p{L}/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/gu;

/** Meaningful = ≥2 chars, not a single repeated char, not blocklisted, has a letter. */
function isMeaningfulToken(token: string): boolean {
  if (token.length < 2) return false;
  const lower = token.toLowerCase();
  if (SINGLE_REPEATED_CHAR.test(lower)) return false;
  if (BLOCKLIST.has(lower)) return false;
  return HAS_LETTER.test(token);
}

/**
 * Mirror of the BE input gate: FAIL when there are <4 meaningful tokens AND
 * <25 letter/digit chars across them; ALSO FAIL short repetitive input
 * (3-12 tokens with ≤34% unique). Unicode-aware so Vietnamese text passes.
 */
export function assessAiInput(text: string): AiInputVerdict {
  const trimmed = text.trim();
  const tokens = trimmed ? trimmed.split(/\s+/) : [];

  const meaningfulTokens = tokens.filter(isMeaningfulToken);
  const meaningfulLetterDigitChars =
    meaningfulTokens.join("").match(LETTER_OR_DIGIT)?.length ?? 0;

  if (meaningfulTokens.length < 4 && meaningfulLetterDigitChars < 25) {
    return { ok: false, reason: "INSUFFICIENT_CONTEXT" };
  }

  if (tokens.length >= 3 && tokens.length <= 12) {
    const uniqueTokens = new Set(tokens.map((t) => t.toLowerCase())).size;
    if (uniqueTokens / tokens.length <= 0.34) {
      return { ok: false, reason: "INSUFFICIENT_CONTEXT" };
    }
  }

  return { ok: true };
}

// ─── BE gate error mapping ──────────────────────────────────────────
// unwrapEnvelope flattens axios errors into plain `Error`s, so the api layer
// throws this typed error BEFORE unwrapping to keep the machine code around.

/** Thrown by the api layer when the BE gate rejects the input (HTTP 400 + code). */
export class AiGateError extends Error {
  constructor(
    public readonly code: AiGateCode,
    message: string,
  ) {
    super(message);
    this.name = "AiGateError";
  }
}

function matchCodeInString(value: string): AiGateCode | null {
  return AI_GATE_CODES.find((code) => value.includes(code)) ?? null;
}

/**
 * Dig a gate code out of a BE 400 payload. The envelope is
 * { success, message, data, errors } and the code's exact slot is not pinned
 * down across BE versions — check the usual keys defensively.
 */
export function extractAiGateCode(payload: unknown, depth = 0): AiGateCode | null {
  if (payload == null || depth > 3) return null;
  if (typeof payload === "string") return matchCodeInString(payload);
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAiGateCode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  for (const key of ["code", "errorCode"]) {
    const value = record[key];
    if (typeof value === "string" && (AI_GATE_CODES as readonly string[]).includes(value)) {
      return value as AiGateCode;
    }
  }
  for (const key of ["message", "errors", "error", "data"]) {
    const found = extractAiGateCode(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Gate code from anything a mutation's onError receives, or null if it's a real error. */
export function getAiGateCode(error: unknown): AiGateCode | null {
  if (error instanceof AiGateError) return error.code;
  if (error instanceof Error) return matchCodeInString(error.message);
  return null;
}
