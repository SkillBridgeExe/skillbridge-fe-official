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
  thumbnailUrl: string;
};

export type TemplateCapabilities = {
  supportsAvatar: boolean;
  supportsSidebar: boolean;
  supportsTwoColumn: boolean;
  usesSidebarSections: boolean;
  supportsSidebarPosition: boolean;
  supportsSidebarWidth: boolean;
  supportsSectionIcons: boolean;
  supportsDividerStyle: boolean;
  supportsAccentColor: boolean;
  supportsTypography: boolean;
  supportsSpacing: boolean;
  supportsDenseMode: boolean;
  supportsCustomSectionOrder: boolean;
  supportsCustomSections: boolean;
  supportsMultiPage: boolean;
};

export const TEMPLATE_PREVIEWS: Record<Template, TemplatePreviewMeta> = {
  azurill: { name: "Azurill", description: "Classic ATS CV with a calm two-column header.", tags: ["ATS", "Classic"], accent: "#3b82f6", background: "#eff6ff", layout: "split", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal", thumbnailUrl: "/resume-templates/azurill.png" },
  bronzor: { name: "Bronzor", description: "Professional section-label layout for profile-heavy CVs.", tags: ["Professional", "Clean"], accent: "#64748b", background: "#f8fafc", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal", thumbnailUrl: "/resume-templates/bronzor.png" },
  chikorita: { name: "Chikorita", description: "Compact split layout for technical fresher profiles.", tags: ["Modern", "Compact"], accent: "#16a34a", background: "#f0fdf4", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small", thumbnailUrl: "/resume-templates/chikorita.png" },
  ditgar: { name: "Ditgar", description: "Sidebar timeline structure for experience stories.", tags: ["Timeline", "Detailed"], accent: "#f97316", background: "#fff7ed", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal", thumbnailUrl: "/resume-templates/ditgar.png" },
  ditto: { name: "Ditto", description: "Minimal spacious two-column look for clean one-page CVs.", tags: ["Minimal", "Clean"], accent: "#a855f7", background: "#faf5ff", layout: "split", pageMargin: "spacious", sectionSpacing: "spacious", fontScale: "large", thumbnailUrl: "/resume-templates/ditto.png" },
  gengar: { name: "Gengar", description: "Creative sidebar with denser spacing for project-heavy CVs.", tags: ["Creative", "Sidebar"], accent: "#7c3aed", background: "#f5f3ff", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal", thumbnailUrl: "/resume-templates/gengar.png" },
  glalie: { name: "Glalie", description: "Tight ATS sidebar layout for concise engineering CVs.", tags: ["ATS", "Compact"], accent: "#06b6d4", background: "#ecfeff", layout: "sidebar", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small", thumbnailUrl: "/resume-templates/glalie.png" },
  kakuna: { name: "Kakuna", description: "Warm timeline layout for growth narratives.", tags: ["Timeline", "Warm"], accent: "#ca8a04", background: "#fefce8", layout: "timeline", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal", thumbnailUrl: "/resume-templates/kakuna.png" },
  lapras: { name: "Lapras", description: "Balanced stacked layout for product and frontend roles.", tags: ["Modern", "Balanced"], accent: "#0ea5e9", background: "#f0f9ff", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal", thumbnailUrl: "/resume-templates/lapras.png" },
  leafish: { name: "Leafish", description: "Compact split design for academic or internship CVs.", tags: ["Minimal", "Compact"], accent: "#22c55e", background: "#f7fee7", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "small", thumbnailUrl: "/resume-templates/leafish.png" },
  meowth: { name: "Meowth", description: "Large classic typography for readable career summaries.", tags: ["Classic", "Readable"], accent: "#d97706", background: "#fffbeb", layout: "classic", pageMargin: "normal", sectionSpacing: "normal", fontScale: "large", thumbnailUrl: "/resume-templates/meowth.png" },
  onyx: { name: "Onyx", description: "Dark technical layout with strong section separation.", tags: ["Technical", "Professional"], accent: "#111827", background: "#f9fafb", layout: "minimal", pageMargin: "normal", sectionSpacing: "normal", fontScale: "normal", thumbnailUrl: "/resume-templates/onyx.png" },
  pikachu: { name: "Pikachu", description: "Bright compact split layout for project portfolios.", tags: ["Modern", "Compact"], accent: "#eab308", background: "#fef9c3", layout: "split", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal", thumbnailUrl: "/resume-templates/pikachu.png" },
  rhyhorn: { name: "Rhyhorn", description: "Structured timeline with smaller type for dense history.", tags: ["Detailed", "Compact"], accent: "#475569", background: "#f1f5f9", layout: "timeline", pageMargin: "normal", sectionSpacing: "normal", fontScale: "small", thumbnailUrl: "/resume-templates/rhyhorn.png" },
  scizor: { name: "Scizor", description: "Sharp minimal red accent for polished one-page CVs.", tags: ["Clean", "Minimal"], accent: "#dc2626", background: "#fef2f2", layout: "minimal", pageMargin: "compact", sectionSpacing: "compact", fontScale: "normal", thumbnailUrl: "/resume-templates/scizor.png" },
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

const avatarTemplates = new Set<Template>([
  "azurill",
  "bronzor",
  "chikorita",
  "ditgar",
  "ditto",
  "gengar",
  "glalie",
  "kakuna",
  "lapras",
  "leafish",
  "pikachu",
  "rhyhorn",
]);

export function getTemplateCapabilities(template: Template): TemplateCapabilities {
  const supportsSidebar = columnTemplates.has(template);
  const supportsTwoColumn = supportsSidebar || TEMPLATE_PREVIEWS[template]?.layout === "split";
  const usesSidebarSections = supportsSidebar || groupedSectionTemplates.has(template);

  return {
    supportsAvatar: avatarTemplates.has(template),
    supportsSidebar,
    supportsTwoColumn,
    usesSidebarSections,
    supportsSidebarPosition: template === "gengar",
    supportsSidebarWidth: supportsSidebar,
    supportsSectionIcons: true,
    supportsDividerStyle: true,
    supportsAccentColor: true,
    supportsTypography: true,
    supportsSpacing: true,
    supportsDenseMode: true,
    supportsCustomSectionOrder: true,
    // Every template resolves sections generically through shared
    // filterSections(page.main/page.sidebar) and document.tsx maps
    // layout.pages, so custom sections and multi-page work everywhere.
    supportsCustomSections: true,
    supportsMultiPage: true,
  };
}

export const getTemplateLayoutCapabilities = getTemplateCapabilities;
