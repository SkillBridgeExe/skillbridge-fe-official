import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { Template } from "@resume-engine/schema/templates";
import { Check, Info, LayoutTemplate, X } from "lucide-react";
import { TEMPLATE_PREVIEWS, getTemplateCapabilities } from "@/lib/resume-engine/template-meta";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sampleResumeData } from "@/lib/resume-engine/schema/resume/sample";

export const BUILDER_TEMPLATES: Template[] = [
  "azurill", "bronzor", "chikorita", "ditgar", "ditto",
  "gengar", "glalie", "kakuna", "lapras", "leafish",
  "meowth", "onyx", "pikachu", "rhyhorn", "scizor"
];

export function resolveBuilderTemplate(template: string): Template {
  return BUILDER_TEMPLATES.includes(template as Template) ? (template as Template) : "azurill";
}

const TEMPLATE_CATEGORY_ALL = "__all";

export function StaticTemplateThumbnail({ template, className }: { template: string; className?: string }) {
  const resolvedTemplate = resolveBuilderTemplate(template);
  const meta = TEMPLATE_PREVIEWS[resolvedTemplate];
  
  return (
    <div className={cn("relative overflow-hidden rounded-md border border-slate-200/50 shadow-sm bg-slate-50", className)}>
      <img 
        src={meta.thumbnailUrl} 
        alt={`${meta.name} preview`} 
        className="h-full w-full object-cover bg-white animate-in fade-in duration-300"
        loading="lazy"
      />
    </div>
  );
}

