import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

function normalizeApiBaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

export const httpClient = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }

    if (status === 403) {
      console.error("[HTTP] Forbidden.");
    }

    if (status && status >= 500) {
      console.error("[HTTP] Server Error:", error.message);
    }

    return Promise.reject(error);
  },
);
