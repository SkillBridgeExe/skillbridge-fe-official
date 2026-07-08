import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { Template } from "@resume-engine/schema/templates";
import { Check, Info, LayoutTemplate } from "lucide-react";
import { TEMPLATE_PREVIEWS } from "@/lib/resume-engine/template-meta";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BUILDER_TEMPLATES: Template[] = [
  "azurill", "bronzor", "chikorita", "ditgar", "ditto",
  "gengar", "glalie", "kakuna", "lapras", "leafish",
  "meowth", "onyx", "pikachu", "rhyhorn", "scizor"
];

export function resolveBuilderTemplate(template: string): Template {
  return BUILDER_TEMPLATES.includes(template as Template) ? (template as Template) : "azurill";
}

const TEMPLATE_CATEGORY_ALL = "__all";

export function TemplateThumbnail({ template, className }: { template: string; className?: string }) {
  const resolvedTemplate = resolveBuilderTemplate(template);
  const meta = TEMPLATE_PREVIEWS[resolvedTemplate];

  // Adjusted distinct visual structures for CV layouts
  const isSidebar = meta.layout === "sidebar";
  const isSplit = meta.layout === "split";
  const isTimeline = meta.layout === "timeline";
  const isMinimal = meta.layout === "minimal";

  return (
    <div
      className={cn("relative h-[116px] w-[86px] overflow-hidden rounded-md border border-slate-200/50 bg-white shadow-sm flex flex-col", className)}
      style={{ background: meta.background }}
      aria-hidden="true"
    >
      {/* Document Base */}
      <div className="absolute inset-1.5 rounded-[3px] bg-white overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 flex">

        {/* Left Column (Sidebar / Split-left) */}
        {(isSidebar || isSplit) && (
          <div className={cn("flex flex-col gap-1.5 px-1 py-1.5 shrink-0", isSidebar ? "w-[24px]" : "w-[30px]")} style={{ backgroundColor: isSidebar ? meta.accent : "transparent", opacity: isSidebar ? 0.9 : 1 }}>
            {/* Photo / Initial */}
            <div className="w-4 h-4 rounded-full mx-auto" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.4)" : meta.accent, opacity: 0.8 }} />

            {/* Sidebar content lines */}
            <div className="space-y-1 mt-1">
              <div className="h-[2px] w-4/5 rounded-full" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.7)" : meta.accent }} />
              <div className="h-[1.5px] w-full rounded-full bg-slate-300/60" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.4)" : undefined }} />
              <div className="h-[1.5px] w-2/3 rounded-full bg-slate-300/60" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.4)" : undefined }} />
            </div>
            <div className="space-y-1 mt-1">
              <div className="h-[2px] w-3/4 rounded-full" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.7)" : meta.accent }} />
              <div className="h-[1.5px] w-5/6 rounded-full bg-slate-300/60" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.4)" : undefined }} />
              <div className="h-[1.5px] w-full rounded-full bg-slate-300/60" style={{ backgroundColor: isSidebar ? "rgba(255,255,255,0.4)" : undefined }} />
            </div>
          </div>
        )}

        {/* Main Column */}
        <div className={cn("flex-1 flex flex-col p-1.5 gap-1.5", (isSidebar || isSplit) && "pl-1.5")}>

          {/* Header (Classic / Timeline / Minimal) */}
          {!(isSidebar || isSplit) && (
            <div className={cn("flex flex-col gap-0.5", isMinimal ? "items-start" : "items-center mb-1")}>
              <div className={cn("h-[3px] rounded-full", isMinimal ? "w-1/2" : "w-2/3")} style={{ backgroundColor: meta.accent }} />
              <div className={cn("h-[1.5px] bg-slate-300 rounded-full", isMinimal ? "w-1/3" : "w-1/2")} />
            </div>
          )}

          {/* Section 1 */}
          <div className="flex gap-1 items-start">
            {isTimeline && <div className="w-[1.5px] h-8 bg-slate-200 mt-1 flex flex-col items-center"><div className="w-1 h-1 rounded-full -mt-0.5" style={{ backgroundColor: meta.accent }}/></div>}
            <div className="flex-1 space-y-1">
              <div className="h-[2px] w-1/3 rounded-full" style={{ backgroundColor: meta.accent }} />
              <div className="space-y-[1.5px]">
                <div className="h-[1.5px] w-full bg-slate-200 rounded-full" />
                <div className="h-[1.5px] w-5/6 bg-slate-200 rounded-full" />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="flex gap-1 items-start">
            {isTimeline && <div className="w-[1.5px] h-8 bg-slate-200 mt-1 flex flex-col items-center"><div className="w-1 h-1 rounded-full -mt-0.5" style={{ backgroundColor: meta.accent }}/></div>}
            <div className="flex-1 space-y-1">
              <div className="h-[2px] w-2/5 rounded-full" style={{ backgroundColor: meta.accent }} />
              <div className="space-y-[1.5px]">
                <div className="h-[1.5px] w-full bg-slate-200 rounded-full" />
                <div className="h-[1.5px] w-[90%] bg-slate-200 rounded-full" />
                <div className="h-[1.5px] w-2/3 bg-slate-200 rounded-full" />
              </div>
            </div>
          </div>
        </div>

      </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 p-1 pb-8">
        {filteredTemplates.map((template) => {
          const meta = TEMPLATE_PREVIEWS[template];
          const isSelected = currentTemplate === template;

          return (
            <button
              key={template}
              onClick={() => setPreviewTemplate(template)}
              className={cn(
                "group relative flex flex-col text-left rounded-2xl bg-white transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                isSelected
                  ? "ring-2 ring-primary bg-primary/[0.02]"
                  : "ring-1 ring-slate-200 hover:ring-slate-300"
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 z-20 flex h-6 w-auto px-2 items-center justify-center rounded-full bg-primary text-white shadow-sm animate-in zoom-in duration-200 gap-1.5">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t("builder.templateCurrent")}</span>
                </div>
              )}

              <div className={cn(
                "relative flex w-full items-center justify-center overflow-hidden rounded-t-2xl border-b p-6 transition-colors duration-200",
                isSelected ? "bg-transparent border-primary/20" : "bg-slate-50 border-slate-100 group-hover:bg-slate-50/70"
              )}>
                <TemplateThumbnail
                  template={template}
                  className={cn(
                    "relative z-10 transition-transform duration-200 ease-out shadow-sm",
                    isSelected && "shadow-md scale-[1.02]"
                  )}
                />
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="text-[15px] font-semibold tracking-tight text-slate-900 group-hover:text-primary transition-colors">
                  {meta.name}
                </div>
                <p className="mt-1.5 line-clamp-2 min-h-[36px] text-[13px] leading-relaxed text-slate-500">
                  {t(`builder.template.${template}.desc`)}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {meta.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-slate-200/60 bg-slate-50/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors group-hover:bg-white group-hover:border-slate-300"
                    >
                      {t(`builder.templateTag.${tag}`)}
                    </span>
                  ))}
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

                <div className="py-4 flex flex-col items-center">
                  {/* Large thumbnail preview */}
                  <div className="relative w-[280px] h-[380px] bg-slate-50 rounded-xl flex items-center justify-center p-8 border border-slate-200 shadow-inner">
                    <TemplateThumbnail template={previewTemplate} className="w-[180px] h-[240px] shadow-md transform scale-[1.3]" />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {meta.tags.map(tag => (
                      <span key={tag} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                        {t(`builder.templateTag.${tag}`)}
                      </span>
                    ))}
                  </div>

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
