// ─── Application Constants ──────────────────────────────────────────
// Hằng số dùng chung toàn app. KHÔNG hardcode magic numbers trong component.

export const APP = {
  NAME: 'SkillBridge',
  DESCRIPTION: 'AI-powered Career Development Platform',
  VERSION: '1.0.0',
} as const;

export const LIMITS = {
  MAX_CV_UPLOAD_SIZE_MB: 10,
  MAX_CV_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024,
  SUPPORTED_CV_FORMATS: ['.pdf', '.docx', '.doc'] as const,
  MAX_INTERVIEW_DURATION_MINUTES: 30,
  DEFAULT_INTERVIEW_DURATION_MINUTES: 15,
} as const;

export const QUERY_KEYS = {
  USER_PROFILE: ['user', 'profile'] as const,
  DIAGNOSIS_HISTORY: ['diagnosis', 'history'] as const,
  INTERVIEW_HISTORY: ['interviews'] as const,
  INTERVIEW_DETAIL: (id: string) => ['interviews', id] as const,
  ROADMAP_LIST: ['roadmap'] as const,
} as const;
