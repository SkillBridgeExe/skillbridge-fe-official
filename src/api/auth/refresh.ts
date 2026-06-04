import { AuthResponse } from "./google";

export const API_URL_REFRESH = "https://skillbridge-ai-2rrb.onrender.com/api/auth/refresh";

export const refreshApi = async (): Promise<AuthResponse> => {
  const res = await fetch(API_URL_REFRESH, {
    method: "POST",
    // Must include credentials to send the HttpOnly refresh token cookie
    credentials: "include", 
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    let errMsg = data.message || "Refresh token failed";
    throw new Error(errMsg);
  }

  return data;
};
