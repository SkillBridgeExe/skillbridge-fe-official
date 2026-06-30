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
    FORGOT_PASSWORD: `${API}/auth/forgot-password`,
    RESET_PASSWORD: `${API}/auth/reset-password`,
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
    // CV-only corner-advisor chat (no JD match) — mirror of CV_MATCHES.CHAT but
    // grounded in the CV review alone. Used when there is no JD match id.
    DIAGNOSIS_CHAT: (cvId: string) => `${API}/cvs/${cvId}/diagnosis-chat`,
    // Top-N job thật cho CV (jobs.controller.ts) — ?limit&role
    JOB_RECOMMENDATIONS: (cvId: string) => `${API}/cvs/${cvId}/job-recommendations`,
    // CV Builder (W5 sẽ dùng — endpoints đã LIVE trên BE)
    BUILDER_CREATE: `${API}/cvs/builder`,
    BUILDER_UPDATE: (id: string) => `${API}/cvs/${id}/builder`,
    BUILDER_EVALUATE: (id: string) => `${API}/cvs/${id}/builder/evaluate`,
    BUILDER_REWRITE: (id: string) => `${API}/cvs/${id}/builder/rewrite`,
    // Story → Career Target (deterministic role inference, NO LLM, no quota). 1b endpoint = Khoa.
    BUILDER_STORY: (id: string) => `${API}/cvs/${id}/builder/story`,
    RENDER_PDF: (id: string) => `${API}/cvs/${id}/render-pdf`,
    // Companion / CV Assistant (PR #126)
    ASSISTANT_ANALYZE: (id: string) => `${API}/cvs/${id}/builder/assistant/analyze`,
    ASSISTANT_REWRITE: (id: string) => `${API}/cvs/${id}/builder/assistant/rewrite`,
    ASSISTANT_SKILLS_NUDGE: (id: string) => `${API}/cvs/${id}/builder/assistant/skills-nudge`,
    ASSISTANT_EXTRACT: (id: string) => `${API}/cvs/${id}/builder/assistant/extract`,
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
    NEXT_STEPS: (matchId: string) => `${API}/cv-matches/${matchId}/next-steps`,
    /** Corner-advisor two-way chat (BE endpoint built separately). */
    CHAT: (matchId: string) => `${API}/cv-matches/${matchId}/chat`,
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

  LEARNING: {
    CHAT: `${API}/learning/chat`,
    CHAT_HISTORY: (conversationId: string) => `${API}/learning/chat/${conversationId}`,
    SESSION_PROGRESS: (sessionId: string) =>
      `${API}/learning/sessions/${encodeURIComponent(sessionId)}/progress`,
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
    MENTOR_BOOKING_REFUND: (bookingId: string) =>
      `${API}/admin/billing/mentor-bookings/${bookingId}/refund`,
  },

  ADMIN_USERS: {
    LIST: `${API}/admin/users`,
    SUMMARY: `${API}/admin/users/summary`,
    DETAIL: (id: string) => `${API}/admin/users/${id}`,
    STATUS: (id: string) => `${API}/admin/users/${id}/status`,
    ROLES: (id: string) => `${API}/admin/users/${id}/roles`,
  },

  MENTORS: {
    SUMMARY: `${API}/mentors/summary`,
    FILTERS: `${API}/mentors/filters`,
    LIST: `${API}/mentors`,
    DETAIL: (slug: string) => `${API}/mentors/${slug}`,
    AVATAR: (slug: string) => `${API}/mentors/${slug}/avatar`,
    SLOTS: (slug: string) => `${API}/mentors/${slug}/slots`,
    MY_PROFILE: `${API}/mentors/me/profile`,
    SUBMIT_PROFILE: `${API}/mentors/me/profile/submit`,
    MY_SLOTS: `${API}/mentors/me/slots`,
    MY_SLOT: (slotId: string) => `${API}/mentors/me/slots/${slotId}`,
    MY_BOOKINGS: `${API}/mentors/me/bookings`,
    MY_BOOKING_MEETING_LINK: (bookingId: string) =>
      `${API}/mentors/me/bookings/${bookingId}/meeting-link`,
    MY_BOOKING_COMPLETE: (bookingId: string) =>
      `${API}/mentors/me/bookings/${bookingId}/complete`,
    MY_BOOKING_CANCEL: (bookingId: string) =>
      `${API}/mentors/me/bookings/${bookingId}/cancel`,
  },

  MENTOR_BOOKINGS: {
    CREATE: `${API}/mentor-bookings`,
    MY_LIST: `${API}/mentor-bookings/me`,
    DETAIL: (bookingId: string) => `${API}/mentor-bookings/${bookingId}`,
    PAY_REMAINING: (bookingId: string) =>
      `${API}/mentor-bookings/${bookingId}/pay-remaining`,
    CANCEL: (bookingId: string) => `${API}/mentor-bookings/${bookingId}/cancel`,
    REVIEW: (bookingId: string) => `${API}/mentor-bookings/${bookingId}/review`,
  },

  ADMIN_MENTORS: {
    LIST: `${API}/admin/mentors`,
    STATUS: (profileId: string) => `${API}/admin/mentors/${profileId}/status`,
    AVATAR: (profileId: string) => `${API}/admin/mentors/${profileId}/avatar`,
  },

  SKILLS: {
    LIST: `${API}/skills`,
  },

  USER: {
    PROFILE: `${API}/users/me/profile`,
    AVATAR: `${API}/users/me/avatar`,
    SKILLS: `${API}/users/me/skills`,
  },

  // ── §4 Public job discovery ───────────────────────────────────────────
  JOBS: {
    LIST: `${API}/jobs`,
    FILTERS: `${API}/jobs/filters`,
    DETAIL: (slug: string) => `${API}/jobs/${slug}`,
    MATCH: (jobId: string) => `${API}/jobs/${jobId}/match`,
    APPLY: (jobId: string) => `${API}/jobs/${jobId}/applications`,
    REPORT: (jobId: string) => `${API}/jobs/${jobId}/reports`,
  },

  // ── §5.2 Saved jobs (USER) ────────────────────────────────────────────
  SAVED_JOBS: {
    LIST: `${API}/users/me/saved-jobs`,
    TOGGLE: (jobId: string) => `${API}/users/me/saved-jobs/${jobId}`,
  },

  // ── §5.4 My applications (USER) ───────────────────────────────────────
  MY_APPLICATIONS: {
    LIST: `${API}/users/me/job-applications`,
    DETAIL: (id: string) => `${API}/users/me/job-applications/${id}`,
    WITHDRAW: (id: string) => `${API}/users/me/job-applications/${id}/withdraw`,
  },

  // ── §4.4 Public company ───────────────────────────────────────────────
  COMPANIES: {
    DETAIL: (slug: string) => `${API}/companies/${slug}`,
    JOBS: (slug: string) => `${API}/companies/${slug}/jobs`,
    LOGO: (slug: string) => `${API}/companies/${slug}/logo`,
    COVER: (slug: string) => `${API}/companies/${slug}/cover`,
  },

  // ── §6 Business company onboarding ────────────────────────────────────
  BUSINESS_COMPANY: {
    GET: `${API}/business/company`,
    UPDATE: `${API}/business/company`,
    SEND_VERIFY: `${API}/business/company/work-email/send-verification`,
    VERIFY: `${API}/business/company/work-email/verify`,
    LOGO: `${API}/business/company/logo`,
    COVER: `${API}/business/company/cover`,
    SUBMIT: `${API}/business/company/submit`,
  },

  // ── §7–8 Business job editor + applicant pipeline ─────────────────────
  BUSINESS_JOBS: {
    LIST: `${API}/business/jobs`,
    CREATE: `${API}/business/jobs`,
    DETAIL: (jobId: string) => `${API}/business/jobs/${jobId}`,
    DRAFT: (jobId: string) => `${API}/business/jobs/${jobId}/draft`,
    EXTRACT_SKILLS: (jobId: string) => `${API}/business/jobs/${jobId}/draft/extract-skills`,
    SKILLS: (jobId: string) => `${API}/business/jobs/${jobId}/draft/skills`,
    PUBLISH: (jobId: string) => `${API}/business/jobs/${jobId}/publish`,
    CLOSE: (jobId: string) => `${API}/business/jobs/${jobId}/close`,
    DUPLICATE: (jobId: string) => `${API}/business/jobs/${jobId}/duplicate`,
    DELETE: (jobId: string) => `${API}/business/jobs/${jobId}`,
    APPLICATIONS: (jobId: string) => `${API}/business/jobs/${jobId}/applications`,
  },

  // ── §8 Business application detail ────────────────────────────────────
  BUSINESS_APPLICATIONS: {
    DETAIL: (appId: string) => `${API}/business/applications/${appId}`,
    CV: (appId: string) => `${API}/business/applications/${appId}/cv`,
    STATUS: (appId: string) => `${API}/business/applications/${appId}/status`,
  },

  // ── §9 Admin business review + job reports/takedown ───────────────────
  ADMIN_BUSINESS: {
    PROFILES: `${API}/admin/business-profiles`,
    PROFILE: (id: string) => `${API}/admin/business-profiles/${id}`,
    PROFILE_STATUS: (id: string) => `${API}/admin/business-profiles/${id}/status`,
    PROFILE_LOGO: (id: string) => `${API}/admin/business-profiles/${id}/logo`,
    PROFILE_COVER: (id: string) => `${API}/admin/business-profiles/${id}/cover`,
  },

  ADMIN_JOBS: {
    DETAIL: (jobId: string) => `${API}/admin/jobs/${jobId}`,
    STATUS: (jobId: string) => `${API}/admin/jobs/${jobId}/status`,
    REPORTS: `${API}/admin/job-reports`,
    RESOLVE_REPORT: (reportId: string) => `${API}/admin/job-reports/${reportId}`,
  },
} as const;
