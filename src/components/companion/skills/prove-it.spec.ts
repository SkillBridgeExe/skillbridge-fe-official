import { describe, expect, it } from "vitest";
import { pickTopProveIt } from "./prove-it";
import type { SkillMatchItem, EvidenceLedger } from "@shared/api";

const skill = (over: Partial<SkillMatchItem>): SkillMatchItem =>
  ({ name: "React", canonical_name: "react", status: "present", cvScore: 50, ...over }) as SkillMatchItem;

const ledger = (...pairs: Array<[string, string]>): EvidenceLedger =>
  ({
    items: pairs.map(([skill_canonical, strength]) => ({
      skill_canonical,
      display_name: skill_canonical,
      strength,
      sources: [],
      most_recent_year: null,
    })),
  }) as unknown as EvidenceLedger;

describe("pickTopProveIt", () => {
  it("is honest-empty with no ledger or empty items", () => {
    expect(pickTopProveIt([skill({})], [], null)).toBeNull();
    expect(pickTopProveIt([skill({})], [], { items: [] } as unknown as EvidenceLedger)).toBeNull();
  });

  it("is honest-empty when no skill is listed_only", () => {
    expect(pickTopProveIt([skill({})], [], ledger(["react", "demonstrated"]))).toBeNull();
  });

  it("picks a present JD skill that is listed_only (claimed-but-unproven)", () => {
    const r = pickTopProveIt([skill({ canonical_name: "react", status: "present" })], [], ledger(["react", "listed_only"]));
    expect(r?.skill_canonical).toBe("react");
  });

  it("includes partial-status skills", () => {
    const r = pickTopProveIt([skill({ canonical_name: "react", status: "partial" })], [], ledger(["react", "listed_only"]));
    expect(r?.skill_canonical).toBe("react");
  });

  it("ignores a missing skill (those belong to the roadmap, never prove-it)", () => {
    expect(
      pickTopProveIt([skill({ canonical_name: "react", status: "missing" })], [], ledger(["react", "listed_only"])),
    ).toBeNull();
  });

  it("picks the weakest (lowest cvScore) among listed_only candidates, across hard+soft", () => {
    const hard = [
      skill({ name: "React", canonical_name: "react", status: "present", cvScore: 70 }),
      skill({ name: "Node", canonical_name: "node", status: "partial", cvScore: 30 }),
    ];
    const soft = [skill({ name: "Comm", canonical_name: "comm", status: "present", cvScore: 10 })];
    // comm is NOT listed_only → excluded; node (30) beats react (70)
    const r = pickTopProveIt(hard, soft, ledger(["react", "listed_only"], ["node", "listed_only"]));
    expect(r?.skill_canonical).toBe("node");
  });
});
