import { describe, expect, it } from "vitest";
import { shouldUseSectionTimeline } from "./columns";

describe("shouldUseSectionTimeline", () => {
	it("uses timeline only for one-column main placements", () => {
		expect(shouldUseSectionTimeline({ sectionTimeline: true, placement: "main", columns: 1 })).toBe(true);
		expect(shouldUseSectionTimeline({ sectionTimeline: true, placement: "sidebar", columns: 1 })).toBe(false);
		expect(shouldUseSectionTimeline({ sectionTimeline: true, placement: "main", columns: 2 })).toBe(false);
		expect(shouldUseSectionTimeline({ sectionTimeline: false, placement: "main", columns: 1 })).toBe(false);
	});

	it("turns off timeline decoration when ATS-safe decoration simplification is enabled", () => {
		expect(
			shouldUseSectionTimeline({
				sectionTimeline: true,
				placement: "main",
				columns: 1,
				simplifyDecorations: true,
			}),
		).toBe(false);
	});
});
