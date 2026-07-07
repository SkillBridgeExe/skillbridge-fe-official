import { cn } from "@/lib/utils";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { Template } from "@resume-engine/schema/templates";
import { Check } from "lucide-react";
import { TEMPLATE_PREVIEWS } from "@/lib/resume-engine/template-meta";
import { useTranslation } from "react-i18next";

export const BUILDER_TEMPLATES: Template[] = [
  "azurill", "bronzor", "chikorita", "ditgar", "ditto",
  "gengar", "glalie", "kakuna", "lapras", "leafish",
  "meowth", "onyx", "pikachu", "rhyhorn", "scizor"
];

export function resolveBuilderTemplate(template: string): Template {
  return BUILDER_TEMPLATES.includes(template as Template) ? (template as Template) : "azurill";
}

export function TemplateThumbnail({ template, className }: { template: string; className?: string }) {
  const resolvedTemplate = resolveBuilderTemplate(template);
  const meta = TEMPLATE_PREVIEWS[resolvedTemplate];
  const line = "h-[3px] rounded-full bg-slate-200/80";

  return (
    <div
      className={cn("relative h-[116px] w-[86px] overflow-hidden rounded-md border border-slate-200/50 bg-white shadow-sm", className)}
      style={{ background: meta.background }}
      aria-hidden="true"
    >
      <div className="absolute inset-1.5 rounded-[3px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5">
        {meta.layout === "sidebar" && (
          <div className="absolute inset-y-0 left-0 w-[20px] rounded-l-[2px]" style={{ backgroundColor: meta.accent, opacity: 0.9 }} />
        )}

        {meta.layout === "timeline" && (
          <div className="absolute bottom-3 left-3 top-8 w-px" style={{ backgroundColor: meta.accent, opacity: 0.6 }} />
        )}

        <div
          className={cn(
            "absolute left-2.5 right-2.5 top-2.5 h-1.5 rounded-full",
            meta.layout === "sidebar" && "left-[26px]"
          )}
          style={{ backgroundColor: meta.accent }}
        />

        <div className={cn("absolute left-2.5 right-4 top-6 space-y-1.5", meta.layout === "sidebar" && "left-[26px]")}>
          <div className={cn(line, "w-full")} />
          <div className={cn(line, "w-3/4")} />
        </div>

        {meta.layout === "split" ? (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 grid grid-cols-[1fr_1.2fr] gap-1.5">
            <div className="space-y-1.5">
              <div className="h-6 rounded-[2px]" style={{ backgroundColor: meta.accent, opacity: 0.12 }} />
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-2/3")} />
            </div>
            <div className="space-y-1.5">
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-4/5")} />
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-2/3")} />
            </div>
          </div>
        ) : (
          <div className={cn("absolute bottom-2.5 left-2.5 right-2.5 space-y-1.5", meta.layout === "sidebar" && "left-[26px]")}>
            <div className="h-3 rounded-[2px]" style={{ backgroundColor: meta.accent, opacity: 0.12 }} />
            <div className={cn(line, "w-full")} />
            <div className={cn(line, "w-5/6")} />
            <div className={cn(line, "w-2/3")} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TemplateGallery() {
  const store = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");
  const currentTemplate = resolveBuilderTemplate(store.template);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 p-1">
      {BUILDER_TEMPLATES.map((template) => {
        const meta = TEMPLATE_PREVIEWS[template];
        const isSelected = currentTemplate === template;

        return (
          <button
            key={template}
            onClick={() => store.setTemplate(template)}
            className={cn(
              "group relative flex flex-col text-left rounded-2xl bg-white transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              isSelected
                ? "ring-2 ring-primary bg-primary/[0.02]"
                : "ring-1 ring-slate-200 hover:ring-slate-300"
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm animate-in zoom-in duration-200">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
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
  );
}
