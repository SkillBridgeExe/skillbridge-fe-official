import type { ReactNode } from "react";
import { Globe, Type, Palette, Layout, Wand2, Settings2, Eye, EyeOff, ChevronUp, ChevronDown, Layers, RotateCcw, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { resolveBuilderTemplate, TemplateGallery, TemplateThumbnail } from "../preview/TemplatePicker";
import { useCvBuilderStore, type CvBuilderSectionKey, type CvLanguage, type ResumeFontScale, type ResumeFontFamily, type ResumeLineHeight, type ResumeSpacing } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TEMPLATE_PREVIEWS, getTemplateLayoutCapabilities } from "@/lib/resume-engine/template-meta";
import { cn } from "@/lib/utils";

const SPACING_OPTIONS: Array<{ value: ResumeSpacing; labelKey: string }> = [
  { value: "compact", labelKey: "compactLabel" },
  { value: "normal", labelKey: "normalLabel" },
  { value: "spacious", labelKey: "spaciousLabel" },
];

const LINE_HEIGHT_OPTIONS: Array<{ value: ResumeLineHeight; labelKey: string }> = [
  { value: "tight", labelKey: "tightLabel" },
  { value: "normal", labelKey: "normalLabel" },
  { value: "relaxed", labelKey: "relaxedLabel" },
];

const FONT_FAMILY_OPTIONS: Array<{ value: ResumeFontFamily; labelKey: string }> = [
  { value: "inter", labelKey: "fontInter" },
  { value: "serif", labelKey: "fontSerif" },
  { value: "roboto", labelKey: "fontRoboto" },
  { value: "merriweather", labelKey: "fontMerriweather" },
  { value: "mono", labelKey: "fontMono" },
];

const FONT_SCALE_OPTIONS: Array<{ value: ResumeFontScale; labelKey: string }> = [
  { value: "small", labelKey: "small" },
  { value: "normal", labelKey: "normal" },
  { value: "large", labelKey: "large" },
];

const SIDEBAR_WIDTH_OPTIONS = [
  { value: "narrow", labelKey: "narrowLabel" },
  { value: "normal", labelKey: "normalLabel" },
  { value: "wide", labelKey: "wideLabel" },
] as const;

