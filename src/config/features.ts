/**
 * Frontend feature flags.
 *
 * Interview is enabled after the FE maps to the authenticated /api/interview
 * contract and no longer calls legacy mock/Gemini endpoints. Roadmap remains
 * hidden until its public API is mapped.
 */
export const FEATURES = {
  interview: true,
  roadmap: false,
} as const;
