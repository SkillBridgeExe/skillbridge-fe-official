import { describe, expect, it } from "vitest";
import { nextCoachTurn, type CoachTurn } from "./coach-flow";

// Anti-fab guard helper: a "specific bullet" looks like content (numbers, %, long prose),
// a CATEGORY key is a short i18n-style token. We assert every option key is a category token.
const isCategoryKey = (key: string): boolean =>
  /^[a-z][a-z0-9_]*$/.test(key) && !/\d{2,}/.test(key) && !key.includes(" ") && !key.includes("%");

describe("nextCoachTurn", () => {
  it("step 0 un-freeze is an OPEN turn (no choice options)", () => {
    const turn = nextCoachTurn({ trigger: "degraded", step: 0 });
    expect(turn.kind).toBe("open");
    expect(turn.promptKey).toBeTruthy();
    expect(turn.options).toBeUndefined();
  });

  it("step 0 ignores gap and stays OPEN (un-freeze first, always)", () => {
    const turn = nextCoachTurn({ trigger: "needs_detail", gap: "result", step: 0 });
    expect(turn.kind).toBe("open");
    expect(turn.options).toBeUndefined();
  });

  it("needs_detail + gap=result → CHOICE with >=3 impact-CATEGORY options + an 'other'", () => {
    const turn = nextCoachTurn({ trigger: "needs_detail", gap: "result", step: 1 });
    expect(turn.kind).toBe("choice");
    expect(turn.options).toBeDefined();
    const opts = turn.options!;
    // >=3 real impact categories + an explicit "other"
    expect(opts.length).toBeGreaterThanOrEqual(4);
    const keys = opts.map((o) => o.key);
    expect(keys).toContain("other");
    // at least 3 non-"other" impact categories
    expect(keys.filter((k) => k !== "other").length).toBeGreaterThanOrEqual(3);
  });

  it("needs_detail + gap=role → CHOICE with role-type CATEGORY options + an 'other'", () => {
    const turn = nextCoachTurn({ trigger: "needs_detail", gap: "role", step: 1 });
    expect(turn.kind).toBe("choice");
    expect(turn.options).toBeDefined();
    const keys = turn.options!.map((o) => o.key);
    expect(keys).toContain("other");
    expect(keys.filter((k) => k !== "other").length).toBeGreaterThanOrEqual(3);
  });

  it("choice options are CATEGORY keys, NEVER fabricated specific bullets", () => {
    const collectOpts = (ctx: Parameters<typeof nextCoachTurn>[0]) =>
      nextCoachTurn(ctx).options ?? [];
    const all: CoachTurn["options"] = [
      ...collectOpts({ trigger: "needs_detail", gap: "result", step: 1 }),
      ...collectOpts({ trigger: "needs_detail", gap: "role", step: 1 }),
    ];
    for (const o of all!) {
      // key is a category token (no digits-as-metrics, no spaces, no %)
      expect(isCategoryKey(o.key), `option key not a category: ${o.key}`).toBe(true);
      // labelKey is an i18n key path, never a literal sentence
      expect(o.labelKey).toMatch(/^[a-zA-Z][\w.]*$/);
      expect(o.labelKey.includes(" ")).toBe(false);
    }
  });

  it("emits i18n KEYS for prompts, never literal user-facing text", () => {
    const turns: CoachTurn[] = [
      nextCoachTurn({ trigger: "degraded", step: 0 }),
      nextCoachTurn({ trigger: "needs_detail", gap: "result", step: 1 }),
      nextCoachTurn({ trigger: "gate", step: 2 }),
    ];
    for (const t of turns) {
      // a key path like "companion.coach.openDayToDay" — dotted, no spaces, no punctuation prose
      expect(t.promptKey).toMatch(/^[a-zA-Z][\w.]*$/);
      expect(t.promptKey.includes(" ")).toBe(false);
    }
  });

  it("falls back to an OPEN STAR probe when the gap has no known category", () => {
    const turn = nextCoachTurn({ trigger: "needs_detail", gap: "something_unknown", step: 1 });
    expect(turn.kind).toBe("open");
    expect(turn.options).toBeUndefined();
  });

  it("falls back to an OPEN STAR probe when gap is null/undefined past step 0", () => {
    expect(nextCoachTurn({ trigger: "needs_detail", gap: null, step: 1 }).kind).toBe("open");
    expect(nextCoachTurn({ trigger: "needs_detail", step: 1 }).kind).toBe("open");
  });

  it("has a real terminal honest-stop turn at the end of the funnel", () => {
    const terminal = nextCoachTurn({ trigger: "needs_detail", gap: "result", step: 99 });
    expect(terminal.kind).toBe("open");
    // honest-stop: a distinct terminal prompt key (leave-blank / nothing-to-add)
    expect(terminal.promptKey).toMatch(/stop|done|blank|enough|terminal/i);
    expect(terminal.options).toBeUndefined();
  });
});
