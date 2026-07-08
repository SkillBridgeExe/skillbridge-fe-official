import type { Template } from "@resume-engine/schema/templates";
import type { ResumeSpacing, ResumeFontScale } from "@/store/useCvBuilderStore";

export type TemplatePreviewMeta = {
  name: string;
  description: string;
  tags: string[];
  accent: string;
  background: string;
  layout: "classic" | "sidebar" | "split" | "timeline" | "minimal";
  pageMargin: ResumeSpacing;
  sectionSpacing: ResumeSpacing;
  fontScale: ResumeFontScale;
};

export type TemplateLayoutCapabilities = {
  supportsSidebar: boolean;
  usesSidebarSections: boolean;
  supportsSidebarPosition: boolean;
  supportsSidebarWidth: boolean;
  supportsSectionIcons: boolean;
  supportsDividerStyle: boolean;
};

export const TEMPLATE_PREVIEWS: Record<Template, TemplatePreviewMeta> = {
  azurill: { name: "Azurill", description: "Classic ATS CV with a calm two-column header.", tags: ["ATS", "Classic"], accent: "#3b82f6", background: "#eff6ff", layout: "split", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal" },
  bronzor: { name: "Bronzor", description: "Professional section-label layout for profile-heavy CVs.", tags: ["Professional", "Clean"], accent: "#64748b", background: "#f8fafc", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal" },
  chikorita: { name: "Chikorita", description: "Compact split layout for technical fresher profiles.", tags: ["Modern", "Compact"], accent: "#16a34a", background: "#f0fdf4", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small" },
  ditgar: { name: "Ditgar", description: "Sidebar timeline structure for experience stories.", tags: ["Timeline", "Detailed"], accent: "#f97316", background: "#fff7ed", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal" },
  ditto: { name: "Ditto", description: "Minimal spacious two-column look for clean one-page CVs.", tags: ["Minimal", "Clean"], accent: "#a855f7", background: "#faf5ff", layout: "split", pageMargin: "spacious", sectionSpacing: "spacious", fontScale: "large" },
  gengar: { name: "Gengar", description: "Creative sidebar with denser spacing for project-heavy CVs.", tags: ["Creative", "Sidebar"], accent: "#7c3aed", background: "#f5f3ff", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal" },
  glalie: { name: "Glalie", description: "Tight ATS sidebar layout for concise engineering CVs.", tags: ["ATS", "Compact"], accent: "#06b6d4", background: "#ecfeff", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small" },
  kakuna: { name: "Kakuna", description: "Warm timeline layout for growth narratives.", tags: ["Timeline", "Warm"], accent: "#ca8a04", background: "#fefce8", layout: "timeline", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal" },
  lapras: { name: "Lapras", description: "Balanced stacked layout for product and frontend roles.", tags: ["Modern", "Balanced"], accent: "#0ea5e9", background: "#f0f9ff", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal" },
  leafish: { name: "Leafish", description: "Compact split design for academic or internship CVs.", tags: ["Minimal", "Compact"], accent: "#22c55e", background: "#f7fee7", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small" },
  meowth: { name: "Meowth", description: "Large classic typography for readable career summaries.", tags: ["Classic", "Readable"], accent: "#d97706", background: "#fffbeb", layout: "classic", pageMargin: "normal", sectionSpacing: "normal", fontScale: "large" },
  onyx: { name: "Onyx", description: "Dark technical layout with strong section separation.", tags: ["Technical", "Professional"], accent: "#111827", background: "#f9fafb", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal" },
  pikachu: { name: "Pikachu", description: "Bright compact split layout for project portfolios.", tags: ["Modern", "Compact"], accent: "#eab308", background: "#fef9c3", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal" },
  rhyhorn: { name: "Rhyhorn", description: "Structured timeline with smaller type for dense history.", tags: ["Detailed", "Compact"], accent: "#475569", background: "#f1f5f9", layout: "timeline", pageMargin: "normal", sectionSpacing: "normal", fontScale: "small" },
  scizor: { name: "Scizor", description: "Sharp minimal red accent for polished one-page CVs.", tags: ["Clean", "Minimal"], accent: "#dc2626", background: "#fef2f2", layout: "minimal", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal" },
};

const columnTemplates = new Set<Template>([
  "azurill",
  "chikorita",
  "ditgar",
  "ditto",
  "gengar",
  "glalie",
  "leafish",
  "pikachu",
]);

const groupedSectionTemplates = new Set<Template>([
  "bronzor",
  "kakuna",
  "lapras",
  "meowth",
  "onyx",
  "rhyhorn",
  "scizor",
]);

export function getTemplateLayoutCapabilities(template: Template): TemplateLayoutCapabilities {
  const supportsSidebar = columnTemplates.has(template);
  const usesSidebarSections = supportsSidebar || groupedSectionTemplates.has(template);

  return {
    supportsSidebar,
    usesSidebarSections,
    supportsSidebarPosition: template === "gengar",
    supportsSidebarWidth: supportsSidebar,
    supportsSectionIcons: true,
    supportsDividerStyle: true,
  };
}
