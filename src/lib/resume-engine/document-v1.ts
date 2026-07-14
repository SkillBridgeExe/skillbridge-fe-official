export type CustomSectionItem = {
  id: string;
  heading?: string;
  body: string;
};

/**
 * Custom sections are content, not executable templates: opaque local IDs and
 * validated plain text only. They render through the shared PDF section
 * primitives — never user code, external CSS, raw SVG, or remote packages.
 */
export type CustomSection = {
  id: string;
  title: string;
  placement: "main" | "sidebar";
  items: CustomSectionItem[];
  visible: boolean;
};

export type LayoutPage = {
  id: string;
  name?: string;
  fullWidth?: boolean;
  main: string[];
  sidebar: string[];
};

export type ResumeLayoutPlan = {
  pages: LayoutPage[];
};

export interface ResumeDocumentV1 {
  schemaVersion: 1;
  id: string | null;
  title: string;
  language: "vi" | "en";
  basics: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
    github: string;
    targetPosition: string;
  };
  sections: {
    summary: {
      content: string;
      mode: "manual" | "ai";
    };
    experience: {
      items: Array<{
        id: string;
        company: string;
        position: string;
        startDate: string;
        endDate: string;
        description: string;
        responsibilities: string;
        achievements: string;
        aiRewrite: string;
      }>;
    };
    projects: {
      items: Array<{
        id: string;
        name: string;
        role: string;
        link: string;
        description: string;
        tools: string;
        contribution: string;
        result: string;
      }>;
    };
    education: {
      items: Array<{
        id: string;
        school: string;
        major: string;
        degree: string;
        startYear: string;
        endYear: string;
        gpa: string;
        coursework: string;
        achievements: string;
      }>;
    };
    skills: {
      technicalSkills: string[];
      softSkills: string[];
      tools: string[];
      languages: string[];
    };
    certifications: {
      items: Array<{
        id: string;
        name: string;
        organization: string;
        issueDate: string;
        credentialUrl: string;
      }>;
    };
    custom?: CustomSection[];
  };
  metadata: {
    templateId: string;
    resumeFontFamily?: "inter" | "serif" | "roboto" | "merriweather" | "mono";
    resumeFontScale: "small" | "normal" | "large";
    resumeHeadingScale?: "match" | "prominent" | "subtle";
    resumeBaseFontSize?: number;
    resumeLineHeight?: "tight" | "normal" | "relaxed";
    resumeDensity?: "compact" | "comfortable";
    resumePageMargin?: "compact" | "normal" | "spacious";
    resumeSectionSpacing?: "compact" | "normal" | "spacious";
    resumeSidebarPosition?: "left" | "right";
    resumeSidebarWidth?: "narrow" | "normal" | "wide";
    resumeDividerStyle?: "none" | "line" | "accent" | "subtle";
    resumeAccentColor: string;
    resumeHideSectionIcons: boolean;
    resumeAtsSafeMode?: boolean;
    resumeTextColor?: string;
    resumePictureVisible?: boolean;
    resumePictureShape?: "circle" | "rounded" | "square";
    resumePictureSize?: number;
    resumePictureBorderWidth?: number;
    resumePictureBorderColor?: string;
    sectionVisibility: Record<string, boolean>;
    sectionOrder: string[];
    /**
     * Canonical layout plan (P4). When present it owns page order and
     * per-page main/sidebar section placement; `sectionOrder` stays as a
     * flattened mirror so older readers keep working. Docs without `layout`
     * are normalized from `sectionOrder` on load.
     */
    layout?: ResumeLayoutPlan;
    careerLevel: string;
    industry: string;
  };
}

export function createDefaultResumeDocumentV1(): ResumeDocumentV1 {
  return {
    schemaVersion: 1,
    id: null,
    title: "Untitled Resume",
    language: "vi",
    basics: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      portfolio: "",
      github: "",
      targetPosition: "",
    },
    sections: {
      summary: { content: "", mode: "manual" },
      experience: { items: [] },
      projects: { items: [] },
      education: { items: [] },
      skills: {
        technicalSkills: [],
        softSkills: [],
        tools: [],
        languages: [],
      },
      certifications: { items: [] },
    },
    metadata: {
      templateId: "onyx",
      resumeFontFamily: "inter",
      resumeFontScale: "normal",
      resumeLineHeight: "normal",
      resumePageMargin: "normal",
      resumeSectionSpacing: "normal",
      resumeSidebarPosition: "left",
      resumeSidebarWidth: "normal",
      resumeDividerStyle: "line",
      resumeAccentColor: "#0f172a",
      resumeHideSectionIcons: false,
      sectionVisibility: {
        summary: true,
        experience: true,
        education: true,
        projects: true,
        skills: true,
        certifications: true,
      },
      sectionOrder: ["summary", "experience", "education", "projects", "skills", "certifications"],
      careerLevel: "",
      industry: "",
    },
  };
}