// Live preview for the dialog - renders one at a time and properly revokes blob URLs
export function LivePdfPreview({ template, className }: { template: string; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    
    const render = async () => {
      try {
        const resolvedTemplate = resolveBuilderTemplate(template);
        const meta = TEMPLATE_PREVIEWS[resolvedTemplate];
        
        const data = JSON.parse(JSON.stringify(sampleResumeData));
        if (!data.metadata) data.metadata = {} as any;
        if (!data.metadata.design) data.metadata.design = {} as any;
        if (!data.metadata.design.colors) data.metadata.design.colors = {} as any;
        data.metadata.design.colors.primary = meta.accent;

        const [{ createResumePdfBlob }, { createPdfFirstPageImageUrl }] = await Promise.all([
          import("@resume-engine/pdf/browser"),
          import("@/lib/resume-engine/preview/pdf-thumbnail"),
        ]);
        const blob = await createResumePdfBlob({ data, template: resolvedTemplate });
        const url = await createPdfFirstPageImageUrl(blob, 1200); // High res for dialog
        if (!cancelled) {
          currentUrl = url;
          setImageUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("Failed to render live preview for", template, err);
      }
    };
    render();

    return () => { 
      cancelled = true; 
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [template]);

  return (
    <div className={cn("relative overflow-hidden rounded-md border border-slate-200/50 shadow-sm bg-slate-50", className)}>
      {imageUrl ? (
        <img src={imageUrl} alt={`${template} live preview`} className="w-full h-full object-cover bg-white animate-in fade-in duration-300" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
        </div>
      )}
    </div>
  );
}

export function TemplateGallery() {
  const store = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");
  const currentTemplate = resolveBuilderTemplate(store.template);
  const [selectedCategory, setSelectedCategory] = useState<string>(TEMPLATE_CATEGORY_ALL);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Extract all unique tags for categories
  const categories = useMemo(() => {
    const tags = new Set<string>();
    BUILDER_TEMPLATES.forEach(t => {
      TEMPLATE_PREVIEWS[t].tags.forEach(tag => tags.add(tag));
    });
    return [TEMPLATE_CATEGORY_ALL, ...Array.from(tags).sort()];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === TEMPLATE_CATEGORY_ALL) return BUILDER_TEMPLATES;
    return BUILDER_TEMPLATES.filter(tmpl =>
      TEMPLATE_PREVIEWS[tmpl].tags.includes(selectedCategory)
    );
  }, [selectedCategory]);

  return (
    <div className="flex flex-col h-full">
      {/* Category Filters */}
      <div className="flex items-center gap-2 pb-4 overflow-x-auto custom-scrollbar shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat === TEMPLATE_CATEGORY_ALL ? t("builder.templateCategory.all") : t(`builder.templateTag.${cat}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-1 pb-8">
        {filteredTemplates.map((template) => {
          const meta = TEMPLATE_PREVIEWS[template];
          const isSelected = currentTemplate === template;

          return (
            <button
              key={template}
              onClick={() => setPreviewTemplate(template)}
              className={cn(
                "group relative flex flex-col text-left rounded-[20px] bg-white transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] -translate-y-1"
                  : "ring-1 ring-slate-200/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:ring-slate-300 hover:-translate-y-1"
              )}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 z-20 flex h-6 w-auto px-2.5 items-center justify-center rounded-full bg-primary text-white shadow-md animate-in zoom-in duration-200 gap-1.5">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t("builder.templateCurrent")}</span>
                </div>
              )}

              <div className={cn(
                "relative flex w-full h-[240px] items-center justify-center overflow-hidden rounded-t-[20px] transition-colors duration-300",
                isSelected 
                  ? "bg-gradient-to-b from-primary/5 to-transparent" 
                  : "bg-gradient-to-b from-slate-50/40 to-slate-100/60 group-hover:from-slate-50 group-hover:to-slate-100/80"
              )}>
                <StaticTemplateThumbnail
                  template={template}
                  className={cn(
                    "relative z-10 w-[140px] h-[198px] transition-transform duration-300 ease-out shadow-sm origin-center",
                    isSelected ? "scale-[1.05]" : "group-hover:scale-[1.05]"
                  )}
                />
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="text-base font-semibold tracking-tight text-slate-900 group-hover:text-primary transition-colors">
                  {meta.name}
                </div>
                <p className="mt-1 line-clamp-2 min-h-[40px] text-[13px] leading-relaxed text-slate-500">
                  {t(`builder.template.${template}.desc`)}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 overflow-hidden max-h-[24px]">
                  {meta.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition-colors group-hover:bg-slate-200/70"
                    >
                      {t(`builder.templateTag.${tag}`)}
                    </span>
                  ))}
                  {meta.tags.length > 3 && (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                      +{meta.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-[480px]">
          {previewTemplate && (() => {
            const meta = TEMPLATE_PREVIEWS[previewTemplate];
            const isCurrent = currentTemplate === previewTemplate;
            const isAtsFriendly = meta.tags.includes("ATS");
            const caps = getTemplateCapabilities(previewTemplate);
            const capabilityItems = [
              { key: "twoColumn", ok: caps.supportsTwoColumn },
              { key: "avatar", ok: caps.supportsAvatar },
              { key: "customSections", ok: caps.supportsCustomSections },
              { key: "multiPage", ok: caps.supportsMultiPage },
              { key: "sidebarPosition", ok: caps.supportsSidebarPosition },
            ];
            // Settings the user has actually configured that this template
            // cannot show — they are kept in the document, just inactive.
            const retainedInactive =
              (!!store.photoUrl && !caps.supportsAvatar) ||
              (store.customSections.length > 0 && !caps.supportsCustomSections) ||
              (store.resumeSidebarPosition === "right" && !caps.supportsSidebarPosition) ||
              (!caps.supportsSidebar && Object.values(store.sectionPlacement).some(Boolean));

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                    {meta.name}
                  </DialogTitle>
                  <DialogDescription>
                    {t(`builder.template.${previewTemplate}.desc`)}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center bg-gradient-to-b from-slate-50/40 to-white">
                  <div className="relative w-[320px] h-[452px] bg-white rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-slate-900/5 flex items-center justify-center overflow-hidden">
                    <LivePdfPreview template={previewTemplate} className="w-full h-full shadow-none border-none" />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-[85%]">
                    {meta.tags.map(tag => (
                      <span key={tag} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[11px] font-medium transition-colors">
                        {t(`builder.templateTag.${tag}`)}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-[90%]">
                    {capabilityItems.map(({ key, ok }) => (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                          ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400 line-through decoration-slate-300",
                        )}
                      >
                        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {t(`builder.templateCapability.${key}`)}
                      </span>
                    ))}
                  </div>

                  {retainedInactive && (
                    <Alert className="mt-4 bg-slate-50 border-slate-200 text-slate-600">
                      <Info className="h-4 w-4 text-slate-500" />
                      <AlertDescription className="text-xs ml-2">
                        {t("builder.templateKeepsSettings")}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!isAtsFriendly && (
                    <Alert className="mt-6 bg-amber-50 border-amber-200 text-amber-800">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs ml-2">
                        {t("builder.templateAtsWarning")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <DialogFooter className="sm:justify-between items-center border-t border-slate-100 pt-4 mt-2">
                  <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>
                    {t("builder.cancel")}
                  </Button>
                  <Button
                    disabled={isCurrent}
                    onClick={() => {
                      store.setTemplate(previewTemplate);
                      setPreviewTemplate(null);
                    }}
                  >
                    {isCurrent ? t("builder.templateCurrent") : t("builder.applyTemplate")}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
