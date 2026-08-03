import { httpClient } from "../core/http-client";
import { unwrapEnvelope, type ApiEnvelope } from "../auth/envelope";

export interface DiagnosisRole {
  code: string;
  label_vi: string;
  label_en: string;
}

export async function getDiagnosisRoles(): Promise<DiagnosisRole[]> {
  const request = httpClient.get<ApiEnvelope<DiagnosisRole[]>>("/api/diagnosis/roles");
  const response = await unwrapEnvelope(request, "Failed to fetch roles");
  return response.data;
}
