import { useState, Suspense, lazy, useEffect, useRef } from "react";
import { useCvBuilderStore, type CvLanguage } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2, ZoomIn, ZoomOut, Maximize, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CV_CONTENT_LABELS } from "@/constants/cv-content-labels";
import { resolveBuilderTemplate, TemplatePicker } from "./preview/TemplatePicker";
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
  const L = CV_CONTENT_LABELS[store.cvLanguage];

  const resumeData = store.getResumeData();
  const resumeDataKey = JSON.stringify(resumeData);
  const template = resolveBuilderTemplate(store.template);

  const debouncedData = useDebounce(resumeData, 800, resumeDataKey);

  const [scale, setScale] = useState(1);

  const isEmpty = store.getCompletionPercent() === 0;

  return (
    <div className="flex flex-col h-full w-full max-w-[900px] mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <TemplatePicker />
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as CvLanguage)}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="vi">Vietnamese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview Controls */}
        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium w-10 text-center text-slate-600">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-600" onClick={() => setScale(1)}>
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* A4 Page container */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-[#525659] relative custom-scrollbar shadow-inner">
        {isEmpty ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-[360px] shadow-sm text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutTemplate className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                {L.previewTitle}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                {t("builder.previewEmpty", "Start filling out your details in the editor to see the live preview here.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-full py-8 px-4 flex justify-center w-full" style={{ transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.2s ease-out" }}>
            <Suspense fallback={
              <div className="w-[794px] h-[1123px] bg-white shadow-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium text-slate-500">
                    {t("builder.previewLoadingEngine", { defaultValue: "Đang tải trình xem PDF..." })}
                  </p>
                </div>
              </div>
            }>
              <PdfRendererWrapper data={debouncedData} template={template} />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
