// ─── Diagnosis Service ──────────────────────────────────────────────
// Tầng nghiệp vụ cho CV Analysis / Skill Gap Diagnosis.

import { httpClient } from '@/api/core/http-client';
import { API_ROUTES } from '@/constants/api-routes';

export interface DiagnosisPayload {
  cvFile: File;
  jobTitle?: string;
  jobDescription?: string;
}

export interface DiagnosisResult {
  id: string;
  matchScore: number;
  missingSkills: string[];
  existingSkills: string[];
  recommendations: string[];
  createdAt: string;
}

/**
 * Gửi CV lên để AI phân tích Skill Gap.
 */
export async function analyzeCv(payload: DiagnosisPayload): Promise<DiagnosisResult> {
  const formData = new FormData();
  formData.append('cv', payload.cvFile);
  if (payload.jobTitle) formData.append('jobTitle', payload.jobTitle);
  if (payload.jobDescription) formData.append('jobDescription', payload.jobDescription);

  const { data } = await httpClient.post(API_ROUTES.DIAGNOSIS.ANALYZE, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Lấy lịch sử các lần chẩn đoán CV.
 */
export async function getDiagnosisHistory(): Promise<DiagnosisResult[]> {
  const { data } = await httpClient.get(API_ROUTES.DIAGNOSIS.HISTORY);
  return data;
}
