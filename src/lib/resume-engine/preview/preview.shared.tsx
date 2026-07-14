import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { CSSProperties } from "react";
import { cn } from "@resume-engine/utils/style";

// DIVERGENCE (README-VENDOR.txt): RR's <Spinner> comes from @reactive-resume/ui,
// the full editor UI kit (not vendored in RE-V0). Inlined minimal replacement.
function Spinner({ className }: { className?: string }) {
	return (
		<svg
			className={cn("animate-spin text-muted-foreground", className)}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
			<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	);
}

export type ResumePreviewProps = {
	className?: string;
	data?: ResumeData;
	pageGap?: CSSProperties["gap"];
	pageLayout?: "horizontal" | "vertical";
	pageScale?: number;
	pageClassName?: string;
	showPageNumbers?: boolean;
};

export type ResolvedResumePreviewProps = ResumePreviewProps & {
	pageLayout: "horizontal" | "vertical";
	pageScale: number;
	showPageNumbers: boolean;
};

export type PreviewPageSize = {
	height: number;
	width: number;
};

type ResumePreviewLoaderProps = Pick<ResumePreviewProps, "pageClassName" | "showPageNumbers"> & {
	pageCount?: number;
	pageGap?: CSSProperties["gap"];
	pageLayout?: "horizontal" | "vertical";
	pageScale?: number;
};

// Upper bound only — the default render scale follows the actual screen
// density below. A fixed 4x produced ~16.7M-pixel canvas layers, and Chromium's
// compositor hard-hangs (frames stop, rAF never fires, input dies) when an
// overlay portal forces those giant layers to re-layerize — reproduced
// deterministically with any Radix dropdown/dialog next to the PDF preview.
const PDF_PAGE_RENDER_SCALE = 4;
// Mild headroom over 1x screens so slight zoom-ins stay crisp; zoom changes
// re-render at the new pageScale anyway (pdf-canvas effect deps).
const MIN_PREVIEW_RENDER_SCALE = 1.5;
const MAX_PREVIEW_CANVAS_PIXELS = 16_777_216; // 4096 * 4096
// GPU max texture dimension on common hardware — a canvas side above this is
// its own compositor-stall class even when the pixel AREA fits the budget.
const MAX_PREVIEW_CANVAS_DIMENSION = 4_096;
export const DEFAULT_PDF_PAGE_SIZE: PreviewPageSize = {
	height: 841.89,
	width: 595.28,
};

// CSS px per PDF point (96dpi screen / 72dpi PDF). Canvas pages rendered at
// this pageScale get a CSS box equal to the page's true CSS-pixel size —
// pairing any other pageScale with fixed CSS-px page constants clips the
// preview edges (595.28pt × 1.5 = 893px inside a 794px A4 box).
export const PDF_POINT_TO_CSS_PX = 96 / 72;

// Page box per supported format in CSS px (A4 210×297mm, Letter 8.5×11in @96dpi).
// The builder preview sizes its zoom/pan wrapper from these so the canvas is
// never wider than its clipping box.
export const PAGE_CSS_SIZE = {
	a4: { width: 794, height: 1123 },
	letter: { width: 816, height: 1056 },
} as const;
export type PageCssFormat = keyof typeof PAGE_CSS_SIZE;

export const normalizeResumePreviewProps = ({
	pageGap = 16,
	pageLayout = "horizontal",
	pageScale = 1,
	showPageNumbers = false,
	...props
}: ResumePreviewProps): ResolvedResumePreviewProps => ({
	...props,
	pageGap,
	pageLayout,
	pageScale,
	showPageNumbers,
});

export const getPreviewCanvasScale = (width: number, height: number) => {
	const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	// Render at what the screen actually displays (dpr) with mild headroom —
	// the preview is a raster preview; download/print quality comes from the
	// vector PDF, not this canvas.
	const desiredScale = Math.min(
		Math.max(devicePixelRatio, MIN_PREVIEW_RENDER_SCALE),
		PDF_PAGE_RENDER_SCALE,
	);
	const areaScale = Math.sqrt(MAX_PREVIEW_CANVAS_PIXELS / (width * height));
	const dimensionScale = MAX_PREVIEW_CANVAS_DIMENSION / Math.max(width, height);

	return Math.min(desiredScale, areaScale, dimensionScale);
};

export const getScaledPreviewPageSize = (pageSize: PreviewPageSize, pageScale: number): PreviewPageSize => ({
	height: pageSize.height * pageScale,
	width: pageSize.width * pageScale,
});

export const getResumePreviewGapValue = (pageGap: CSSProperties["gap"]) =>
	typeof pageGap === "number" && pageGap !== 0 ? `${pageGap}px` : pageGap;

export const getResumePreviewPageCount = (data?: ResumeData) => Math.max(1, data?.metadata.layout.pages.length ?? 1);

export function ResumePreviewLoader({
	pageCount = 1,
	pageClassName,
	pageGap = 16,
	pageLayout = "horizontal",
	pageScale = 1,
	showPageNumbers = false,
}: ResumePreviewLoaderProps) {
	const pageSize = getScaledPreviewPageSize(DEFAULT_PDF_PAGE_SIZE, pageScale);
	const resolvedPageGap = getResumePreviewGapValue(pageGap);

	return (
		<div
			style={{ "--resume-preview-page-gap": resolvedPageGap } as CSSProperties}
			className={cn(
				"flex justify-start gap-(--resume-preview-page-gap)",
				pageLayout === "horizontal" ? "flex-row items-start" : "flex-col items-center",
			)}
		>
			{Array.from({ length: pageCount }, (_, index) => {
				const pageNumber = index + 1;

				return (
					<figure key={pageNumber} className="shrink-0">
						{showPageNumbers ? (
							<figcaption className="mb-1 font-medium text-[0.625rem] text-muted-foreground">
								Page {pageNumber} of {pageCount}
							</figcaption>
						) : null}

						<div
							role="img"
							aria-label={`Loading resume page ${pageNumber} of ${pageCount}`}
							style={pageSize}
							className={cn("aspect-page overflow-hidden rounded-md bg-white", pageClassName)}
						>
							<Spinner className="size-10" />
						</div>
					</figure>
				);
			})}
		</div>
	);
}
