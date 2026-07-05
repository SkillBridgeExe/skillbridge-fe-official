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

const TEMPLATE_DESCRIPTION_VI: Record<Template, string> = {
  azurill: "Mẫu ATS cổ điển với phần tiêu đề xanh dịu.",
  bronzor: "Bố cục sidebar chuyên nghiệp cho CV giàu hồ sơ cá nhân.",
  chikorita: "Bố cục chia cột gọn cho fresher kỹ thuật.",
  ditgar: "Cấu trúc timeline làm nổi bật câu chuyện kinh nghiệm.",
  ditto: "Phong cách tối giản, thoáng cho CV một trang sạch sẽ.",
  gengar: "Sidebar sáng tạo với mật độ cao cho CV nhiều dự án.",
  glalie: "Bố cục ATS chặt chẽ cho CV kỹ sư súc tích.",
  kakuna: "Timeline tông ấm cho câu chuyện phát triển nghề nghiệp.",
  lapras: "Bố cục cân bằng cho vai trò product và frontend.",
  leafish: "Thiết kế tối giản gọn cho CV học thuật hoặc thực tập.",
  meowth: "Typography lớn, dễ đọc cho phần tóm tắt nghề nghiệp.",
  onyx: "Sidebar chuyên nghiệp, sắc nét cho hồ sơ kỹ thuật.",
  pikachu: "Bố cục chia cột sáng, gọn cho portfolio dự án.",
  rhyhorn: "Timeline có cấu trúc cho hồ sơ nhiều thông tin.",
  scizor: "Tối giản với điểm nhấn đỏ cho CV một trang chỉn chu.",
};

const TAG_VI: Record<string, string> = {
  ATS: "ATS",
  Classic: "Cổ điển",
  Sidebar: "Thanh bên",
  Professional: "Chuyên nghiệp",
  Modern: "Hiện đại",
  Compact: "Gọn",
  Timeline: "Timeline",
  Detailed: "Chi tiết",
  Minimal: "Tối giản",
  Clean: "Sạch",
  Creative: "Sáng tạo",
  Warm: "Ấm",
  Balanced: "Cân bằng",
  Readable: "Dễ đọc",
  Technical: "Kỹ thuật",
};

export function getTemplateDescription(template: Template, isVi: boolean) {
  return isVi ? TEMPLATE_DESCRIPTION_VI[template] : TEMPLATE_PREVIEWS[template].description;
}

export function localizeTemplateTag(tag: string, isVi: boolean) {
  return isVi ? TAG_VI[tag] ?? tag : tag;
}

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
  const { i18n } = useTranslation("diagnosis");
  const isVi = i18n.language.startsWith("vi");
  const currentTemplate = resolveBuilderTemplate(store.template);

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
              <div className="text-xs font-semibold text-slate-700">{meta.name}</div>
              <p className="mt-1 line-clamp-2 min-h-[28px] text-[10px] leading-snug text-slate-500">
                {getTemplateDescription(template, isVi)}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {meta.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                    {localizeTemplateTag(tag, isVi)}
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

