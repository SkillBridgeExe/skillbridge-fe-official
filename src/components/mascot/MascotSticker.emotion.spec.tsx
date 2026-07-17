// @vitest-environment jsdom
// Wave 1 (mascot soul): the two chat-verdict emotion states. Reuses existing PNGs —
// sheepish rides thinking.png with a droopy motion, confident rides thumbs-up with a
// calmer settle than `success`. The MOTION carries the emotion until dedicated art exists.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MascotSticker } from "./MascotSticker";

describe("MascotSticker emotion states (Wave 1)", () => {
  it.each(["sheepish", "confident"] as const)("renders the mascot img for state %s", (state) => {
    render(<MascotSticker state={state} interactive={false} />);
    expect(screen.getByAltText("SkillBridge mascot")).toBeInTheDocument();
  });
});
