import { useState, Suspense, lazy, useEffect, useRef } from "react";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { ZoomIn, ZoomOut, Maximize, LayoutTemplate } from "lucide-react";
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
  const { t } = useTranslation("diagnosis");

  const resumeData = store.getResumeData();
  const resumeDataKey = JSON.stringify(resumeData);
  const template = resolveBuilderTemplate(store.template);

  const debouncedData = useDebounce(resumeData, 800, resumeDataKey);

  const [scale, setScale] = useState(1);

  const isEmpty = store.getCompletionPercent() === 0;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* A4 Page container */}
      <div className="flex-1 overflow-auto bg-slate-800 relative custom-scrollbar shadow-inner">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-10 max-w-[420px] shadow-2xl text-center">
              <div className="w-20 h-20 bg-slate-800 border-2 border-dashed border-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 shadow-inner">
                <LayoutTemplate className="w-10 h-10 text-slate-500 -rotate-3" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {t("builder.previewEmptyTitle", { defaultValue: "Bản xem trước CV" })}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium mb-6">
                {t("builder.previewEmpty", { defaultValue: "Bản xem trước sẽ xuất hiện ở đây khi bạn bắt đầu điền thông tin vào các mục bên trái." })}
              </p>
              <div className="flex flex-col gap-2 opacity-30">
                <div className="h-2 bg-slate-500 rounded-full w-full" />
                <div className="h-2 bg-slate-500 rounded-full w-4/5 mx-auto" />
                <div className="h-2 bg-slate-500 rounded-full w-2/3 mx-auto" />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-full py-12 px-4 flex justify-center w-full" style={{ transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease-out" }}>
            <Suspense fallback={
              <div className="w-[794px] h-[1123px] bg-white shadow-2xl flex items-center justify-center relative overflow-hidden ring-1 ring-black/5">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 animate-pulse">
                    {t("builder.previewLoadingEngine", { defaultValue: "Đang khởi tạo studio..." })}
                  </p>
                </div>
              </div>
            }>
              <PdfRendererWrapper data={debouncedData} template={template} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      {!isEmpty && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#18181b] text-zinc-300 backdrop-blur-md rounded-full px-3 py-1.5 border border-zinc-800 shadow-2xl z-20">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-[11px] font-semibold w-12 text-center text-zinc-300">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onClick={() => setScale(1)}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
