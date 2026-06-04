const API_URL = "https://skillbridge-ai-2rrb.onrender.com/api/auth/verify-email";

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  data: null;
  errors: unknown;
}

export const verifyEmailApi = async (
  payload: VerifyEmailRequest
): Promise<VerifyEmailResponse> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Email verification failed");
  }

  return data;
};