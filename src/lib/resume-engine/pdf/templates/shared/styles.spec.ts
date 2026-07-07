import { describe, expect, it } from "vitest";
import { resolveDividerStyles } from "./styles";

describe("resolveDividerStyles", () => {
  it("removes only the divider line without collapsing existing spacing", () => {
    expect(resolveDividerStyles({ dividerStyle: "none", accentColor: "#2563eb", textColor: "#0f172a" })).toEqual({
      borderBottomWidth: 0,
    });
  });

  it("keeps subtle dividers from dimming the whole text container", () => {
    expect(resolveDividerStyles({ dividerStyle: "subtle", accentColor: "#2563eb", textColor: "#0f172a" })).toEqual({
      borderBottomWidth: 1,
      borderBottomColor: "#0f172a",
    });
  });
});
