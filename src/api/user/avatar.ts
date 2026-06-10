import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";

export interface UserAvatarResponse {
  avatarUrl?: string | null;
}

type MaybeEnvelope<T> = T | { success: boolean; data: T };

function unwrapAvatarResponse<T>(payload: MaybeEnvelope<T>): T {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload.data;
  }
  return payload as T;
}

export async function uploadCurrentUserAvatarApi(
  file: File,
): Promise<UserAvatarResponse | null> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await httpClient.post<MaybeEnvelope<UserAvatarResponse | null>>(
    API_ROUTES.USER.AVATAR,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return unwrapAvatarResponse(response.data);
}

export async function downloadCurrentUserAvatarApi(): Promise<Blob> {
  const response = await httpClient.get<Blob>(API_ROUTES.USER.AVATAR, {
    responseType: "blob",
  });
  return response.data;
}

export async function deleteCurrentUserAvatarApi(): Promise<UserAvatarResponse | null> {
  const response = await httpClient.delete<MaybeEnvelope<UserAvatarResponse | null>>(
    API_ROUTES.USER.AVATAR,
  );
  return unwrapAvatarResponse(response.data);
}
