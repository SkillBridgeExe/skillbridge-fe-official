import { httpClient } from "@/api/core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  GapReportResponse,
  GithubEvidenceResponse,
  InterviewPlanResponse,
} from "@shared/api";

export type DiagnosisLang = "vi" | "en";

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
