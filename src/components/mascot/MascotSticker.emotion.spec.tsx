// @vitest-environment jsdom
// Wave 1 (mascot soul): the two chat-verdict emotion states. Reuses existing PNGs —
// sheepish rides thinking.png with a droopy motion, confident rides thumbs-up with a
// calmer settle than `success`. The MOTION carries the emotion until dedicated art exists.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MascotSticker } from "./MascotSticker";

afterEach(cleanup);

describe("MascotSticker emotion states (Wave 1)", () => {
  it.each([
    ["sheepish", "thinking"],
    ["confident", "thumbs-up"],
  ] as const)("state %s renders the mascot img on the %s art", (state, art) => {
    render(<MascotSticker state={state} interactive={false} />);
    const img = screen.getByAltText("SkillBridge mascot");
    expect(img.getAttribute("src")).toContain(art);
  });
});
