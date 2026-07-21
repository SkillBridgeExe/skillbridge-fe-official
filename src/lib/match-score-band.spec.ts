import { describe, expect, it } from "vitest";
import { matchScoreBand } from "./match-score-band";

describe("matchScoreBand", () => {
  it("returns strong for scores >= 80", () => {
    expect(matchScoreBand(80).band).toBe("strong");
    expect(matchScoreBand(100).band).toBe("strong");
    expect(matchScoreBand(95).band).toBe("strong");
  });

  it("returns moderate for scores >= 60 and < 80", () => {
    expect(matchScoreBand(60).band).toBe("moderate");
    expect(matchScoreBand(79).band).toBe("moderate");
    expect(matchScoreBand(70).band).toBe("moderate");
  });

  it("returns low for scores < 60", () => {
    expect(matchScoreBand(59).band).toBe("low");
    expect(matchScoreBand(0).band).toBe("low");
    expect(matchScoreBand(30).band).toBe("low");
  });

  it("returns correct i18n keys", () => {
    expect(matchScoreBand(85).i18nKey).toBe("match.band.strong");
    expect(matchScoreBand(65).i18nKey).toBe("match.band.moderate");
    expect(matchScoreBand(40).i18nKey).toBe("match.band.low");
  });

  it("returns emerald stroke for strong", () => {
    expect(matchScoreBand(90).stroke).toBe("#10B981");
  });

  it("returns amber stroke for moderate", () => {
    expect(matchScoreBand(65).stroke).toBe("#F59E0B");
  });

  it("returns red stroke for low", () => {
    expect(matchScoreBand(30).stroke).toBe("#EF4444");
  });
});
