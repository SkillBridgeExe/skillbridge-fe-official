export const resumeDocumentPaths = {
  // Basics
  basicsFullName: () => `/basics/fullName` as const,
  basicsEmail: () => `/basics/email` as const,
  basicsPhone: () => `/basics/phone` as const,
  basicsLocation: () => `/basics/location` as const,
  basicsLinkedin: () => `/basics/linkedin` as const,
  basicsPortfolio: () => `/basics/portfolio` as const,
  basicsGithub: () => `/basics/github` as const,
  basicsTargetPosition: () => `/basics/targetPosition` as const,

  // Summary
  summaryContent: () => `/sections/summary/content` as const,
  summaryMode: () => `/sections/summary/mode` as const,

  // Experience
  experienceCompany: (id: string) => `/sections/experience/items/${id}/company` as const,
  experiencePosition: (id: string) => `/sections/experience/items/${id}/position` as const,
  experienceDescription: (id: string) => `/sections/experience/items/${id}/description` as const,
  experienceResponsibilities: (id: string) => `/sections/experience/items/${id}/responsibilities` as const,
  experienceAchievements: (id: string) => `/sections/experience/items/${id}/achievements` as const,
  
  // Projects
  projectName: (id: string) => `/sections/projects/items/${id}/name` as const,
  projectRole: (id: string) => `/sections/projects/items/${id}/role` as const,
  projectDescription: (id: string) => `/sections/projects/items/${id}/description` as const,
  projectTools: (id: string) => `/sections/projects/items/${id}/tools` as const,
  projectContribution: (id: string) => `/sections/projects/items/${id}/contribution` as const,
  projectResult: (id: string) => `/sections/projects/items/${id}/result` as const,

  // Education
  educationSchool: (id: string) => `/sections/education/items/${id}/school` as const,
  educationMajor: (id: string) => `/sections/education/items/${id}/major` as const,
  educationCoursework: (id: string) => `/sections/education/items/${id}/coursework` as const,
  educationAchievements: (id: string) => `/sections/education/items/${id}/achievements` as const,

  // Skills
  skillsTechnical: () => `/sections/skills/technicalSkills` as const,
  skillsSoft: () => `/sections/skills/softSkills` as const,
  skillsTools: () => `/sections/skills/tools` as const,
  skillsLanguages: () => `/sections/skills/languages` as const,

  // Certifications
  certificationName: (id: string) => `/sections/certifications/items/${id}/name` as const,
  certificationOrganization: (id: string) => `/sections/certifications/items/${id}/organization` as const,
};
