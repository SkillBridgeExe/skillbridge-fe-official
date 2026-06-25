// ─── Business company onboarding APIs ───────────────────────────────
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";
import { httpClient, type AuthAxiosRequestConfig } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import type {
  BusinessCompanyAggregate, BusinessProfileDto,
  UpdateBusinessCompanyRequest, CompanyMediaUploadResponse,
} from "@/types/jobs";

// §6.2 Get company
export async function getBusinessCompanyApi(): Promise<BusinessCompanyAggregate | null> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessCompanyAggregate | null>>(
    httpClient.get(API_ROUTES.BUSINESS_COMPANY.GET),
    "Failed to load your company.",
  );
  return envelope.data;
}

// §6.2 Update company
export async function updateBusinessCompanyApi(
  body: UpdateBusinessCompanyRequest,
): Promise<BusinessCompanyAggregate> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessCompanyAggregate>>(
    httpClient.patch(API_ROUTES.BUSINESS_COMPANY.UPDATE, body),
    "Failed to update company.",
  );
  return envelope.data;
}

// §6.3 Send work email verification
export async function sendWorkEmailVerificationApi(): Promise<{ accepted: true }> {
  const envelope = await unwrapEnvelope<ApiEnvelope<{ accepted: true }>>(
    httpClient.post(API_ROUTES.BUSINESS_COMPANY.SEND_VERIFY),
    "Failed to send verification email.",
  );
  return envelope.data;
}

// §6.3 Verify work email
export async function verifyWorkEmailApi(token: string): Promise<{ verified: true }> {
  const envelope = await unwrapEnvelope<ApiEnvelope<{ verified: true }>>(
    httpClient.post(API_ROUTES.BUSINESS_COMPANY.VERIFY, { token }, {
      skipAuth: true,
      skipAuthRefresh: true,
    } as AuthAxiosRequestConfig),
    "Failed to verify work email.",
  );
  return envelope.data;
}

// §6.4 Upload logo/cover
export async function uploadCompanyMediaApi(
  kind: "logo" | "cover",
  file: File,
): Promise<CompanyMediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const url = kind === "logo"
    ? API_ROUTES.BUSINESS_COMPANY.LOGO
    : API_ROUTES.BUSINESS_COMPANY.COVER;
  const envelope = await unwrapEnvelope<ApiEnvelope<CompanyMediaUploadResponse>>(
    httpClient.post(url, formData, { headers: { "Content-Type": "multipart/form-data" } }),
    `Failed to upload company ${kind}.`,
  );
  return envelope.data;
}

export async function downloadCompanyMediaApi(kind: "logo" | "cover"): Promise<Blob> {
  const url =
    kind === "logo" ? API_ROUTES.BUSINESS_COMPANY.LOGO : API_ROUTES.BUSINESS_COMPANY.COVER;
  const response = await httpClient.get<Blob>(url, { responseType: "blob" });
  return response.data;
}

// §6.5 Submit for review
export async function submitBusinessProfileApi(): Promise<BusinessProfileDto> {
  const envelope = await unwrapEnvelope<ApiEnvelope<BusinessProfileDto>>(
    httpClient.post(API_ROUTES.BUSINESS_COMPANY.SUBMIT),
    "Failed to submit company for review.",
  );
  return envelope.data;
}
