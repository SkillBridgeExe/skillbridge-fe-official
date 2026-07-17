// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryCard } from "./DiagnosisChatSkill";

afterEach(cleanup);

const t = (key: string, opts?: Record<string, unknown>) =>
  opts && "value" in opts ? `${key}:${String(opts.value)}` : key;

describe("MemoryCard — 'Cá heo đang nhớ gì' (Wave 2 memory mirror)", () => {
  it("renders nothing when nothing is known (honest-empty, no disclaimer card)", () => {
    const { container } = render(<MemoryCard state={null} t={t} />);
    expect(container.innerHTML).toBe("");
    const { container: c2 } = render(
      <MemoryCard state={{ target_role: null, deadline: null, covered_gaps: [] }} t={t} />,
    );
    expect(c2.innerHTML).toBe("");
  });

  it("collapsed summary; expanding shows exactly the known fields verbatim", () => {
    render(
      <MemoryCard
        state={{ target_role: "Data Analyst", deadline: null, covered_gaps: ["Docker", "SQL"] }}
        t={t}
      />,
    );
    const summary = screen.getByText("companion.chat.memoryTitle");
    fireEvent.click(summary);
    expect(screen.getByText("companion.chat.memoryRole:Data Analyst")).toBeTruthy();
    expect(screen.getByText("companion.chat.memoryCovered:Docker, SQL")).toBeTruthy();
    // deadline is null → its line must NOT render (mirror never pads).
    expect(screen.queryByText(/memoryDeadline/)).toBeNull();
  });

  it("a FORGET-nullified mirror re-renders without the dropped field", () => {
    const { rerender } = render(
      <MemoryCard
        state={{ target_role: "Data Analyst", deadline: "2 tuần", covered_gaps: [] }}
        t={t}
      />,
    );
    rerender(
      <MemoryCard state={{ target_role: "Data Analyst", deadline: null, covered_gaps: [] }} t={t} />,
    );
    expect(screen.queryByText(/memoryDeadline/)).toBeNull();
    expect(screen.getByText("companion.chat.memoryRole:Data Analyst")).toBeTruthy();
  });
});
