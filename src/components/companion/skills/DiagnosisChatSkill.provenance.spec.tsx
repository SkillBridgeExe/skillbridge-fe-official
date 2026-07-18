// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProvenanceRow } from "./DiagnosisChatSkill";
import type { GroundedFact } from "@/types/companion";

// Same convention as MascotSticker.emotion.spec: no jest-dom — assert via queries/attributes.
afterEach(cleanup);

// Echo keys verbatim (ignore defaultValue) so assertions pin WHICH key each chip resolves.
const t = (key: string, opts?: Record<string, unknown>) =>
  opts && "count" in opts ? `${key}:${String(opts.count)}` : key;

const FACTS: GroundedFact[] = [
  { kind: "dimension", id: "action_verbs", label: "action_verbs" },
  { kind: "gap", id: "jd:hard_skill:docker", label: "Docker" },
  { kind: "conversation", id: "2", label: "2" },
];

describe("ProvenanceRow — 'Dựa trên N dữ kiện' (Wave 2)", () => {
  it("renders nothing when there are no facts (honest-empty)", () => {
    const { container } = render(<ProvenanceRow facts={[]} t={t} />);
    expect(container.innerHTML).toBe("");
    const { container: c2 } = render(<ProvenanceRow facts={undefined} t={t} />);
    expect(c2.innerHTML).toBe("");
  });

  it("renders nothing under a refusal — a refusal claims nothing (double guard)", () => {
    const { container } = render(<ProvenanceRow facts={FACTS} answerKind="refusal" t={t} />);
    expect(container.innerHTML).toBe("");
  });

  it("collapsed by default with the count; expands to one chip per fact", () => {
    render(<ProvenanceRow facts={FACTS} answerKind="grounded" t={t} />);
    const toggle = screen.getByRole("button", { name: "companion.chat.provenance:3" });
    expect(screen.queryByText("Docker")).toBeNull(); // collapsed
    fireEvent.click(toggle);
    expect(screen.getByText("Docker")).toBeTruthy();
    // Dimension label resolves through review.dims.* (fake t echoes the key).
    expect(screen.getByText("review.dims.action_verbs")).toBeTruthy();
  });

  it("dimension and gap chips jump to their report anchors via onAction", () => {
    const onAction = vi.fn();
    render(<ProvenanceRow facts={FACTS} answerKind="grounded" onAction={onAction} t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "companion.chat.provenance:3" }));
    fireEvent.click(screen.getByText("review.dims.action_verbs"));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "jump", anchorId: "dim-action_verbs" }),
    );
    fireEvent.click(screen.getByText("Docker"));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "jump", anchorId: "gap-jd:hard_skill:docker" }),
    );
  });

  it("a conversation fact renders as static 'you said' text, never a button", () => {
    render(<ProvenanceRow facts={FACTS} answerKind="grounded" t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "companion.chat.provenance:3" }));
    const youSaid = screen.getByText("companion.chat.provenanceYouSaid");
    expect(youSaid.closest("button")).toBeNull();
  });

  it("Wave 3 read-tool facts resolve localized labels, not raw tool ids", () => {
    const toolFacts: GroundedFact[] = [
      { kind: "tool", id: "roadmap.progress", label: "roadmap.progress" },
      { kind: "tool", id: "interview.history", label: "interview.history" },
      { kind: "tool", id: "github.enrich", label: "github.enrich" },
    ];
    render(<ProvenanceRow facts={toolFacts} answerKind="grounded" t={t} />);
    fireEvent.click(screen.getByRole("button", { name: "companion.chat.provenance:3" }));
    expect(screen.getByText("companion.chat.toolRoadmap")).toBeTruthy();
    expect(screen.getByText("companion.chat.toolInterview")).toBeTruthy();
    expect(screen.getByText("GitHub")).toBeTruthy(); // brand names stay hardcoded
    expect(screen.queryByText("roadmap.progress")).toBeNull(); // raw id never shown
  });
});
