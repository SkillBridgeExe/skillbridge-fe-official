import { cn } from "@/lib/utils";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import type { Template } from "@resume-engine/schema/templates";
import { Check } from "lucide-react";

export const BUILDER_TEMPLATES: Template[] = [
  "azurill", "bronzor", "chikorita", "ditgar", "ditto",
  "gengar", "glalie", "kakuna", "lapras", "leafish",
  "meowth", "onyx", "pikachu", "rhyhorn", "scizor"
];

export function resolveBuilderTemplate(template: string): Template {
  return BUILDER_TEMPLATES.includes(template as Template) ? (template as Template) : "azurill";
}

type TemplatePreviewMeta = {
  accent: string;
  background: string;
  layout: "classic" | "sidebar" | "split" | "timeline" | "minimal";
};

const TEMPLATE_PREVIEWS: Record<Template, TemplatePreviewMeta> = {
  azurill: { accent: "#3b82f6", background: "#eff6ff", layout: "classic" },
  bronzor: { accent: "#64748b", background: "#f8fafc", layout: "sidebar" },
  chikorita: { accent: "#16a34a", background: "#f0fdf4", layout: "split" },
  ditgar: { accent: "#f97316", background: "#fff7ed", layout: "timeline" },
  ditto: { accent: "#a855f7", background: "#faf5ff", layout: "minimal" },
  gengar: { accent: "#7c3aed", background: "#f5f3ff", layout: "sidebar" },
  glalie: { accent: "#06b6d4", background: "#ecfeff", layout: "classic" },
  kakuna: { accent: "#ca8a04", background: "#fefce8", layout: "timeline" },
  lapras: { accent: "#0ea5e9", background: "#f0f9ff", layout: "split" },
  leafish: { accent: "#22c55e", background: "#f7fee7", layout: "minimal" },
  meowth: { accent: "#d97706", background: "#fffbeb", layout: "classic" },
  onyx: { accent: "#111827", background: "#f9fafb", layout: "sidebar" },
  pikachu: { accent: "#eab308", background: "#fef9c3", layout: "split" },
  rhyhorn: { accent: "#475569", background: "#f1f5f9", layout: "timeline" },
  scizor: { accent: "#dc2626", background: "#fef2f2", layout: "minimal" },
};

function TemplateThumbnail({ template }: { template: Template }) {
  const meta = TEMPLATE_PREVIEWS[template];
  const line = "h-1 rounded-full bg-slate-300";

  return (
    <div
      className="relative h-[106px] w-[78px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
      style={{ background: meta.background }}
      aria-hidden="true"
    >
      <div className="absolute inset-2 rounded-sm bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12)]">
        {meta.layout === "sidebar" && (
          <div className="absolute inset-y-0 left-0 w-5" style={{ backgroundColor: meta.accent }} />
        )}

        {meta.layout === "timeline" && (
          <div className="absolute bottom-3 left-4 top-9 w-px" style={{ backgroundColor: meta.accent }} />
        )}

        <div
          className={cn(
            "absolute left-3 right-3 top-3 h-1.5 rounded-full",
            meta.layout === "sidebar" && "left-7"
          )}
          style={{ backgroundColor: meta.accent }}
        />

        <div className={cn("absolute left-3 right-5 top-7 space-y-1", meta.layout === "sidebar" && "left-7")}>
          <div className={cn(line, "w-full")} />
          <div className={cn(line, "w-3/4")} />
        </div>

        {meta.layout === "split" ? (
          <div className="absolute bottom-3 left-3 right-3 grid grid-cols-[1fr_1.2fr] gap-1.5">
            <div className="space-y-1">
              <div className="h-7 rounded-sm" style={{ backgroundColor: meta.accent, opacity: 0.16 }} />
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-2/3")} />
            </div>
            <div className="space-y-1">
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-4/5")} />
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-2/3")} />
            </div>
          </div>
        ) : (
          <div className={cn("absolute bottom-3 left-3 right-3 space-y-1.5", meta.layout === "sidebar" && "left-7")}>
            <div className="h-3 rounded-sm" style={{ backgroundColor: meta.accent, opacity: 0.14 }} />
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
  const currentTemplate = resolveBuilderTemplate(store.template);

  const getTemplateTag = (layout: string) => {
    switch (layout) {
      case "classic": return "ATS Friendly";
      case "sidebar": return "Creative";
      case "split": return "Modern";
      case "timeline": return "Detailed";
      case "minimal": return "Clean";
      default: return "";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {BUILDER_TEMPLATES.map((template) => {
        const meta = TEMPLATE_PREVIEWS[template];
        return (
          <button
            key={template}
            onClick={() => store.setTemplate(template)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              currentTemplate === template
                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                : "border-slate-200"
            )}
          >
            {currentTemplate === template && (
              <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5 shadow-sm">
                <Check className="w-3 h-3" />
              </div>
            )}
            <TemplateThumbnail template={template} />
            <div className="mt-3 text-center">
              <div className="text-xs font-semibold capitalize text-slate-700">{template}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{getTemplateTag(meta.layout)}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

