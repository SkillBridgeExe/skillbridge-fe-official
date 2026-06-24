import { describe, expect, it } from "vitest";
import { useCvBuilderStore } from "./useCvBuilderStore";
import type { CvAssistantTurn } from "@/types/companion";

// Verifies the Critical #1 fix: the companion is ONE global session scoped to a single field, so a CV
// with many editable fields never bleeds one field's turn/patch onto another (and a switch wipes the
// prior in-progress session, so a stale patch can't be applied to the wrong field).
const TURN: CvAssistantTurn = {
  message: "m",
  questions: [{ gap: "tech", prompt: "?", options: [], allows_free_text: true }],
  requires_user_confirmation: false,
  field_patch: null,
};

// Mirrors CompanionPanel's render guard: only the active field shows the session UI.
const isActiveField = (companionField: string | null, fieldPath: string) =>
  !!fieldPath && companionField === fieldPath;

describe("useCvBuilderStore — companion multi-field isolation (Critical #1)", () => {
  it("scopes the session to one field; other fields stay idle (no cross-field bleed)", () => {
    const s = useCvBuilderStore.getState();
    s.resetCompanion();

    // Field A opens a companion session.
    s.setCompanionField("experience[0].description", "experience");
    s.setCompanionTurn(TURN);
    s.setMascotState("asking");

    const cf = useCvBuilderStore.getState().companionField;
    expect(cf).toBe("experience[0].description");
    expect(isActiveField(cf, "experience[0].description")).toBe(true); // A renders the session
    expect(isActiveField(cf, "experience[1].description")).toBe(false); // B renders idle, not A's turn
    expect(isActiveField(cf, "projects[0].description")).toBe(false);
  });

  it("switching fields WIPES the prior session (no stale patch to mis-apply)", () => {
    const s = useCvBuilderStore.getState();
    s.resetCompanion();

    // Field A reaches a proposed patch.
    s.setCompanionField("experience[0].description", "experience");
    s.setMascotState("presenting");
    s.setCompanionPatch({ target: "experience[0].description", before: "x", after: "y", why: "w" });

    // Field B takes over.
    s.setCompanionField("experience[1].description", "experience");
    const after = useCvBuilderStore.getState();
    expect(after.companionField).toBe("experience[1].description");
    expect(after.companionTurn).toBeNull();
    expect(after.companionPatch).toBeNull();
    expect(after.mascotState).toBe("idle");
  });

  it("resetCompanion releases the active field (apply / discard ends the session)", () => {
    const s = useCvBuilderStore.getState();
    s.setCompanionField("summary", "summary");
    s.setMascotState("presenting");
    s.resetCompanion();

    const after = useCvBuilderStore.getState();
    expect(after.companionField).toBeNull();
    expect(after.mascotState).toBe("idle");
    expect(isActiveField(after.companionField, "summary")).toBe(false);
  });
});
