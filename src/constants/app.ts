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
  USER_AVATAR: ['user', 'avatar'] as const,
  USER_SKILLS: ['user', 'skills'] as const,
  BILLING_PLANS: ['billing', 'plans'] as const,
  BILLING_ORDER: (orderCode: string | number) => ['billing', 'order', String(orderCode)] as const,
  BILLING_SUBSCRIPTION: ['billing', 'subscription'] as const,
  BILLING_USAGE: ['billing', 'usage'] as const,
  BILLING_ENTITLEMENTS: ['billing', 'entitlements'] as const,
  ADMIN_BILLING_PLANS: (includeInactive: boolean) => ['admin', 'billing', 'plans', includeInactive] as const,
  ADMIN_BILLING_ORDERS: (query: object) => ['admin', 'billing', 'orders', query] as const,
  ADMIN_BILLING_SUBSCRIPTIONS: (query: object) => ['admin', 'billing', 'subscriptions', query] as const,
  ADMIN_BILLING_MENTOR_BOOKINGS: (query: object) => ['admin', 'billing', 'mentor-bookings', query] as const,
  DIAGNOSIS_HISTORY: ['diagnosis', 'history'] as const,
  INTERVIEW_HISTORY: ['interviews'] as const,
  INTERVIEW_DETAIL: (id: string) => ['interviews', id] as const,
  INTERVIEW_CVS: ['interview', 'cvs'] as const,
  INTERVIEW_CV_MATCHES: (cvId: string) => ['interview', 'cv-matches', cvId] as const,
  ROADMAP_LIST: ['roadmap'] as const,
} as const;
