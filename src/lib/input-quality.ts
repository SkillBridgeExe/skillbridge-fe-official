// Deterministic, anti-fabrication input-quality checks for the CV builder.
// We ONLY flag input that is CLEARLY broken (repeated-char mash, no-vowel keyboard
// runs, or a near-miss typo of a known role word). Free-form roles we don't catalog
// are accepted (the BE takes free strings). Warn-only — never blocks the user.

const VOWELS =
  /[aeiouyàáảãạăắằẳẵặâấầẩẫậeèéẻẽẹêếềểễệioòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]/i;

/** True when text is almost certainly junk. Short input (<5 non-space chars) is never flagged. */
export function isGibberish(text: string): boolean {
  const trimmed = text.trim();
  const compact = trimmed.replace(/\s/g, "");
  if (compact.length < 5) return false; // too short to judge — don't flag
  const lower = trimmed.toLowerCase();
  // 1. Any char repeated ≥5× in a run: "sssss", "aaaaa".
  if (/(.)\1{4,}/.test(lower)) return true;
  // 2. A single long token (≥6 chars) with no vowel: "qwrtps", "sdfghj".
  if (lower.split(/\s+/).some((w) => w.length >= 6 && !VOWELS.test(w))) return true;
  // 3. ≤2 distinct chars across a ≥5-char body: "abababab", "xyxyxy".
  if (new Set(compact.toLowerCase()).size <= 2) return true;
  return false;
}

const ROLE_WORDS = [
  "engineer", "developer", "analyst", "designer", "architect",
  "manager", "tester", "scientist", "specialist", "consultant", "lead",
];

/** Levenshtein edit distance (small strings only). */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

/**
 * Check a target-position string. Returns `{ ok:false, suspectedTypo }` only when a
 * token is a NEAR-MISS (edit distance 1-2) of a known role word but not exactly it —
 * catches "Enginer"→"Engineer" without flagging legitimate free-form roles.
 */
export function checkRolePosition(text: string): { ok: boolean; suspectedTypo?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true };
  if (isGibberish(trimmed)) return { ok: false };
  const tokens = trimmed.toLowerCase().split(/\s+/);
  // Exact role word present → fine (e.g. "Frontend Developer").
  for (const tok of tokens) {
    if (tok.length >= 4 && ROLE_WORDS.includes(tok)) return { ok: true };
  }
  // Near-miss of a role word → likely typo (e.g. "Enginer").
  // Guard: only flag tokens NOT LONGER than the role word — a misspelling drops/garbles
  // letters (len ≤ word). A LONGER token is usually a legit plural/derived word
  // ("developers", "leader") and must NOT be flagged.
  for (const tok of tokens) {
    if (tok.length < 5) continue;
    for (const word of ROLE_WORDS) {
      if (tok === word) continue;
      if (tok.length > word.length) continue;
      const d = editDistance(tok, word);
      if (d >= 1 && d <= 2) {
        return { ok: false, suspectedTypo: word.charAt(0).toUpperCase() + word.slice(1) };
      }
    }
  }
  return { ok: true }; // free-form role we don't catalog → accept
}
