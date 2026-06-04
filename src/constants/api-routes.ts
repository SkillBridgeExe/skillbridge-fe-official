const API = "/api";

/**
 * API endpoint constants — mirror of docs/api-contract.md (FE ↔ .NET public API).
 *
 * Canonical source: docs/api-contract.md. FE only ever calls .NET (`/api/*`);
 * the one exception is the Gemini Live WebSocket, which uses an ephemeral token
 * brokered by .NET (see INTERVIEW.LIVE_TOKEN).
 *
 * NOTE: FE currently runs on mock auth/data — several endpoints are not yet wired
 * to a live backend. Keys tagged "legacy" are pre-.NET paths still referenced by
 * mock service code; they will be migrated to the canonical paths during the API
 * wiring phase (see docs/NEXT_TASKS.md, Features 2–5).
 */
export const API_ROUTES = {
  // §1.1 Auth
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

  // §1.2 CV (upload / list / detail / delete)
  CV: {
    LIST: `${API}/cvs`,
    CREATE: `${API}/cvs`,
    DETAIL: (id: string) => `${API}/cvs/${id}`,
    DELETE: (id: string) => `${API}/cvs/${id}`,
  },

  // §1.3 Job Description
  JOB_DESCRIPTION: {
    CREATE: `${API}/job-descriptions`,
  },

  // §1.4 Diagnosis (CV review + CV/JD match)
  DIAGNOSIS: {
    CV_REVIEW: `${API}/diagnosis/cv-review`,
    CV_JD_MATCH: `${API}/diagnosis/cv-jd-match`,
    HISTORY: `${API}/diagnosis/history`,
    MATCH_DETAIL: (id: string) => `${API}/diagnosis/matches/${id}`,

    // legacy (pre-.NET mock services) — migrate during API wiring
    CV_ANALYZE: `${API}/cv-analyze`,
    CV_JD_REVIEW: `${API}/cv-jd-review`,
    ANALYZE: `${API}/cv-analyze`,
  },

  // §1.5 Interview
  INTERVIEW: {
    START: `${API}/interview/start`,
    ANSWER: `${API}/interview/answer`,
    SUBMIT: `${API}/interview/answer`,
    END: `${API}/interview/end`,
    HISTORY: `${API}/interview/history`,
    DETAIL: (id: string) => `${API}/interview/sessions/${id}`,
    LIVE_TOKEN: `${API}/interview/live-token`,

    // FE-internal helpers (not part of the .NET contract)
    SAVE_HISTORY: `${API}/interview/save-history`,
    TTS: `${API}/interview/tts`,
  },

  // §1.6 Roadmap
  ROADMAP: {
    GENERATE: `${API}/roadmaps/generate`,
    LIST: `${API}/roadmaps`,
    DETAIL: (id: string) => `${API}/roadmaps/${id}`,
    PROGRESS: (id: string) => `${API}/roadmaps/${id}/progress`,
  },

  // Profile comes from /api/auth/me in the MVP contract.
  // (A dedicated update-profile endpoint is not yet defined in docs/api-contract.md.)
  USER: {
    PROFILE: `${API}/auth/me`,
    UPDATE: `${API}/users/profile`,
  },
} as const;