const ACCENT_COLORS = [
  { value: "#0f172a", label: "Slate" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#dc2626", label: "Red" },
  { value: "#d97706", label: "Amber" },
];

const DEFAULT_MAIN_SECTIONS: CvBuilderSectionKey[] = ["summary", "experience", "education", "projects"];
const DEFAULT_SIDEBAR_SECTIONS: CvBuilderSectionKey[] = ["skills", "certifications"];

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
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const currentTemplate = resolveBuilderTemplate(store.template);
  const layoutCapabilities = getTemplateLayoutCapabilities(currentTemplate);
  const sectionLabels: Record<CvBuilderSectionKey, string> = {
    summary: t("builder.tabSummary"),
    experience: t("builder.tabExperience"),
    education: t("builder.tabEducation"),
    projects: t("builder.tabProjects"),
    skills: t("builder.tabSkills"),
    certifications: t("builder.tabCertifications"),
  };

  const renderStructureGroup = (
    title: string,
    sections: CvBuilderSectionKey[],
    groupId: "main" | "sidebar" | "single",
    supportsSidebar: boolean
  ) => {
    const orderedSections = store.sectionOrder.filter((key) => sections.includes(key));

    return (
      <div className="space-y-1.5">
        <p className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {orderedSections.map((key, index, arr) => {
          const isVisible = store.sectionVisibility[key] ?? true;
          const targetPlacement = groupId === "main" ? "sidebar" : "main";
          const moveTitle = groupId === "main" ? t("builder.inspector.moveToSidebar") : t("builder.inspector.moveToMain");

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
                      ? t("builder.inspector.hideSection", { section: sectionLabels[key] })
                      : t("builder.inspector.showSection", { section: sectionLabels[key] })
                  }
                >
                  {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <span className="truncate font-medium">{sectionLabels[key]}</span>
              </div>

              <div className="flex items-center gap-0.5">
                {supportsSidebar && groupId !== "single" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-sky-600 mr-1"
                    onClick={() => store.setSectionPlacement(key, targetPlacement)}
                    title={moveTitle}
                    aria-label={moveTitle}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveSectionWithinGroup(key, "up", sections)}
                  disabled={index === 0}
                  aria-label={t("builder.inspector.moveUp", { section: sectionLabels[key] })}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-600"
                  onClick={() => store.moveSectionWithinGroup(key, "down", sections)}
                  disabled={index === arr.length - 1}
                  aria-label={t("builder.inspector.moveDown", { section: sectionLabels[key] })}
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
            {t("builder.inspectorTitle")}
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
                  {t("builder.tabTemplate")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {t("builder.cvLanguage")}
                </h3>
                <Select value={store.cvLanguage} onValueChange={(v) => store.setCvLanguage(v as CvLanguage)}>
                  <SelectTrigger className="w-full h-8 text-xs bg-slate-50 border-slate-200 focus:ring-1 focus:ring-primary/30">
                    <SelectValue placeholder={t("builder.selectLanguage")} />
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
                  {t("builder.inspector.resumeTemplate")}
                </h3>

                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex flex-col gap-3">
                  <div className="flex gap-4">
                    <TemplateThumbnail
                      template={currentTemplate}
                      className="shrink-0"
                    />
                    <div className="flex flex-col py-1">
                      <div className="text-[14px] font-bold text-slate-800">{TEMPLATE_PREVIEWS[currentTemplate]?.name}</div>
                      <p className="text-[11px] text-slate-500 mt-1 mb-2.5 leading-relaxed">
                        {t(`builder.template.${currentTemplate}.desc`)}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {TEMPLATE_PREVIEWS[currentTemplate]?.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                            {t(`builder.templateTag.${tag}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-primary">
                        {t("builder.inspector.changeTemplate")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                      <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <DialogTitle className="text-lg font-bold text-slate-800">
                          {t("builder.inspector.templateLibrary")}
                        </DialogTitle>
                        <p className="text-sm text-slate-500">
                          {t("builder.inspector.templateLibraryDesc")}
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
                  {t("builder.inspector.structure")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t("builder.inspector.orderAndVisibility")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-slate-400 hover:text-slate-600"
                  onClick={() => store.resetSectionOrder()}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t("builder.inspector.reset")}
                </Button>
              </div>
              <div className="space-y-3">
                {(() => {
                  const capabilities = layoutCapabilities;

                  if (!capabilities.supportsSidebar) {
                    return (
                      <>
                        <div className="p-2 mb-2 bg-slate-50 border border-slate-100 rounded-md text-[11px] text-slate-500">
                          {t("builder.inspector.oneColumnHelper")}
                        </div>
                        {renderStructureGroup(t("builder.inspector.mainColumn"), store.sectionOrder, "single", false)}
                      </>
                    );
                  }

                  const mainSections = store.sectionOrder.filter(k =>
                    store.sectionPlacement[k] ? store.sectionPlacement[k] === "main" : DEFAULT_MAIN_SECTIONS.includes(k)
                  );
                  const sidebarSections = store.sectionOrder.filter(k =>
                    store.sectionPlacement[k] ? store.sectionPlacement[k] === "sidebar" : DEFAULT_SIDEBAR_SECTIONS.includes(k)
                  );

                  return (
                    <>
                      {renderStructureGroup(t("builder.inspector.mainColumn"), mainSections, "main", true)}
                      {renderStructureGroup(t("builder.inspector.sidebar"), sidebarSections, "sidebar", true)}
                    </>
                  );
                })()}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Layout Accordion */}
          <AccordionItem value="layout" className="border-b-slate-100">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.tabLayout")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-3">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t("builder.inspector.pageMargin")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {SPACING_OPTIONS.map((option) => (
                        <SegmentedButton
                          key={option.value}
                          active={store.resumePageMargin === option.value}
                          onClick={() => store.setResumePageMargin(option.value)}
                        >
                          <span className="block text-center">{t(`builder.inspector.${option.labelKey}`)}</span>
                        </SegmentedButton>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      {t("builder.inspector.sectionSpacing")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {SPACING_OPTIONS.map((option) => (
                        <SegmentedButton
                          key={option.value}
                          active={store.resumeSectionSpacing === option.value}
                          onClick={() => store.setResumeSectionSpacing(option.value)}
                        >
                          <span className="block text-center">{t(`builder.inspector.${option.labelKey}`)}</span>
                        </SegmentedButton>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label htmlFor="hide-section-icons" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                      {t("builder.inspector.showSectionIcons")}
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {t("builder.inspector.iconCompatibilityHint")}
                    </p>
                  </div>
                  <Switch
                    id="hide-section-icons"
                    checked={!store.resumeHideSectionIcons}
                    onCheckedChange={(checked) => store.setResumeHideSectionIcons(!checked)}
                  />
                </div>

                {layoutCapabilities.supportsSidebar ? (
                  <>
                    {layoutCapabilities.supportsSidebarPosition && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {t("builder.inspector.sidebarPosition")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <SegmentedButton
                            active={store.resumeSidebarPosition === "left"}
                            onClick={() => store.setResumeSidebarPosition("left")}
                          >
                            <span className="block text-center">{t("builder.inspector.sidebarLeft")}</span>
                          </SegmentedButton>
                          <SegmentedButton
                            active={store.resumeSidebarPosition === "right"}
                            onClick={() => store.setResumeSidebarPosition("right")}
                          >
                            <span className="block text-center">{t("builder.inspector.sidebarRight")}</span>
                          </SegmentedButton>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {t("builder.inspector.sidebarWidth")}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {SIDEBAR_WIDTH_OPTIONS.map((option) => (
                          <SegmentedButton
                            key={option.value}
                            active={store.resumeSidebarWidth === option.value}
                            onClick={() => store.setResumeSidebarWidth(option.value)}
                          >
                            <span className="block text-center">{t(`builder.inspector.${option.labelKey}`)}</span>
                          </SegmentedButton>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-slate-100 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-500">
                    {t("builder.inspector.noSidebarHelper")}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.dividerStyle")}
                  </p>
                  <Select value={store.resumeDividerStyle} onValueChange={(v) => store.setResumeDividerStyle(v as typeof store.resumeDividerStyle)}>
                    <SelectTrigger className="w-full h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder={t("builder.inspector.selectDivider")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">{t("builder.inspector.dividerLine")}</SelectItem>
                      <SelectItem value="accent">{t("builder.inspector.dividerAccent")}</SelectItem>
                      <SelectItem value="subtle">{t("builder.inspector.dividerSubtle")}</SelectItem>
                      <SelectItem value="none">{t("builder.inspector.dividerNone")}</SelectItem>
                    </SelectContent>
                  </Select>
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
                  {t("builder.tabTypography")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.fontFamily")}
                  </p>
                  <Select value={store.resumeFontFamily} onValueChange={(v) => store.setResumeFontFamily(v as ResumeFontFamily)}>
                    <SelectTrigger className="w-full h-8 text-xs bg-white border-slate-200">
                      <SelectValue placeholder={t("builder.inspector.selectFont")} />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILY_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {t(`builder.inspector.${font.labelKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.fontSize")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {FONT_SCALE_OPTIONS.map((option) => (
                      <SegmentedButton
                        key={option.value}
                        active={store.resumeFontScale === option.value}
                        onClick={() => store.setResumeFontScale(option.value)}
                      >
                        <span className="block text-center">{t(`builder.inspector.${option.labelKey}`)}</span>
                      </SegmentedButton>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.lineHeight")}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {LINE_HEIGHT_OPTIONS.map((option) => (
                      <SegmentedButton
                        key={option.value}
                        active={store.resumeLineHeight === option.value}
                        onClick={() => store.setResumeLineHeight(option.value)}
                      >
                        <span className="block text-center">{t(`builder.inspector.${option.labelKey}`)}</span>
                      </SegmentedButton>
                    ))}
                  </div>
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
                  {t("builder.tabTheme")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("builder.inspector.accentColor")}
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={t("builder.inspector.chooseColor", { color: color.label })}
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
