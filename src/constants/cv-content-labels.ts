import type { CvLanguage } from "@/store/useCvBuilderStore";

/**
 * Nhãn IN TRÊN BẢN CV (live preview + PDF render) — theo NGÔN NGỮ NỘI DUNG CV
 * (`store.cvLanguage`), KHÁC với ngôn ngữ giao diện app (react-i18next).
 *
 * Trục này độc lập: app UI có thể đang EN nhưng CV soạn bằng VI (hoặc ngược lại).
 * Builder chrome (nav/section header/nút) dùng app-lang; còn các nhãn ở đây
 * phải khớp ngôn ngữ của chính bản CV để preview/PDF nhất quán.
 */
export interface CvContentLabels {
  summary: string;
  experience: string;
  education: string;
  projects: string;
  skills: string;
  certifications: string;
  technical: string;
  tools: string;
  softSkills: string;
  languages: string;
  technologies: string;
  gpa: string;
  /** Nối giữa bằng cấp và chuyên ngành: "Bachelor in CS" / "Bachelor ngành CS". */
  degreeIn: string;
  namePlaceholder: string;
  positionPlaceholder: string;
  previewTitle: string;
}

export const CV_CONTENT_LABELS: Record<CvLanguage, CvContentLabels> = {
  en: {
    summary: "Professional Summary",
    experience: "Work Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    technical: "Technical",
    tools: "Tools",
    softSkills: "Soft Skills",
    languages: "Languages",
    technologies: "Technologies",
    gpa: "GPA",
    degreeIn: "in",
    namePlaceholder: "YOUR NAME",
    positionPlaceholder: "Target Position",
    previewTitle: "CV PREVIEW",
  },
  vi: {
    summary: "Tóm tắt chuyên môn",
    experience: "Kinh nghiệm làm việc",
    education: "Học vấn",
    projects: "Dự án",
    skills: "Kỹ năng",
    certifications: "Chứng chỉ",
    technical: "Kỹ thuật",
    tools: "Công cụ",
    softSkills: "Kỹ năng mềm",
    languages: "Ngôn ngữ",
    technologies: "Công nghệ",
    gpa: "GPA",
    degreeIn: "ngành",
    namePlaceholder: "HỌ VÀ TÊN",
    positionPlaceholder: "Vị trí ứng tuyển",
    previewTitle: "BẢN XEM TRƯỚC CV",
  },
};
