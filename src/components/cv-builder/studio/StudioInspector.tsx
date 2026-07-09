import { Globe, Type, Palette, Layout, Wand2, Settings2, Eye, EyeOff, Layers, RotateCcw, ArrowRightLeft, ChevronUp, ChevronDown, GripVertical, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { resolveBuilderTemplate, TemplateGallery, StaticTemplateThumbnail } from "../preview/TemplatePicker";
import { useCvBuilderStore, type CvBuilderSectionKey, type CvLanguage, type ResumeFontScale, type ResumeFontFamily, type ResumeLineHeight, type ResumeSpacing } from "@/store/useCvBuilderStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { TEMPLATE_PREVIEWS, getTemplateLayoutCapabilities } from "@/lib/resume-engine/template-meta";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StudioAvatarControl } from "./StudioAvatarControl";
import { SegmentedButton } from "./SegmentedButton";

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

const TEXT_COLORS = [
  { value: "#334155", label: "Slate" },
  { value: "#1e3a8a", label: "Navy" },
  { value: "#14532d", label: "Forest" },
  { value: "#000000", label: "Black" },
  { value: "#4c0519", label: "Burgundy" },
  { value: "#312e81", label: "Indigo" },
];

const DEFAULT_MAIN_SECTIONS: CvBuilderSectionKey[] = ["summary", "experience", "education", "projects"];
const DEFAULT_SIDEBAR_SECTIONS: CvBuilderSectionKey[] = ["skills", "certifications"];

function SortableSectionItem({
  id,
  isVisible,
  sectionLabel,
  supportsSidebar,
  groupId,
  onToggleVisibility,
  onMovePlacement,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  id: string;
  isVisible: boolean;
  sectionLabel: string;
  supportsSidebar: boolean;
  groupId: "main" | "sidebar" | "single";
  onToggleVisibility: () => void;
  onMovePlacement: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };
  const { t } = useTranslation("diagnosis");
  const moveTitle = groupId === "main" ? t("builder.inspector.moveToSidebar") : t("builder.inspector.moveToMain");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between rounded-md border p-2 text-sm transition-colors relative bg-white",
        isVisible
          ? "border-slate-200 shadow-sm"
          : "border-dashed border-slate-100 bg-slate-50 text-slate-400",
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 outline-none p-0.5 -ml-1 rounded transition-colors hover:bg-slate-100"
          aria-label={t("builder.inspector.dragToReorder", { section: sectionLabel })}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 shrink-0",
            isVisible ? "text-slate-400 hover:text-slate-600" : "text-slate-300 hover:text-slate-400",
          )}
          onClick={onToggleVisibility}
          aria-label={
            isVisible
              ? t("builder.inspector.hideSection", { section: sectionLabel })
              : t("builder.inspector.showSection", { section: sectionLabel })
          }
        >
          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        <span className="truncate font-medium">{sectionLabel}</span>
      </div>

      <div className="flex items-center gap-0.5">
        {supportsSidebar && groupId !== "single" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-sky-600 mr-1"
            onClick={onMovePlacement}
            title={moveTitle}
            aria-label={moveTitle}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-600 hidden sm:inline-flex"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={t("builder.inspector.moveUp", { section: sectionLabel })}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-600 hidden sm:inline-flex"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={t("builder.inspector.moveDown", { section: sectionLabel })}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function StudioInspector() {
  const { t } = useTranslation("diagnosis");
  const store = useCvBuilderStore();
  const currentTemplate = resolveBuilderTemplate(store.template);
  const layoutCapabilities = getTemplateLayoutCapabilities(currentTemplate);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // We only reorder within the global array for now since they are all one array
    store.reorderSection(active.id as CvBuilderSectionKey, over.id as CvBuilderSectionKey);
  };

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
        <SortableContext items={orderedSections} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {orderedSections.map((key, index, arr) => {
              const isVisible = store.sectionVisibility[key] ?? true;
              return (
                <SortableSectionItem
                  key={key}
                  id={key}
                  isVisible={isVisible}
                  sectionLabel={sectionLabels[key]}
                  supportsSidebar={supportsSidebar}
                  groupId={groupId}
                  onToggleVisibility={() => store.setSectionVisibility(key, !isVisible)}
                  onMovePlacement={() => store.setSectionPlacement(key, groupId === "main" ? "sidebar" : "main")}
                  onMoveUp={() => store.moveSectionWithinGroup(key, "up", sections)}
                  onMoveDown={() => store.moveSectionWithinGroup(key, "down", sections)}
                  isFirst={index === 0}
                  isLast={index === arr.length - 1}
                />
              );
            })}
          </div>
        </SortableContext>
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
                    <StaticTemplateThumbnail
                      template={currentTemplate}
                      className="w-[86px] h-[116px] shrink-0"
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
                        <DialogDescription className="text-sm text-slate-500">
                          {t("builder.inspector.templateLibraryDesc")}
                        </DialogDescription>
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

          {/* Picture / Avatar Accordion */}
          <AccordionItem value="picture" className="border-b-slate-100">
            <AccordionTrigger className="px-4 py-2.5 hover:bg-slate-50 transition-colors hover:no-underline">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  {t("builder.inspector.pictureAvatar")}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3",
                    !layoutCapabilities.supportsAvatar && "opacity-50 pointer-events-none",
                  )}
                >
                  <div className="space-y-0.5">
                    <label htmlFor="show-avatar" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                      {t("builder.inspector.showAvatar", "Show Avatar")}
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {store.resumeAtsSafeMode
                        ? t("builder.inspector.atsDisabledAvatar", "ATS Safe Mode hides avatars for better parsing and compliance.")
                        : !layoutCapabilities.supportsAvatar
                          ? t("builder.inspector.unsupportedFeature", "This template does not support avatars.")
                          : t("builder.inspector.avatarHint", "Toggle your profile picture.")}
                    </p>
                  </div>
                  <Switch
                    id="show-avatar"
                    checked={store.resumePictureVisible !== false && !store.resumeAtsSafeMode}
                    onCheckedChange={(checked) => store.setResumePictureVisible(checked)}
                    disabled={store.resumeAtsSafeMode}
                  />
                </div>

                <StudioAvatarControl layoutCapabilities={layoutCapabilities} />
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
              </DndContext>
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
              <div className="space-y-5">
                
                {/* ATS Safe Mode */}
                <div className="flex items-center justify-between bg-sky-50 p-3 rounded-md border border-sky-100">
                  <div className="space-y-0.5">
                    <label htmlFor="ats-safe-mode" className="text-[12px] font-bold text-sky-950 cursor-pointer flex items-center gap-1.5">
                      {t("builder.inspector.atsSafeMode", "ATS Safe Mode")}
                    </label>
                    <p className="text-[10px] text-sky-800/80 leading-relaxed max-w-[200px]">
                      {t("builder.inspector.atsSafeModeDesc", "Optimize for Applicant Tracking Systems by using standard layouts, disabling icons, and forcing high contrast.")}
                    </p>
                  </div>
                  <Switch
                    id="ats-safe-mode"
                    checked={store.resumeAtsSafeMode}
                    onCheckedChange={(checked) => store.setResumeAtsSafeMode(checked)}
                    className="data-[state=checked]:bg-sky-600"
                  />
                </div>

                <div className="space-y-4">
                  <div className={cn(!layoutCapabilities.supportsSpacing && "opacity-50 pointer-events-none")}>
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
                  <div className={cn(!layoutCapabilities.supportsSpacing && "opacity-50 pointer-events-none")}>
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
                  <p className="text-[10px] text-slate-400 mt-1">
                    {!layoutCapabilities.supportsSpacing 
                      ? t("builder.inspector.unsupportedFeature", "This template does not support custom spacing.")
                      : t("builder.inspector.densityHelper")}
                  </p>
                </div>

                <div className={cn("flex items-center justify-between", 
                  (!layoutCapabilities.supportsSectionIcons || store.resumeAtsSafeMode) && "opacity-50 pointer-events-none"
                )}>
                  <div className="space-y-0.5">
                    <label htmlFor="hide-section-icons" className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer">
                      {t("builder.inspector.showSectionIcons")}
                    </label>
                    <p className="text-[10px] text-slate-400">
                      {store.resumeAtsSafeMode 
                        ? t("builder.inspector.atsDisabled", "Disabled because ATS Safe Mode is on.")
                        : !layoutCapabilities.supportsSectionIcons
                          ? t("builder.inspector.unsupportedFeature", "This template does not support custom spacing.")
                          : t("builder.inspector.iconCompatibilityHint")}
                    </p>
                  </div>
                  <Switch
                    id="hide-section-icons"
                    checked={!store.resumeHideSectionIcons && !store.resumeAtsSafeMode}
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

                <div className={cn("space-y-1.5", 
                  (!layoutCapabilities.supportsDividerStyle || store.resumeAtsSafeMode) && "opacity-50 pointer-events-none"
                )}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.dividerStyle")}
                  </p>
                  <Select 
                    value={store.resumeAtsSafeMode ? "line" : store.resumeDividerStyle} 
                    onValueChange={(v) => store.setResumeDividerStyle(v as typeof store.resumeDividerStyle)}
                  >
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
                  <p className="text-[10px] text-slate-400 mt-1">
                      {store.resumeAtsSafeMode 
                        ? t("builder.inspector.atsDisabled", "Disabled because ATS Safe Mode is on.")
                        : !layoutCapabilities.supportsDividerStyle
                          ? t("builder.inspector.unsupportedFeature", "This template does not support custom divider styles.")
                          : ""}
                  </p>
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
              <div className={cn("space-y-4", !layoutCapabilities.supportsTypography && "opacity-50 pointer-events-none")}>
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
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t("builder.inspector.fontScaleHelper")}
                  </p>
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
                {!layoutCapabilities.supportsTypography && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t("builder.inspector.unsupportedFeature", "This template does not support custom typography.")}
                  </p>
                )}
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
              <div className={cn("space-y-1.5", 
                (!layoutCapabilities.supportsAccentColor || store.resumeAtsSafeMode) && "opacity-50 pointer-events-none"
              )}>
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
                        (store.resumeAtsSafeMode ? color.value === "#0f172a" : store.resumeAccentColor === color.value) 
                          ? "border-sky-400 ring-2 ring-sky-100" 
                          : "border-white shadow-sm",
                      )}
                      style={{ backgroundColor: store.resumeAtsSafeMode ? "#0f172a" : color.value }}
                    />
                  ))}
                </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {store.resumeAtsSafeMode
                      ? t("builder.inspector.atsDisabledColor", "ATS Safe Mode forces black & white colors.")
                      : !layoutCapabilities.supportsAccentColor
                        ? t("builder.inspector.unsupportedFeature", "This template does not support custom accent colors.")
                        : t("builder.inspector.accentColorHelper")}
                  </p>
                </div>

                <div className={cn("space-y-1.5 mt-6", 
                  (!layoutCapabilities.supportsTypography || store.resumeAtsSafeMode) && "opacity-50 pointer-events-none"
                )}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("builder.inspector.textColor", "Text Color")}
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={t("builder.inspector.chooseColor", { color: color.label })}
                        title={color.label}
                        onClick={() => store.setResumeTextColor(color.value)}
                        className={cn(
                          "h-8 rounded-full border-2 transition-transform hover:scale-105",
                          (store.resumeAtsSafeMode ? color.value === "#000000" : store.resumeTextColor === color.value) 
                            ? "border-sky-400 ring-2 ring-sky-100" 
                            : "border-white shadow-sm",
                        )}
                        style={{ backgroundColor: store.resumeAtsSafeMode ? "#000000" : color.value }}
                      />
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* W69: Reset Style Button */}
          <div className="px-4 py-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 border-slate-200 text-slate-500 hover:text-slate-700"
              onClick={() => store.resetStyle()}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" />
              {t("builder.inspector.resetStyle")}
            </Button>
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              {t("builder.inspector.resetStyleDesc")}
            </p>
          </div>
      </div>
    </div>
  );
}
