const API = "/api";

/**
 * API endpoint constants — mirror of the NestJS backend (skillbridge-ai).
 *
 * Canonical source: BE controllers (trích 2026-06-07 — docs/FE-diagnosis-rewire-plan.md §5).
 * FE only ever calls NestJS (`/api/*`) qua same-origin proxy. OpenAI Realtime
 * uses a short-lived client secret brokered by the BE; FE never stores provider
 * API keys.
 */
export const API_ROUTES = {
  // §1.1 Auth (auth.controller.ts)
  AUTH: {
    REGISTER: `${API}/auth/register`,
    VERIFY_EMAIL: `${API}/auth/verify-email`,
    RESEND_VERIFICATION: `${API}/auth/resend-verification-email`,
    LOGIN: `${API}/auth/login`,
    GOOGLE: `${API}/auth/google`,
    REFRESH: `${API}/auth/refresh`,
    LOGOUT: `${API}/auth/logout`,
    ME: `${API}/auth/me`,
  },

  // §1.2 CV (cvs.controller.ts) — POST /api/cvs = upload + chấm ĐỒNG BỘ (multipart:
  // file, title?, targetRole?, consentAccepted bắt buộc). Quota 10 upload/24h.
  CV: {
    LIST: `${API}/cvs`,
    CREATE: `${API}/cvs`,
    DETAIL: (id: string) => `${API}/cvs/${id}`,
    DELETE: (id: string) => `${API}/cvs/${id}`,
    FILE: (id: string) => `${API}/cvs/${id}/file`,
    // CV × JD match (cv-matches.controller.ts)
    MATCH: (cvId: string) => `${API}/cvs/${cvId}/match`,
    MATCH_FILE: (cvId: string) => `${API}/cvs/${cvId}/match/file`,
    MATCHES: (cvId: string) => `${API}/cvs/${cvId}/matches`,
    MATCH_DETAIL: (cvId: string, matchId: string) => `${API}/cvs/${cvId}/matches/${matchId}`,
    INTERVIEW_PLAN: (cvId: string) => `${API}/cvs/${cvId}/interview-plan`,
    GITHUB_EVIDENCE: (cvId: string) => `${API}/cvs/${cvId}/github-evidence`,
    // Top-N job thật cho CV (jobs.controller.ts) — ?limit&role
    JOB_RECOMMENDATIONS: (cvId: string) => `${API}/cvs/${cvId}/job-recommendations`,
    // CV Builder (W5 sẽ dùng — endpoints đã LIVE trên BE)
    BUILDER_CREATE: `${API}/cvs/builder`,
    BUILDER_UPDATE: (id: string) => `${API}/cvs/${id}/builder`,
    BUILDER_EVALUATE: (id: string) => `${API}/cvs/${id}/builder/evaluate`,
    BUILDER_REWRITE: (id: string) => `${API}/cvs/${id}/builder/rewrite`,
    RENDER_PDF: (id: string) => `${API}/cvs/${id}/render-pdf`,
  },

  // §1.4 Diagnosis (diagnosis.controller.ts)
  DIAGNOSIS: {
    /** Chấm LẠI một CV đã upload — body { cvId }. */
    CV_REVIEW: `${API}/diagnosis/cv-review`,
    /** Alias của GET /api/cvs (paginated list). */
    HISTORY: `${API}/diagnosis/history`,
  },

  // Gap-report-derived artifacts on a persisted CV/JD match.
  CV_MATCHES: {
    GAP_REPORT: (matchId: string) => `${API}/cv-matches/${matchId}/gap-report`,
    ROADMAP: (matchId: string) => `${API}/cv-matches/${matchId}/roadmap`,
    INTERVIEW_PLAN: (matchId: string) => `${API}/cv-matches/${matchId}/interview-plan`,
  },

  // Unified plan entitlements and quotas.
  ME: {
    ENTITLEMENTS: `${API}/me/entitlements`,
  },

  // Skill trends (trends.controller.ts) — endpoints require JWT.
  TRENDS: {
    SKILLS: `${API}/trends/skills`,
    SKILL_GAP: (cvId: string) => `${API}/trends/skills/gap/${cvId}`,
    INSIGHT: `${API}/trends/insight`,
  },

  // §1.5 Interview
  INTERVIEW: {
    START: `${API}/interview/start`,
    TURN: `${API}/interview/turn`,
    END: `${API}/interview/end`,
    HISTORY: `${API}/interview/history`,
    DETAIL: (id: string) => `${API}/interview/sessions/${id}`,
    REALTIME_TOKEN: (id: string) => `${API}/interview/sessions/${id}/realtime-token`,
    QUESTION_AUDIO: (id: string) => `${API}/interview/sessions/${id}/question-audio`,
  },

  // §1.6 Roadmap
  ROADMAP: {
    GENERATE: `${API}/roadmaps/generate`,
    LIST: `${API}/roadmaps`,
    DETAIL: (id: string) => `${API}/roadmaps/${id}`,
    PROGRESS: (id: string) => `${API}/roadmaps/${id}/progress`,
  },

  BILLING: {
    PLANS: `${API}/billing/plans`,
    CHECKOUT: `${API}/billing/checkout`,
    ORDER: (orderCode: string | number) => `${API}/billing/orders/${orderCode}`,
    RECONCILE_ORDER: (orderCode: string | number) => `${API}/billing/orders/${orderCode}/reconcile`,
    MY_SUBSCRIPTION: `${API}/billing/me/subscription`,
    MY_USAGE: `${API}/billing/me/usage`,
  },

  ADMIN_BILLING: {
    PLANS: `${API}/admin/billing/plans`,
    PLAN: (code: string) => `${API}/admin/billing/plans/${code}`,
    PLAN_FEATURES: (code: string) => `${API}/admin/billing/plans/${code}/features`,
    ORDERS: `${API}/admin/billing/orders`,
    SUBSCRIPTIONS: `${API}/admin/billing/subscriptions`,
    MENTOR_BOOKINGS: `${API}/admin/billing/mentor-bookings`,
  },

  ADMIN_USERS: {
    LIST: `${API}/admin/users`,
    SUMMARY: `${API}/admin/users/summary`,
    DETAIL: (id: string) => `${API}/admin/users/${id}`,
    STATUS: (id: string) => `${API}/admin/users/${id}/status`,
    ROLES: (id: string) => `${API}/admin/users/${id}/roles`,
  },

  USER: {
    PROFILE: `${API}/users/me/profile`,
    AVATAR: `${API}/users/me/avatar`,
    SKILLS: `${API}/users/me/skills`,
  },
} as const;
