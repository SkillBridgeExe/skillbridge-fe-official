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
  ADMIN_BILLING_FEATURES: ['admin', 'billing', 'features'] as const,
  ADMIN_BILLING_VOUCHERS: (query: object) => ['admin', 'billing', 'vouchers', query] as const,
  ADMIN_BILLING_ORDERS: (query: object) => ['admin', 'billing', 'orders', query] as const,
  ADMIN_BILLING_SUBSCRIPTIONS: (query: object) => ['admin', 'billing', 'subscriptions', query] as const,
  ADMIN_USERS: (query: object) => ['admin', 'users', query] as const,
  ADMIN_USER: (id: string) => ['admin', 'users', id] as const,
  ADMIN_USER_SUMMARY: (query: object) => ['admin', 'users', 'summary', query] as const,
  MENTOR_SUMMARY: ['mentors', 'summary'] as const,
  MENTOR_FILTERS: ['mentors', 'filters'] as const,
  MENTORS: (query: object) => ['mentors', 'list', query] as const,
  MENTOR: (slug: string) => ['mentors', 'detail', slug] as const,
  MY_MENTOR_PROFILE: ['mentor', 'me', 'profile'] as const,
  MY_MENTOR_AVAILABILITY_TEMPLATE: ['mentor', 'me', 'availability-template'] as const,
  MENTOR_SKILLS: (query: object) => ['mentor', 'skills', query] as const,
  ADMIN_MENTORS: (query: object) => ['admin', 'mentors', query] as const,
  MENTOR_SLOTS: (slug: string, query: object) => ['mentors', 'slots', slug, query] as const,
  MY_MENTOR_SLOTS: (query: object) => ['mentor', 'me', 'slots', query] as const,
  MY_MENTOR_BOOKINGS: ['mentor-bookings', 'me'] as const,
  MENTOR_BOOKING: (id: string) => ['mentor-bookings', id] as const,
  MENTOR_OWNED_BOOKINGS: ['mentor', 'me', 'bookings'] as const,
  ADMIN_MENTOR_BOOKINGS: (query: object) => ['admin', 'billing', 'mentor-bookings', query] as const,
  DIAGNOSIS_HISTORY: ['diagnosis', 'history'] as const,
  INTERVIEW_HISTORY: ['interviews'] as const,
  INTERVIEW_DETAIL: (id: string) => ['interviews', id] as const,
  INTERVIEW_CVS: ['interview', 'cvs'] as const,
  INTERVIEW_CV_MATCHES: (cvId: string) => ['interview', 'cv-matches', cvId] as const,
  ROADMAP_LIST: ['roadmap'] as const,
} as const;
