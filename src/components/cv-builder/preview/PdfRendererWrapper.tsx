import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
  const { t } = useTranslation("diagnosis");
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

  if (error) {
    return (
      <div className="w-[794px] h-[1123px] bg-white shadow-md flex items-center justify-center p-8 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-red-50/50" />
        <div className="relative bg-white border border-red-100 rounded-2xl p-10 max-w-[420px] shadow-sm text-center">
          <div className="w-16 h-16 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3">
            <span className="text-red-500 font-bold text-2xl rotate-3">!</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            {t("builder.previewErrorTitle", { defaultValue: "Lỗi kết xuất bản xem trước" })}
          </h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            {t("builder.previewErrorDesc", { defaultValue: "Đã xảy ra lỗi khi tạo bản xem trước. Vui lòng kiểm tra lại nội dung CV." })}
          </p>
          <div className="bg-red-50 p-4 rounded-xl text-[11px] text-red-600 font-mono text-left w-full overflow-auto max-h-32 border border-red-100/50 custom-scrollbar">
            {error}
          </div>
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
      {isRendering && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
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
