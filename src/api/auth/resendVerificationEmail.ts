const API_URL =
  "https://skillbridge-ai-2rrb.onrender.com/api/auth/resend-verification-email";

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface ResendVerificationEmailResponse {
  success: boolean;
  message: string;
  data: null;
  errors: unknown;
}

export const resendVerificationEmailApi = async (
  payload: ResendVerificationEmailRequest
): Promise<ResendVerificationEmailResponse> => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Resend verification email failed");
  }

  return data;
};