export const API_URL_ME = "https://skillbridge-ai-2rrb.onrender.com/api/auth/me";

export interface UserSummaryResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    displayName: string;
    isEmailVerified: boolean;
    roles: string[];
  };
  errors: unknown;
}

export const getMeApi = async (accessToken: string): Promise<UserSummaryResponse> => {
  const res = await fetch(API_URL_ME, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    let errMsg = data.message || "Failed to fetch user profile";
    throw new Error(errMsg);
  }

  return data;
};
