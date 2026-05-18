// ─── Interview Service ──────────────────────────────────────────────
// Tầng nghiệp vụ cho Mock Interview.
// Page component chỉ gọi service → service gọi API → trả data sạch.
// KHÔNG import axios hay httpClient trực tiếp trong page.

import { httpClient } from '@/api/core/http-client';
import { API_ROUTES } from '@/constants/api-routes';

export interface StartInterviewPayload {
  jobTitle: string;
  jobDescription?: string;
  interviewType: 'behavioral' | 'technical' | 'mixed';
  duration: number; // minutes
}

export interface InterviewResult {
  id: string;
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  createdAt: string;
}

/**
 * Bắt đầu một phiên phỏng vấn mới.
 */
export async function startInterview(payload: StartInterviewPayload) {
  const { data } = await httpClient.post(API_ROUTES.INTERVIEW.START, payload);
  return data;
}

/**
 * Lấy danh sách lịch sử phỏng vấn của user.
 */
export async function getInterviewHistory(): Promise<InterviewResult[]> {
  const { data } = await httpClient.get(API_ROUTES.INTERVIEW.HISTORY);
  return data;
}

/**
 * Lấy chi tiết 1 phiên phỏng vấn.
 */
export async function getInterviewDetail(id: string): Promise<InterviewResult> {
  const { data } = await httpClient.get(API_ROUTES.INTERVIEW.DETAIL(id));
  return data;
}
