export const API_URL_LOGOUT = "https://skillbridge-ai-2rrb.onrender.com/api/auth/logout";

export const logoutApi = async (): Promise<{ success: boolean; message: string }> => {
  const res = await fetch(API_URL_LOGOUT, {
    method: "POST",
    // Must include credentials to send the HttpOnly refresh token cookie to clear it
    credentials: "include", 
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    let errMsg = data.message || "Logout failed";
    throw new Error(errMsg);
  }

  return data;
};
