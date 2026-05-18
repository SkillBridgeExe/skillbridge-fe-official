import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ParsedCV, SkillGapReport, LearningRoadmap, InterviewPerformance, TimeCommitment } from '@/types/user';

// Shared data model used across the entire app.
export interface UserProfileState {
  // Station 1: Diagnosis Data
  hasCompletedDiagnosis: boolean;
  parsedCV: ParsedCV | null; 
  targetJD: string | null;
  skillGapReport: SkillGapReport | null; 

  // Station 2: Learning Data
  learningRoadmap: LearningRoadmap | null; 
  activeModuleId: string | null;
  timeCommitment: TimeCommitment | null;
  generatedRoadmap: LearningRoadmap | null;
  
  // Station 3: Practice Data
  interviewPerformance: InterviewPerformance | null; 

  // Actions (state update functions)
  setCVData: (cvData: ParsedCV) => void;
  setTargetJD: (jd: string) => void;
  setDiagnosisResults: (report: SkillGapReport, roadmap: LearningRoadmap) => void;
  setTimeCommitment: (commitment: TimeCommitment) => void;
  setGeneratedRoadmap: (roadmap: LearningRoadmap) => void;
  setInterviewPerformance: (performance: InterviewPerformance) => void;
  resetState: () => void;
}

// Initialize store
export const useUserStore = create<UserProfileState>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        hasCompletedDiagnosis: false,
        parsedCV: null,
        targetJD: null,
        skillGapReport: null,
        learningRoadmap: null,
        activeModuleId: null,
        timeCommitment: null,
        generatedRoadmap: null,
        interviewPerformance: null,

        // Actions
        setCVData: (cvData) => set({ parsedCV: cvData }),
        
        setTargetJD: (jd) => set({ targetJD: jd }),
        
        setDiagnosisResults: (report, roadmap) => set({
          skillGapReport: report,
          learningRoadmap: roadmap,
          hasCompletedDiagnosis: true
        }),

        setTimeCommitment: (commitment) => set({
          timeCommitment: commitment
        }),

        setGeneratedRoadmap: (roadmap) => set({
          generatedRoadmap: roadmap
        }),

        setInterviewPerformance: (performance) => set({
          interviewPerformance: performance
        }),

        resetState: () => set({
          hasCompletedDiagnosis: false,
          parsedCV: null,
          targetJD: null,
          skillGapReport: null,
          learningRoadmap: null,
          activeModuleId: null,
          timeCommitment: null,
          generatedRoadmap: null,
          interviewPerformance: null
        })
      }),
      {
        name: 'skillbridge-user-storage', 
      }
    )
  )
);
