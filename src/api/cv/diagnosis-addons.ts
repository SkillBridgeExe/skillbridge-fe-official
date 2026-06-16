import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  GapReportResponse,
  GithubEvidenceResponse,
  InterviewPlanResponse,
  RoadmapFromMatchResponse,
} from "@shared/api";

export type DiagnosisLang = "vi" | "en";

/**
 * Generate a learning roadmap from a persisted CV/JD match — gaps are derived server-side from the
 * match's GapReport (learn-only). POST /api/cv-matches/:matchId/roadmap with an EMPTY body: the BE
 * RoadmapFromMatchDto accepts no `lang` and the global ValidationPipe runs forbidNonWhitelisted, so
 * any unknown key (e.g. `lang`) would 400. The roadmap language follows the gap report's server default.
 */
export async function generateRoadmapFromMatchApi(
  matchId: string,
): Promise<RoadmapFromMatchResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<RoadmapFromMatchResponse>>(
    httpClient.post(API_ROUTES.CV_MATCHES.ROADMAP(matchId), {}),
    "Failed to generate the learning roadmap.",
  );
  return envelope.data;
}

/**
 * Generate a gap-targeted interview practice plan from a persisted CV/JD match — focus areas derived
 * server-side from the GapReport (skill-only). POST /api/cv-matches/:matchId/interview-plan.
 */
export async function generateInterviewPlanFromMatchApi(
  matchId: string,
  lang?: DiagnosisLang,
): Promise<InterviewPlanResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewPlanResponse>>(
    httpClient.post(API_ROUTES.CV_MATCHES.INTERVIEW_PLAN(matchId), lang ? { lang } : {}),
    "Failed to generate the interview plan.",
  );
  return envelope.data;
}

export async function getInterviewPlanApi(
  cvId: string,
  role: string,
  lang?: DiagnosisLang,
): Promise<InterviewPlanResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<InterviewPlanResponse>>(
    httpClient.get(API_ROUTES.CV.INTERVIEW_PLAN(cvId), {
      params: { role, ...(lang ? { lang } : {}) },
    }),
    "Failed to load the interview prep pack.",
  );
  return envelope.data;
}

export async function getGapReportApi(
  matchId: string,
  lang?: DiagnosisLang,
): Promise<GapReportResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<GapReportResponse>>(
    httpClient.get(API_ROUTES.CV_MATCHES.GAP_REPORT(matchId), {
      params: lang ? { lang } : undefined,
    }),
    "Failed to load the JD gap report.",
  );
  return envelope.data;
}

export async function getGithubEvidenceApi(
  cvId: string,
  username: string,
  lang?: DiagnosisLang,
): Promise<GithubEvidenceResponse> {
  const envelope = await unwrapEnvelope<ApiEnvelope<GithubEvidenceResponse>>(
    httpClient.get(API_ROUTES.CV.GITHUB_EVIDENCE(cvId), {
      params: {
        username,
        consent: true,
        ...(lang ? { lang } : {}),
      },
    }),
    "Failed to load GitHub evidence.",
  );
  return envelope.data;
}
