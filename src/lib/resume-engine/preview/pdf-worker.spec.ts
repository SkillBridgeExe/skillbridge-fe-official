import { describe, expect, it } from "vitest";
import { withPdfWorkerCacheKey } from "./pdf-worker";

describe("withPdfWorkerCacheKey", () => {
	it("adds a stable cache key so browsers refetch the pdf.js worker after MIME fixes", () => {
		const url = withPdfWorkerCacheKey("https://www.skillbridgebuilder.com/assets/pdf.worker.min-Dtn11Elq.mjs");

		expect(url).toBe("https://www.skillbridgebuilder.com/assets/pdf.worker.min-Dtn11Elq.mjs?v=mjs-mime-20260708");
	});

	it("preserves existing worker query params", () => {
		const url = withPdfWorkerCacheKey("https://www.skillbridgebuilder.com/assets/pdf.worker.min-Dtn11Elq.mjs?x=1");

		expect(url).toBe("https://www.skillbridgebuilder.com/assets/pdf.worker.min-Dtn11Elq.mjs?x=1&v=mjs-mime-20260708");
	});
});
