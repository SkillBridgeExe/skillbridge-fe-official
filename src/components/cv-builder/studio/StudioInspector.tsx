import type { ReactNode } from "react";
import { Globe, Type, Palette, Layout, Wand2, Settings2, Eye, EyeOff, ChevronUp, ChevronDown, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { localizeTemplateTag, TemplateGallery } from "../preview/TemplatePicker";
import { useCvBuilderStore, type CvBuilderSectionKey, type CvLanguage, type ResumeDensity, type ResumeFontScale } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TEMPLATE_PREVIEWS } from "@/lib/resume-engine/template-meta";
import { cn } from "@/lib/utils";

const DENSITY_OPTIONS: Array<{ value: ResumeDensity; labelVi: string; labelEn: string; hintVi: string; hintEn: string }> = [
  { value: "comfortable", labelVi: "Thoáng", labelEn: "Comfortable", hintVi: "Dễ đọc", hintEn: "Easy to read" },
  { value: "compact", labelVi: "Gọn", labelEn: "Compact", hintVi: "Nhiều nội dung", hintEn: "More content" },
];

const FONT_SCALE_OPTIONS: Array<{ value: ResumeFontScale; labelVi: string; labelEn: string }> = [
  { value: "small", labelVi: "Nhỏ", labelEn: "Small" },
  { value: "normal", labelVi: "Vừa", labelEn: "Normal" },
  { value: "large", labelVi: "Lớn", labelEn: "Large" },
];

