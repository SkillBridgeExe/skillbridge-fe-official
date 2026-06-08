/**
 * 8 vai trò IT của SkillBridge — `code` là enum chuẩn BE (khớp
 * jobs.role_code / skill_demand_snapshots.role_code trong DB), `label` để hiển thị.
 *
 * ⚠️ FE phải gửi `code` (vd "frontend_developer") cho mọi endpoint nhận role
 * (upload /api/cvs, match, builder evaluate, trends). Gửi label ("Frontend") → BE 400.
 */
export interface ItRole {
  code: string;
  label: string;
}

export const IT_ROLES: ItRole[] = [
  { code: "frontend_developer", label: "Frontend" },
  { code: "backend_developer", label: "Backend" },
  { code: "fullstack_developer", label: "Fullstack" },
  { code: "data_analyst", label: "Data Analyst" },
  { code: "mobile_developer", label: "Mobile" },
  { code: "devops_engineer", label: "DevOps" },
  { code: "qa_tester", label: "QA/Tester" },
  { code: "ai_ml_engineer", label: "AI/ML Engineer" },
];

/** Đổi role code → label hiển thị; trả lại chính code nếu không khớp (an toàn). */
export const getRoleLabel = (code: string | null | undefined): string =>
  IT_ROLES.find((r) => r.code === code)?.label ?? code ?? "";
