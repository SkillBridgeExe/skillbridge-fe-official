const API = "/api";

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${API}/auth/login`,
    REGISTER: `${API}/auth/register`,
    REFRESH: `${API}/auth/refresh`,
    ME: `${API}/auth/me`,
  },

  DIAGNOSIS: {
    CV_ANALYZE: `${API}/cv-analyze`,
    CV_JD_REVIEW: `${API}/cv-jd-review`,
    ANALYZE: `${API}/cv-analyze`,
    HISTORY: `${API}/diagnosis/history`,
  },

  INTERVIEW: {
    START: `${API}/interview/start`,
    ANSWER: `${API}/interview/answer`,
    SUBMIT: `${API}/interview/answer`,
    END: `${API}/interview/end`,
    SAVE_HISTORY: `${API}/interview/save-history`,
    HISTORY: `${API}/interview/history`,
    TTS: `${API}/interview/tts`,
    LIVE_TOKEN: `${API}/interview/live-token`,
    DETAIL: (id: string) => `${API}/interview/${id}`,
  },

  ROADMAP: {
    GENERATE: `${API}/roadmap/generate`,
    LIST: `${API}/roadmap`,
  },

  USER: {
    PROFILE: `${API}/users/profile`,
    UPDATE: `${API}/users/profile`,
  },
} as const;
