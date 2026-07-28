export type DiagnosisScoreStatus = "pass" | "warn" | "fail" | "unknown";

/**
 * Review scores use the same 70/50 bands as the diagnosis score rail.
 * Missing detailed issues must never turn a low numeric score into a pass.
 */
export function diagnosisScoreStatus(score: number | undefined): DiagnosisScoreStatus {
  if (score === undefined) return "unknown";
  if (score >= 70) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}
