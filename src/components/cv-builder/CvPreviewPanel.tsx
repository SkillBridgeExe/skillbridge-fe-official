import { useState, Suspense, lazy, useEffect, useRef, useMemo, useCallback, MouseEvent as ReactMouseEvent } from "react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { ZoomIn, ZoomOut, Maximize, Minimize, LayoutTemplate, ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resolveBuilderTemplate } from "./preview/TemplatePicker";
import { PAGE_CSS_SIZE, type PageCssFormat } from "@resume-engine/preview/preview.shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number, stableKey: string): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const latestValueRef = useRef(value);

  latestValueRef.current = value;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(latestValueRef.current);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [delay, stableKey]);

  return debouncedValue;
}

// Lazy load the PDF Renderer to save 9MB from the main bundle
const PdfRendererWrapper = lazy(() => import("./preview/PdfRendererWrapper"));

export function CvPreviewPanel() {
  const store = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  const resumeData = store.getResumeData();
  const template = resolveBuilderTemplate(store.template);

  // W105: Memoize the serialized key so JSON.stringify only runs when the
  // reference object changes, and the debounce stableKey only updates when
  // the serialised content is actually different from the previous render.
  const dataSeqRef = useRef(0);
  const prevKeyRef = useRef<string>("");
  const resumeDataKey = useMemo(() => {
    const key = JSON.stringify(resumeData);
    if (key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      dataSeqRef.current += 1;
    }
    return String(dataSeqRef.current);
  }, [resumeData]);

  const debouncedData = useDebounce(resumeData, 800, resumeDataKey);

  // Size the zoom/pan wrapper from the document's real page format — the canvas
  // renders at the page's CSS-pixel size, and a mismatched fixed box clips the
  // page edges symmetrically (the "CV bị cắt hai mép" bug).
  const pageFormat: PageCssFormat =
    debouncedData?.metadata?.page?.format === "letter" ? "letter" : "a4";
  const pageCss = PAGE_CSS_SIZE[pageFormat];

  const [scale, setScale] = useState(0.75);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Panning Logic ---
  const [isPanning, setIsPanning] = useState(false);
  const panningInfo = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const handleMouseDown = (e: ReactMouseEvent) => {
    // Only pan on left click (0) or middle click (1)
    if (e.button !== 0 && e.button !== 1) return;
    if (!scrollContainerRef.current) return;
    
    setIsPanning(true);
    panningInfo.current = {
      startX: e.pageX,
      startY: e.pageY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop
    };
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - panningInfo.current.startX;
    const dy = e.pageY - panningInfo.current.startY;
    scrollContainerRef.current.scrollLeft = panningInfo.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panningInfo.current.scrollTop - dy;
  };

  const handleMouseUpOrLeave = () => {
    if (isPanning) setIsPanning(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleFitWidth = useCallback(() => {
    if (containerRef.current) {
      const padding = 32; // px-4 = 16px * 2
      const availableWidth = containerRef.current.clientWidth - padding;
      const newScale = availableWidth / pageCss.width;
      setScale(Math.max(0.2, Math.min(newScale, 2)));
    }
  }, [pageCss]);

  const handleFitPage = useCallback(() => {
    if (containerRef.current) {
      const paddingY = 96; // py-12 = 48px * 2
      const availableHeight = containerRef.current.clientHeight - paddingY;
      const newScale = availableHeight / pageCss.height;
      setScale(Math.max(0.2, Math.min(newScale, 2)));
    }
  }, [pageCss]);

  useEffect(() => {
    // Initial fit on mount; re-fits when the page format (A4/Letter) changes.
    const timer = setTimeout(() => {
      handleFitPage();
    }, 50);

    const onResize = () => handleFitPage();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [handleFitPage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const isEmpty = store.getCompletionPercent() === 0;

  return (
    <div className="flex flex-col h-full w-full relative bg-[#f3f4f6]" ref={containerRef}>
      {/* A4 Page container */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-auto relative custom-scrollbar shadow-inner",
          isPanning ? "cursor-grabbing select-none" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* Canvas Area */}

        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-[420px] shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-400 -rotate-3" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t("builder.previewEmptyTitle")}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">
                {t("builder.previewEmpty")}
              </p>
              <div className="flex flex-col gap-2 opacity-40">
                <div className="h-2 bg-slate-200 rounded-full w-full" />
                <div className="h-2 bg-slate-200 rounded-full w-4/5 mx-auto" />
                <div className="h-2 bg-slate-200 rounded-full w-2/3 mx-auto" />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-full py-12 px-4 flex justify-center w-full relative">
            <div
              style={{
                width: `${pageCss.width * scale}px`,
                height: `${(store.renderedPageCount || 1) * pageCss.height * scale + ((store.renderedPageCount || 1) - 1) * 32 * scale}px`, // approximate height including gap
                transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), height 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              className="relative shrink-0"
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  width: `${pageCss.width}px`
                }}
                className="absolute top-0 left-0"
              >
              <Suspense fallback={
                <div className="w-[794px] h-[1123px] bg-white shadow-2xl flex items-center justify-center relative overflow-hidden ring-1 ring-slate-900/5 rounded-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
                  <div className="relative flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative shadow-sm">
                      <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
                      <LayoutTemplate className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 animate-pulse">
                      {t("builder.previewLoadingEngine")}
                    </p>
                  </div>
                </div>
              }>
                <div className="shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden">
                  <PdfRendererWrapper data={debouncedData} template={template} />
                </div>
              </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      {!isEmpty && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#18181b]/95 backdrop-blur-md rounded-full px-3 py-1.5 border border-zinc-700/50 shadow-2xl z-20">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.max(0.2, s - 0.1))} title={t("builder.previewZoomOut")} aria-label={t("builder.previewZoomOut")}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-[11px] font-semibold w-12 text-center text-zinc-300 select-none cursor-pointer hover:text-white" onClick={() => setScale(1)} title={t("builder.previewResetZoom")}>{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.min(2, s + 0.1))} title={t("builder.previewZoomIn")} aria-label={t("builder.previewZoomIn")}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleFitWidth} title={t("builder.previewFitWidth")} aria-label={t("builder.previewFitWidth")}>
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleFitPage} title={t("builder.previewFitPage")} aria-label={t("builder.previewFitPage")}>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <div className="text-[11px] font-semibold text-zinc-300 select-none px-2 flex items-center gap-1.5" title={t("builder.previewPageCount", { defaultValue: "Pages" })}>
            <LayoutTemplate className="w-3.5 h-3.5 opacity-50" />
            {store.renderedPageCount || 1}
          </div>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={toggleFullscreen} title={isFullscreen ? t("builder.previewExitFullscreen") : t("builder.previewFullscreen")} aria-label={isFullscreen ? t("builder.previewExitFullscreen") : t("builder.previewFullscreen")}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
