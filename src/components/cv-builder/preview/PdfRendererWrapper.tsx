import { useEffect, useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { createResumePdfBlob } from "@resume-engine/pdf/browser";
import { PdfCanvasDocument, PdfCanvasPage } from "@resume-engine/preview/pdf-canvas";
import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { Template } from "@resume-engine/schema/templates";
import { useTranslation } from "react-i18next";

export interface PdfRendererWrapperProps {
  data: ResumeData;
  template: Template;
  format?: "a4" | "letter";
}

export default function PdfRendererWrapper({ data, template }: PdfRendererWrapperProps) {
  const { t, i18n } = useTranslation("diagnosis");
  const isVi = i18n.language.startsWith("vi");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const blob = await createResumePdfBlob({ data, template });
        if (!cancelled) {
          setPdfBlob(blob);
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsRendering(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [data, template]);

  if (error && !pdfBlob) {
    return (
      <div className="w-[794px] h-[1123px] bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden shrink-0">
        <div className="relative bg-white border border-red-100 rounded-2xl p-8 max-w-[420px] shadow-sm text-center">
          <div className="w-14 h-14 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5 transform -rotate-3">
            <AlertCircle className="w-6 h-6 text-red-500 rotate-3" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">
            {t("builder.previewErrorTitle", { defaultValue: "Lỗi hiển thị bản xem trước" })}
          </h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            {t("builder.previewErrorDesc", { defaultValue: "CV đang gặp lỗi định dạng. Vui lòng kiểm tra lại thông tin vừa nhập." })}
          </p>
          <details className="text-left mb-6 group">
            <summary className="text-[11px] font-semibold text-slate-500 cursor-pointer hover:text-slate-700 outline-none select-none">
              {isVi ? "Chi tiết kỹ thuật" : "Technical details"}
            </summary>
            <div className="mt-2 bg-red-50 p-3 rounded-lg text-[10px] text-red-600 font-mono w-full overflow-auto max-h-32 border border-red-100/50 custom-scrollbar">
              {error}
            </div>
          </details>
          <button 
            onClick={() => {
              setError(null);
              setIsRendering(true);
              createResumePdfBlob({ data, template })
                .then(setPdfBlob)
                .catch(err => setError(err instanceof Error ? err.message : String(err)))
                .finally(() => setIsRendering(false));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isVi ? "Thử lại" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (!pdfBlob) {
    return (
      <div className="w-[794px] h-[1123px] bg-white shadow-md flex items-center justify-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
            <Loader2 className="w-5 h-5 text-primary animate-spin opacity-0" />
          </div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            {t("builder.previewLoadingEngine", { defaultValue: "Đang tải dữ liệu..." })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      {isRendering && !error && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-3 py-1.5 pointer-events-none">
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {t("builder.previewUpdating", { defaultValue: "Đang cập nhật..." })}
          </span>
        </div>
      )}
      {error && pdfBlob && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-amber-50/95 backdrop-blur-sm border border-amber-200 shadow-sm rounded-full px-3 py-1.5 pointer-events-none">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
            {isVi ? "Lỗi tạm thời" : "Temporary error"}
          </span>
        </div>
      )}
      <PdfCanvasDocument 
        file={pdfBlob} 
        onLoadSuccess={() => {}}
      >
        {(doc) => (
          <div className="flex flex-col gap-8 items-center">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <div key={i + 1} className="relative bg-white shadow-md overflow-hidden ring-1 ring-slate-900/5 shrink-0">
                <PdfCanvasPage
                  document={doc}
                  pageNumber={i + 1}
                  pageScale={1.5}
                  totalPages={doc.numPages}
                  showPageNumbers={false}
                  onLoadSuccess={() => {}}
                />
              </div>
            ))}
          </div>
        )}
      </PdfCanvasDocument>
    </div>
  );
}
