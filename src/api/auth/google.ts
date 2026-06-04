export const API_URL_GOOGLE = "https://skillbridge-ai-2rrb.onrender.com/api/auth/google";

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string | null;
    accessTokenExpiresAt: string | null;
    user: {
      id: string;
      email: string;
      displayName: string;
      isEmailVerified: boolean;
      roles: string[];
    };
  };
  errors: unknown;
}

export const googleLoginApi = async (
  payload: GoogleLoginRequest
): Promise<AuthResponse> => {
  const res = await fetch(API_URL_GOOGLE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    // The google login endpoint sets the refresh token cookie
    credentials: "include", 
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    let errMsg = data.message || "Google Login failed";
    if (data.errors) {
      if (typeof data.errors === "object" && !Array.isArray(data.errors)) {
        const details = Object.values(data.errors).flat();
        if (details.length > 0) {
          errMsg += ": " + details.join(", ");
        }
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        errMsg += ": " + data.errors.join(", ");
      }
    }
    throw new Error(errMsg);
  }

  return data;
};
