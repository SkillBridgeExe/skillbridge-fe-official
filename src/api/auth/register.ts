const API_URL = "https://skillbridge-ai-2rrb.onrender.com/api/auth/register";

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: string;
}

export interface RegisterResponse {
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

export const registerApi = async (
  payload: RegisterRequest
): Promise<RegisterResponse> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    let errMsg = data.message || "Register failed";
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