import { useState, Suspense, lazy, useEffect, useRef } from "react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { ZoomIn, ZoomOut, Maximize, Minimize, LayoutTemplate, ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { resolveBuilderTemplate } from "./preview/TemplatePicker";
import { Button } from "@/components/ui/button";

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
  const { t, i18n } = useTranslation("diagnosis");
  const isVi = i18n.language.startsWith("vi");

  const resumeData = store.getResumeData();
  const resumeDataKey = JSON.stringify(resumeData);
  const template = resolveBuilderTemplate(store.template);

  const debouncedData = useDebounce(resumeData, 800, resumeDataKey);

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleFitWidth = () => {
    if (containerRef.current) {
      const padding = 32; // px-4 = 16px * 2
      const availableWidth = containerRef.current.clientWidth - padding;
      const newScale = availableWidth / 794;
      setScale(Math.max(0.2, Math.min(newScale, 2)));
    }
  };

  const handleFitPage = () => {
    if (containerRef.current) {
      const paddingY = 96; // py-12 = 48px * 2
      const availableHeight = containerRef.current.clientHeight - paddingY;
      const newScale = availableHeight / 1123;
      setScale(Math.max(0.2, Math.min(newScale, 2)));
    }
  };

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
      <div className="flex-1 overflow-auto relative custom-scrollbar shadow-inner">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-[420px] shadow-sm text-center">
              <div className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-400 -rotate-3" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {t("builder.previewEmptyTitle", { defaultValue: "Bản xem trước CV" })}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">
                {t("builder.previewEmpty", { defaultValue: "Bản xem trước sẽ xuất hiện ở đây khi bạn bắt đầu điền thông tin vào các mục bên trái." })}
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
                transform: `scale(${scale})`, 
                transformOrigin: "top center", 
                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)" 
              }}
              className="flex justify-center"
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
                      {t("builder.previewLoadingEngine", { defaultValue: "Đang tải mẫu CV..." })}
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
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      {!isEmpty && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#18181b]/95 backdrop-blur-md rounded-full px-3 py-1.5 border border-zinc-700/50 shadow-2xl z-20">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.max(0.2, s - 0.1))} title={isVi ? "Thu nhỏ" : "Zoom out"}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-[11px] font-semibold w-12 text-center text-zinc-300 select-none cursor-pointer hover:text-white" onClick={() => setScale(1)} title={isVi ? "Về 100%" : "Reset to 100%"}>{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.min(2, s + 0.1))} title={isVi ? "Phóng to" : "Zoom in"}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleFitWidth} title={isVi ? "Vừa chiều ngang" : "Fit width"}>
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={handleFitPage} title={isVi ? "Vừa trang" : "Fit page"}>
            <ArrowUpDown className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={toggleFullscreen} title={isFullscreen ? (isVi ? "Thoát toàn màn hình" : "Exit fullscreen") : (isVi ? "Toàn màn hình" : "Fullscreen")}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
