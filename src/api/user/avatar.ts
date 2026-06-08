import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { unwrapEnvelope, type ApiEnvelope } from "@/api/auth/envelope";

export interface UserAvatarResponse {
  avatarUrl?: string | null;
}

export async function uploadCurrentUserAvatarApi(
  file: File,
): Promise<UserAvatarResponse | null> {
  const formData = new FormData();
  formData.append("file", file);

  const envelope = await unwrapEnvelope<ApiEnvelope<UserAvatarResponse | null>>(
    httpClient.post(API_ROUTES.USER.AVATAR, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
    "Failed to upload avatar.",
  );
  return envelope.data;
}

export async function downloadCurrentUserAvatarApi(): Promise<Blob> {
  const response = await httpClient.get<Blob>(API_ROUTES.USER.AVATAR, {
    responseType: "blob",
  });
  return response.data;
}

export async function deleteCurrentUserAvatarApi(): Promise<void> {
  await unwrapEnvelope<ApiEnvelope<null>>(
    httpClient.delete(API_ROUTES.USER.AVATAR),
    "Failed to delete avatar.",
  );
}
