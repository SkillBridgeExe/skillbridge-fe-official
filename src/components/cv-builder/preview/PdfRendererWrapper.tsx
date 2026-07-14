import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { createResumePdfBlob } from "@resume-engine/pdf/browser";
import { PdfCanvasDocument, PdfCanvasPage } from "@resume-engine/preview/pdf-canvas";
import { PDF_POINT_TO_CSS_PX } from "@resume-engine/preview/preview.shared";
import { PdfErrorBoundary } from "./PdfErrorBoundary";
import type { ResumeData } from "@resume-engine/schema/resume/data";
import type { Template } from "@resume-engine/schema/templates";
import { useTranslation } from "react-i18next";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { captureStudioEvent } from "@/lib/studio-telemetry";
import { cn } from "@/lib/utils";

export interface PdfRendererWrapperProps {
  data: ResumeData;
  template: Template;
  format?: "a4" | "letter";
}

function NativePdfFallback({ blob, title }: { blob: Blob; title: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  if (!url) return null;

  return (
    <iframe
      src={url}
      title={title}
      className="h-[1123px] w-[794px] border-0 bg-white shadow-md"
    />
  );
}

export default function PdfRendererWrapper({ data, template }: PdfRendererWrapperProps) {
  const { t } = useTranslation("diagnosis");
  const [layers, setLayers] = useState<{ id: string; blob: Blob; seq: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [canvasFailedLayerIds, setCanvasFailedLayerIds] = useState<Set<string>>(() => new Set());
  const renderedPagesRef = useRef<Record<string, Set<number>>>({});
  // Overflow honesty: only the NEWEST layer may report its page count — a
  // slower older layer finishing late must not overwrite a fresher count.
  const layerSeqRef = useRef(0);
  const reportedSeqRef = useRef(0);

  const reportPageCount = (seq: number, count: number | null) => {
    if (seq < reportedSeqRef.current) return;
    reportedSeqRef.current = seq;
    useCvBuilderStore.getState().setRenderedPageCount(count);
  };

  // One chokepoint for all preview failure paths (blob render, canvas load):
  // the error message itself is prose and stays out of telemetry.
  useEffect(() => {
    if (error) {
      captureStudioEvent("preview_render", { outcome: "failure", errorCode: "preview_error", templateId: template });
    }
  }, [error, template]);

  useEffect(() => {
    // Leaving the preview invalidates the count — a stale number would keep
    // the Pages-panel overflow warning arguing about a PDF nobody can see.
    return () => useCvBuilderStore.getState().setRenderedPageCount(null);
  }, []);

  const handleLayerReady = (id: string) => {
    // Wait a brief moment for the canvas to paint the page
    setTimeout(() => {
      setLayers((prev) => {
        const index = prev.findIndex((l) => l.id === id);
        if (index > 0) {
          // Keep this layer and any newer ones, discarding older active layers
          return prev.slice(index);
        }
        return prev;
      });
    }, 50);
  };

  const handlePageRendered = (layerId: string, pageNumber: number, totalPages: number) => {
    if (!renderedPagesRef.current[layerId]) {
      renderedPagesRef.current[layerId] = new Set();
    }
    renderedPagesRef.current[layerId].add(pageNumber);

    if (renderedPagesRef.current[layerId].size === totalPages) {
      handleLayerReady(layerId);
      // Cleanup old layer tracking
      Object.keys(renderedPagesRef.current).forEach((key) => {
        if (key !== layerId) delete renderedPagesRef.current[key];
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const blob = await createResumePdfBlob({ data, template });
        if (!cancelled) {
          setLayers((prev) => {
            const newLayer = {
              id: Date.now().toString() + Math.random().toString(36).substring(2),
              blob,
              seq: ++layerSeqRef.current,
            };
            if (prev.length === 0) return [newLayer];
            // Keep at most the current active layer and the new pending one
            return [prev[0], newLayer];
          });
          setCanvasFailedLayerIds(new Set());
          setIsRendering(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsRendering(false);
          // The preview no longer reflects the current document — an overflow
          // warning computed from the previous render would be a lie.
          reportPageCount(++layerSeqRef.current, null);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [data, template]);

  if (error && layers.length === 0) {
    return (
      <div className="w-[794px] h-[1123px] bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden shrink-0">
        <div className="relative bg-white border border-red-100 rounded-2xl p-8 max-w-[420px] shadow-sm text-center">
          <div className="w-14 h-14 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5 transform -rotate-3">
            <AlertCircle className="w-6 h-6 text-red-500 rotate-3" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">
            {t("builder.previewErrorTitle")}
          </h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            {t("builder.previewErrorDesc")}
          </p>
          <details className="text-left mb-6 group">
            <summary className="text-[11px] font-semibold text-slate-500 cursor-pointer hover:text-slate-700 outline-none select-none">
              {t("builder.previewTechnicalDetails")}
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
                .then((blob) => {
                  setLayers([{ id: Date.now().toString(), blob, seq: ++layerSeqRef.current }]);
                })
                .catch(err => setError(err instanceof Error ? err.message : String(err)))
                .finally(() => setIsRendering(false));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t("builder.previewRetry")}
          </button>
        </div>
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <div className="w-[794px] h-[1123px] bg-white shadow-md flex items-center justify-center relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
            <Loader2 className="w-5 h-5 text-primary animate-spin opacity-0" />
          </div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            {t("builder.previewLoadingEngine")}
          </p>
        </div>
      </div>
    );
  }

  // W105: derive a "still updating" signal that covers both blob generation
  // and the period while the canvas pages of a new layer paint.
  const hasPendingLayer = layers.length > 1;
  const isUpdating = (isRendering || hasPendingLayer) && !error;

  return (
    <div className="relative shrink-0">
      {/* W105: Always-rendered updating badge — uses opacity transition for
          smooth fade-in/fade-out instead of hard mount/unmount. */}
      <div
        className={cn(
          "absolute top-4 right-4 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-3 py-1.5 pointer-events-none transition-opacity duration-300",
          isUpdating ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isUpdating}
      >
        {/* spin only while visible — a perpetual animation on the hidden badge
            would keep the compositor busy for nothing */}
        <Loader2 className={cn("w-3.5 h-3.5 text-slate-400", isUpdating && "animate-spin")} />
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
          {t("builder.previewUpdating")}
        </span>
      </div>
      {error && layers.length > 0 && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-amber-50/95 backdrop-blur-sm border border-amber-200 shadow-sm rounded-full px-3 py-1.5 pointer-events-none">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">
            {t("builder.previewTemporaryError")}
          </span>
        </div>
      )}

      {layers.map((layer, index) => {
        const isActive = index === 0;
        const isPending = index > 0;
        return (
          <div
            key={layer.id}
            className={
              isActive
                ? cn(
                    "relative transition-opacity duration-300",
                    // W105: Subtle dimming when a newer layer is painting —
                    // signals "update in progress" without hiding content.
                    hasPendingLayer ? "opacity-[0.92]" : "opacity-100"
                  )
                : "absolute top-0 left-0 right-0 opacity-0 pointer-events-none"
            }
            aria-hidden={isPending ? "true" : "false"}
          >
              <PdfErrorBoundary>
              {canvasFailedLayerIds.has(layer.id) ? (
                <NativePdfFallback blob={layer.blob} title={t("builder.previewFallbackTitle")} />
              ) : (
                <PdfCanvasDocument
                  file={layer.blob}
                  onLoadError={(loadError) => {
                    setError(loadError instanceof Error ? loadError.message : String(loadError));
                    setCanvasFailedLayerIds((prev) => new Set(prev).add(layer.id));
                    reportPageCount(layer.seq, null);
                    if (isPending) {
                      setLayers((prev) => prev.filter((item) => item.id !== layer.id));
                    }
                  }}
                  onLoadSuccess={(doc) => {
                    // Overflow honesty: the Pages panel compares the real
                    // rendered page count against the planned page count.
                    reportPageCount(layer.seq, doc.numPages);
                  }}
                >
                {(doc) => (
                  <div className="flex flex-col gap-8 items-center">
                    {Array.from({ length: doc.numPages }, (_, i) => (
                      <div key={i + 1} className="relative bg-white shadow-md overflow-hidden ring-1 ring-slate-900/5 shrink-0">
                        <PdfCanvasPage
                          document={doc}
                          pageNumber={i + 1}
                          pageScale={PDF_POINT_TO_CSS_PX}
                          totalPages={doc.numPages}
                          showPageNumbers={false}
                          onLoadSuccess={() => {}}
                          onRenderSuccess={() => {
                            if (isPending) {
                              handlePageRendered(layer.id, i + 1, doc.numPages);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                </PdfCanvasDocument>
              )}
            </PdfErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}
