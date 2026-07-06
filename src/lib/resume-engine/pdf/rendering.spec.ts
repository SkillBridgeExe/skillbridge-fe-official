import { describe, expect, it } from "vitest";
import { hasTemplatePicture } from "./templates/shared/picture";
import { resolveSectionTitle } from "./section-title";
import { isVisibleSummary } from "./templates/shared/filtering";
import { normalizeRichTextHtml } from "./templates/shared/rich-text-html";

describe("resume PDF runtime guards", () => {
	it("falls back when a legacy section title is missing", () => {
		expect(
			resolveSectionTitle(
				undefined as unknown as string,
				{
					sectionId: "summary",
					locale: "vi-VN",
					sectionKind: "summary",
					defaultEnglishTitle: "Summary",
				},
				undefined,
				"Tóm tắt",
			),
		).toBe("Tóm tắt");
	});

	it("treats a missing picture URL as no picture instead of throwing", () => {
		expect(
			hasTemplatePicture({
				hidden: false,
				url: undefined,
			} as never),
		).toBe(false);
	});

	it("treats missing summary content as hidden instead of throwing", () => {
		expect(
			isVisibleSummary({
				hidden: false,
				content: undefined,
			} as never),
		).toBe(false);
	});

	it("normalizes missing rich text as empty content instead of throwing", () => {
		expect(normalizeRichTextHtml(undefined as never)).toBe("");
	});
});
