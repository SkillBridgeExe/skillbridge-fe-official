import { Globe, Type, Palette, Layout, Wand2, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TemplateGallery } from "../preview/TemplatePicker";
import { useCvBuilderStore, type CvLanguage } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function StudioInspector() {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Inspector Header */}
      <div className="h-14 flex items-center px-5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-sm text-slate-800">
            {t("builder.inspectorTitle", { defaultValue: "Settings & Appearance" })}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Accordion type="multiple" defaultValue={["template"]} className="w-full">
          
          {/* Templates Accordion */}
          <AccordionItem value="template" className="border-b-slate-100">
            <AccordionTrigger className="px-5 py-3 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTemplate", { defaultValue: "Templates" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-2">
              <div className="mb-6">
                <h3 className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {t("builder.cvLanguage", { defaultValue: "CV Language" })}
                </h3>
                <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as CvLanguage)}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200">
                    <SelectValue placeholder={t("builder.selectLanguage", { defaultValue: "Select Language" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (Anh)</SelectItem>
                    <SelectItem value="vi">Vietnamese (Việt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  {t("builder.gallery", { defaultValue: "Template Gallery" })}
                </h3>
                <TemplateGallery />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Layout Accordion */}
          <AccordionItem value="layout" className="border-b-slate-100">
            <AccordionTrigger className="px-5 py-3 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabLayout", { defaultValue: "Layout" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-2 opacity-50 pointer-events-none">
              <div className="mt-2 flex flex-col items-center text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary mb-1">
                  Sắp ra mắt
                </span>
                <p className="text-xs text-slate-500 font-medium">
                  Tính năng chỉnh sửa bố cục đang được phát triển.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Typography Accordion */}
          <AccordionItem value="typography" className="border-b-slate-100">
            <AccordionTrigger className="px-5 py-3 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTypography", { defaultValue: "Typography" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-2 opacity-50 pointer-events-none">
              <div className="h-8 bg-slate-100 rounded-md border border-slate-200 w-full mb-2" />
              <div className="flex items-center gap-2">
                <div className="h-8 bg-slate-100 rounded-md border border-slate-200 flex-1" />
                <div className="h-8 bg-slate-100 rounded-md border border-slate-200 flex-1" />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Theme Color Accordion */}
          <AccordionItem value="theme" className="border-b-none">
            <AccordionTrigger className="px-5 py-3 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTheme", { defaultValue: "Theme Colors" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 pt-2 opacity-50 pointer-events-none">
              <div className="flex gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}