const ACCENT_COLORS = [
  { value: "#0f172a", label: "Slate" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#dc2626", label: "Red" },
  { value: "#d97706", label: "Amber" },
];

const MAIN_STRUCTURE_SECTIONS: CvBuilderSectionKey[] = ["experience", "education", "projects"];
const SIDEBAR_STRUCTURE_SECTIONS: CvBuilderSectionKey[] = ["summary", "skills", "certifications"];

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
        active
          ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

export function StudioInspector() {
  const { t, i18n } = useTranslation("diagnosis");
  const isVi = i18n.language.startsWith("vi");
  const store = useCvBuilderStore();
  const sectionLabels: Record<CvBuilderSectionKey, string> = {
    summary: t("builder.tabSummary", { defaultValue: "Tóm tắt" }),
    experience: t("builder.tabExperience", { defaultValue: "Kinh nghiệm" }),
    education: t("builder.tabEducation", { defaultValue: "Học vấn" }),
    projects: t("builder.tabProjects", { defaultValue: "Dự án" }),
    skills: t("builder.tabSkills", { defaultValue: "Kỹ năng" }),
    certifications: t("builder.tabCertifications", { defaultValue: "Chứng chỉ" }),
  };

  const renderStructureGroup = (
    title: string,
    sections: CvBuilderSectionKey[],
  ) => {
    const orderedSections = store.sectionOrder.filter((key) => sections.includes(key));

    return (
      <div className="space-y-1.5">
        <p className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {orderedSections.map((key, index, arr) => {
          const isVisible = store.sectionVisibility[key] ?? true;

          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between rounded-md border p-2 text-sm transition-colors",
                isVisible
                  ? "border-slate-200 bg-white shadow-sm"
                  : "border-dashed border-slate-100 bg-slate-50 text-slate-400",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 shrink-0",
                    isVisible ? "text-slate-400 hover:text-slate-600" : "text-slate-300 hover:text-slate-400",
                  )}
                  onClick={() => store.setSectionVisibility(key, !isVisible)}
                  aria-label={
                    isVisible
                      ? isVi ? `Ẩn ${sectionLabels[key]}` : `Hide ${sectionLabels[key]}`
                      : isVi ? `Hiện ${sectionLabels[key]}` : `Show ${sectionLabels[key]}`
                  }
                >
                  {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <span className="truncate font-medium">{sectionLabels[key]}</span>
              </div>

              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveSectionWithinGroup(key, "up", sections)}
                  disabled={index === 0}
                  aria-label={isVi ? `Di chuyển ${sectionLabels[key]} lên` : `Move ${sectionLabels[key]} up`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveSectionWithinGroup(key, "down", sections)}
                  disabled={index === arr.length - 1}
                  aria-label={isVi ? `Di chuyển ${sectionLabels[key]} xuống` : `Move ${sectionLabels[key]} down`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Inspector Header */}
      <div className="h-12 flex items-center px-4 border-b border-slate-100 shrink-0">
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
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTemplate", { defaultValue: "Templates" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {t("builder.cvLanguage", { defaultValue: "CV Language" })}
                </h3>
                <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as CvLanguage)}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200 focus:ring-1 focus:ring-primary/30">
                    <SelectValue placeholder={t("builder.selectLanguage", { defaultValue: "Select Language" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (Anh)</SelectItem>
                    <SelectItem value="vi">Vietnamese (Việt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  {isVi ? "Mẫu CV" : "Resume Template"}
                </h3>
                
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-3">
                  <div className="flex gap-3">
                    {/* Small thumbnail representation */}
                    <div className="w-10 h-14 rounded bg-slate-100 border border-slate-200 shadow-sm shrink-0 overflow-hidden relative" style={{ backgroundColor: TEMPLATE_PREVIEWS[store.template]?.background }}>
                      <div className="absolute top-1.5 left-1 right-1 h-0.5 rounded-full" style={{ backgroundColor: TEMPLATE_PREVIEWS[store.template]?.accent }} />
                      <div className="absolute top-3 left-1 right-2 space-y-0.5">
                        <div className="h-0.5 bg-slate-300 w-full rounded-full" />
                        <div className="h-0.5 bg-slate-300 w-3/4 rounded-full" />
                        <div className="h-0.5 bg-slate-300 w-5/6 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{TEMPLATE_PREVIEWS[store.template]?.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {TEMPLATE_PREVIEWS[store.template]?.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                            {localizeTemplateTag(tag, isVi)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-primary">
                        {isVi ? "Đổi mẫu CV" : "Change template"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                      <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <DialogTitle className="text-lg font-bold text-slate-800">
                          {isVi ? "Thư viện mẫu CV" : "Template library"}
                        </DialogTitle>
                        <p className="text-sm text-slate-500">
                          {isVi
                            ? "Chọn mẫu CV phù hợp với phong cách và ngành nghề của bạn."
                            : "Choose a resume template that fits your style and target role."}
                        </p>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                        <TemplateGallery />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Structure Accordion */}
          <AccordionItem value="structure" className="border-b-slate-100">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {isVi ? "Cấu trúc" : "Structure"}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {isVi ? "Thứ tự & Hiển thị" : "Order & Visibility"}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] px-2 text-slate-400 hover:text-slate-600"
                  onClick={() => store.resetSectionOrder()}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {isVi ? "Mặc định" : "Reset"}
                </Button>
              </div>
              
              <div className="space-y-3">
                {renderStructureGroup(isVi ? "Cột chính" : "Main column", MAIN_STRUCTURE_SECTIONS)}
                {renderStructureGroup(isVi ? "Thanh bên" : "Sidebar", SIDEBAR_STRUCTURE_SECTIONS)}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Layout Accordion */}
          <AccordionItem value="layout" className="border-b-slate-100">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabLayout", { defaultValue: "Layout" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    {isVi ? "Mật độ nội dung" : "Content density"}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DENSITY_OPTIONS.map((option) => (
                      <SegmentedButton
                        key={option.value}
                        active={store.resumeDensity === option.value}
                        onClick={() => store.setResumeDensity(option.value)}
                      >
                        <span className="block">{isVi ? option.labelVi : option.labelEn}</span>
                        <span className="mt-0.5 block text-[10px] font-medium opacity-70">{isVi ? option.hintVi : option.hintEn}</span>
                      </SegmentedButton>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="hide-section-icons" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                      {isVi ? "Hiển thị icon mục" : "Show section icons"}
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {isVi ? "Có thể không tương thích với một số mẫu." : "May not be supported by every template."}
                    </p>
                  </div>
                  <Switch
                    id="hide-section-icons"
                    checked={!store.resumeHideSectionIcons}
                    onCheckedChange={(checked) => store.setResumeHideSectionIcons(!checked)}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Typography Accordion */}
          <AccordionItem value="typography" className="border-b-slate-100">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTypography", { defaultValue: "Typography" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {isVi ? "Cỡ chữ" : "Font size"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {FONT_SCALE_OPTIONS.map((option) => (
                    <SegmentedButton
                      key={option.value}
                      active={store.resumeFontScale === option.value}
                      onClick={() => store.setResumeFontScale(option.value)}
                    >
                      <span className="block text-center">{isVi ? option.labelVi : option.labelEn}</span>
                    </SegmentedButton>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Theme Color Accordion */}
          <AccordionItem value="theme" className="border-b-none">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabTheme", { defaultValue: "Theme Colors" })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {isVi ? "Màu nhấn" : "Accent color"}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={isVi ? `Chọn màu ${color.label}` : `Choose ${color.label}`}
                      title={color.label}
                      onClick={() => store.setResumeAccentColor(color.value)}
                      className={cn(
                        "h-8 rounded-full border-2 transition-transform hover:scale-105",
                        store.resumeAccentColor === color.value ? "border-sky-400 ring-2 ring-sky-100" : "border-white shadow-sm",
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}
