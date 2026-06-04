const API_URL = "https://skillbridge-ai-2rrb.onrender.com/api/auth/login";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    accessTokenExpiresAt: string;
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

export const loginApi = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};