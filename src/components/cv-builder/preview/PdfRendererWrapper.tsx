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
      <div className="w-[794px] h-[1123px] bg-white shadow-sm flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-red-200 shrink-0">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <span className="text-red-600 font-bold">!</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          {t("builder.previewErrorTitle", { defaultValue: "Không thể hiển thị bản xem trước" })}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {t("builder.previewErrorDesc", { defaultValue: "Vui lòng kiểm tra nội dung CV hoặc thử lại sau." })}
        </p>
        <div className="bg-slate-50 p-4 rounded-md text-xs text-red-600 font-mono text-left w-full overflow-auto max-h-32">
          {error}
        </div>
      </div>
    );
  }

  if (!pdfBlob) {
    return (
      <div className="w-[794px] h-[1123px] bg-white shadow-sm flex items-center justify-center shrink-0">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
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
