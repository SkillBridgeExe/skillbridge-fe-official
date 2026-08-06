export type DiagnosisReportMode = "review" | "match";
export type DiagnosisReportStep = "input" | "cv-review" | "results" | "builder";
export type DiagnosisReportTab = "audit" | "cv" | "market" | "fit" | "cv_jd" | "jobs";

const REVIEW_TABS: readonly DiagnosisReportTab[] = ["audit", "cv", "market"];
const MATCH_TABS: readonly DiagnosisReportTab[] = ["fit", "cv_jd", "jobs"];

/**
 * A result is a CV-JD match only when the result payload contains a real JD
 * match. The page step alone is not enough because CV-only reviews also end
 * in `results`.
 */
export function getDiagnosisReportMode(
  step: DiagnosisReportStep,
  hasJdMatch: boolean,
): DiagnosisReportMode {
  return step === "results" && hasJdMatch ? "match" : "review";
}

export function normalizeDiagnosisReportTab(
  mode: DiagnosisReportMode,
  activeTab: DiagnosisReportTab,
): DiagnosisReportTab {
  const allowedTabs = mode === "match" ? MATCH_TABS : REVIEW_TABS;
  if (allowedTabs.includes(activeTab)) return activeTab;
  return mode === "match" ? "fit" : "audit";
}
