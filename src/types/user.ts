// Standard interfaces for data used across all 4 stations.

export interface Skill {
  name: string;
  match: number;
  status: 'present' | 'missing';
}

export interface SkillGapInsight {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface SkillGapReport {
  score: number;
  skills: Skill[];
  insights: SkillGapInsight;
}

export interface ParsedCV {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
}

export interface TimeCommitment {
  hoursPerDay: number; // 1-8
  daysPerWeek: number; // 1-7
}

export interface LearningResource {
  id?: string;
  title: string;
  url: string;
  type: 'youtube' | 'course' | 'article';
  duration?: string;
  platform?: string;
  isInternal?: boolean;
  lowConfidence?: boolean;
  sourceType?: string;
  outcomeType?: string;
  proofOfCompletion?: string;
  matchScore?: number;
  qualityScore?: number;
  freshnessScore?: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'in-progress' | 'completed';
  weekNumber: number;
  estimatedHours: number;
  topics: Array<{
    title: string;
    completed: boolean;
  }>;
  resources: LearningResource[];
}

export interface LearningRoadmap {
  modules: LearningModule[];
  estimatedCompletionWeeks: number;
  totalHours: number;
}

export interface InterviewPerformance {
  overallScore: number;
  communicationScore: number;
  technicalTechnicalScore: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
}
