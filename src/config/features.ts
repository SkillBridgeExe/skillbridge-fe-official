/**
 * Cờ bật/tắt tính năng ở tầng FE.
 *
 * `interview` & `roadmap` đang TẮT vì backend NestJS chưa có controller tương ứng
 * (probe 2026-06-08: GET /api/interview/history và /api/roadmaps đều trả 404,
 * trong khi /api/trends/skills trả 401 = đã tồn tại). Tắt để các trang không bắn
 * request chắc-chắn-lỗi và hiển thị trạng thái "Sắp ra mắt" trung thực.
 *
 * Khi BE deploy xong các endpoint này → đổi cờ về true (không cần xoá code trang).
 */
export const FEATURES = {
  interview: false,
  roadmap: false,
} as const;
