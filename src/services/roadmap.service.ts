// ─── Roadmap Service ────────────────────────────────────────────────
// Tầng nghiệp vụ cho Learning Roadmap Generation.

import { httpClient } from '@/api/core/http-client';
import { API_ROUTES } from '@/constants/api-routes';

export interface RoadmapPayload {
  missingSkills: string[];
  targetRole: string;
  timeframeWeeks?: number;
}

export interface RoadmapItem {
  id: string;
  skillName: string;
  courses: {
    title: string;
    provider: string; // 'Udemy' | 'Coursera' | 'YouTube'
    url: string;
    rating: number;
    estimatedHours: number;
  }[];
  priority: 'high' | 'medium' | 'low';
  weekNumber: number;
}

export interface Roadmap {
  id: string;
  targetRole: string;
  items: RoadmapItem[];
  totalWeeks: number;
  createdAt: string;
}

/**
 * Sinh lộ trình học tập dựa trên kỹ năng còn thiếu.
 * Backend sẽ: AI phân tích → query Database khóa học → trả roadmap.
 */
export async function generateRoadmap(payload: RoadmapPayload): Promise<Roadmap> {
  const { data } = await httpClient.post(API_ROUTES.ROADMAP.GENERATE, payload);
  return data;
}

/**
 * Lấy danh sách roadmap đã tạo.
 */
export async function getRoadmapList(): Promise<Roadmap[]> {
  const { data } = await httpClient.get(API_ROUTES.ROADMAP.LIST);
  return data;
}
