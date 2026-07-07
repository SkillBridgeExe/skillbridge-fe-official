import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CvReviewData } from "@shared/api";

export type Step = "input" | "cv-review" | "results" | "builder";
export type AnalysisMode = "cv-only" | "cv-jd";

interface DiagnosisState {
  step: Step;
  isAnalyzing: boolean;
  cvFile: File | null;
  jdFile: File | null;
  jobDescription: string;
  loadingMsgIdx: number;
  loadingProgress: number;
  showJdInput: boolean;
  hasActivatedJdMode: boolean;
  targetStep: Step;
  jdInputMode: "paste" | "file";
  skillTab: "hard" | "soft";
  reviewData: CvReviewData | null;
  apiError: string | null;
  analysisMode: AnalysisMode;
  targetRole: string | null;
  /** Id CV trên BE của lần chấm gần nhất — dùng cho JD match / job reco / builder CTA. */
  lastCvId: string | null;
  /** PDPL consent checkbox — gates Analyze buttons (commit ③) */
  consentAccepted: boolean;
  highlightEvidence: string | null;

  // W41: GitHub corroboration opt-in (persisted via session)
  githubUsername: string | null;
  githubConsent: boolean;

  // Builder-sourced CV state
  isFromBuilder: boolean;
  builderCvId: string | null;
  builderCvName: string | null;

  // Actions
  setStep: (step: Step) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setCvFile: (file: File | null) => void;
  setJdFile: (file: File | null) => void;
  setJobDescription: (desc: string) => void;
  setLoadingMsgIdx: (idx: number | ((prev: number) => number)) => void;
  setLoadingProgress: (progress: number | ((prev: number) => number)) => void;
  setShowJdInput: (show: boolean) => void;
  setHasActivatedJdMode: (active: boolean) => void;
  setTargetStep: (step: Step) => void;
  setJdInputMode: (mode: "paste" | "file") => void;
  setSkillTab: (tab: "hard" | "soft") => void;
  setReviewData: (data: CvReviewData | null) => void;
  setApiError: (error: string | null) => void;
  setAnalysisMode: (mode: AnalysisMode) => void;
  setTargetRole: (role: string | null) => void;
  setLastCvId: (id: string | null) => void;
  setConsentAccepted: (val: boolean) => void;
  setHighlightEvidence: (val: string | null) => void;
  setGithubCredentials: (username: string, consent: boolean) => void;

  // Builder-sourced CV actions
  setIsFromBuilder: (isFromBuilder: boolean) => void;
  setBuilderCvId: (id: string | null) => void;
  setBuilderCvName: (name: string | null) => void;
  clearBuilderState: () => void;

  reset: () => void;
  scanAgain: () => void;
  goBack: () => void;
}

/**
 * Chỉ persist phần kết quả BỀN (để F5 không mất reviewData/lastCvId), TUYỆT ĐỐI
 * không persist cờ tạm (isAnalyzing/apiError...) hay File (cvFile/jdFile — không
 * serialize được). sessionStorage: giữ qua reload, xoá khi đóng tab.
 */
export const persistDiagnosisState = (s: DiagnosisState) => ({
  step: s.step,
  reviewData: s.reviewData,
  lastCvId: s.lastCvId,
  targetRole: s.targetRole,
  analysisMode: s.analysisMode,
  hasActivatedJdMode: s.hasActivatedJdMode,
  consentAccepted: s.consentAccepted,
  githubUsername: s.githubUsername,
  githubConsent: s.githubConsent,
});

export const useDiagnosisStore = create<DiagnosisState>()(
  persist(
    (set) => ({
  step: "input",
  isAnalyzing: false,
  cvFile: null,
  jdFile: null,
  jobDescription: "",
  loadingMsgIdx: 0,
  loadingProgress: 0,
  showJdInput: false,
  hasActivatedJdMode: false,
  targetStep: "cv-review",
  jdInputMode: "paste",
  skillTab: "hard",
  reviewData: null,
  apiError: null,
  analysisMode: "cv-only",
  targetRole: null,
  lastCvId: null,
  consentAccepted: false,
  highlightEvidence: null,
  githubUsername: null,
  githubConsent: false,

  isFromBuilder: false,
  builderCvId: null,
  builderCvName: null,

  setStep: (step) => set({ step }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setCvFile: (cvFile) => set({ cvFile }),
  setJdFile: (jdFile) => set({ jdFile }),
  setJobDescription: (jobDescription) => set({ jobDescription }),
  setLoadingMsgIdx: (val) => set((state) => ({ 
    loadingMsgIdx: typeof val === "function" ? val(state.loadingMsgIdx) : val 
  })),
  setLoadingProgress: (val) => set((state) => ({ 
    loadingProgress: typeof val === "function" ? val(state.loadingProgress) : val 
  })),
  setShowJdInput: (showJdInput) => set({ showJdInput }),
  setHasActivatedJdMode: (hasActivatedJdMode) => set({ hasActivatedJdMode }),
  setTargetStep: (targetStep) => set({ targetStep }),
  setJdInputMode: (jdInputMode) => set({ jdInputMode }),
  setSkillTab: (skillTab) => set({ skillTab }),
  setReviewData: (reviewData) => set({ reviewData }),
  setApiError: (apiError) => set({ apiError }),
  setAnalysisMode: (analysisMode) => set({ analysisMode }),
  setTargetRole: (targetRole) => set({ targetRole }),
  setLastCvId: (lastCvId) => set({ lastCvId }),
  setConsentAccepted: (consentAccepted) => set({ consentAccepted }),
  setHighlightEvidence: (highlightEvidence) => set({ highlightEvidence }),
  setGithubCredentials: (githubUsername, githubConsent) => set({ githubUsername, githubConsent }),

  setIsFromBuilder: (isFromBuilder) => set({ isFromBuilder }),
  setBuilderCvId: (builderCvId) => set({ builderCvId }),
  setBuilderCvName: (builderCvName) => set({ builderCvName }),
  clearBuilderState: () => set({ isFromBuilder: false, builderCvId: null, builderCvName: null }),

  reset: () => set({
    step: "input",
    cvFile: null,
    jdFile: null,
    jobDescription: "",
    loadingProgress: 0,
    showJdInput: false,
    hasActivatedJdMode: false,
    isAnalyzing: false,
    reviewData: null,
    apiError: null,
    analysisMode: "cv-only",
    targetRole: null,
    lastCvId: null,
    consentAccepted: false,
    highlightEvidence: null,
    isFromBuilder: false,
    builderCvId: null,
    builderCvName: null,
  }),

  scanAgain: () => set({
    step: "input",
    jdFile: null,
    jobDescription: "",
    loadingProgress: 0,
    showJdInput: false,
    hasActivatedJdMode: false,
    isAnalyzing: false,
    reviewData: null,
    apiError: null,
    analysisMode: "cv-only",
    targetRole: null,
    lastCvId: null,
    highlightEvidence: null,
    // cvFile is preserved
    // Builder state is preserved so user can re-analyze
  }),

  goBack: () => set((state) => {
    if (state.step === "results") return { step: "cv-review" };
    if (state.step === "cv-review") return { step: "input" };
    if (state.step === "builder") return { step: "input" };
    return state;
  }),
    }),
    {
      name: "skillbridge-diagnosis",
      storage: createJSONStorage(() => sessionStorage),
      partialize: persistDiagnosisState,
    },
  ),
);
