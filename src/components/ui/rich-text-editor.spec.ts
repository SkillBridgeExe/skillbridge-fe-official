import { describe, expect, it } from "vitest";
import { normalizeToBulletText } from "./rich-text-editor";

describe("normalizeToBulletText", () => {
  it("converts plain lines into resume-safe bullet text", () => {
    expect(normalizeToBulletText("Built APIs\nReduced latency")).toBe("- Built APIs\n- Reduced latency");
  });

  it("strips legacy HTML before storing bullet text", () => {
    expect(normalizeToBulletText("<ul><li>Built APIs</li><li>Reduced latency</li></ul>")).toBe(
      "- Built APIs\n- Reduced latency",
    );
  });
});
