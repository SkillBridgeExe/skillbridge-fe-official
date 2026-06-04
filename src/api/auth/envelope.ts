import { isAxiosError, type AxiosResponse } from "axios";

/**
 * Response envelope every NestJS endpoint returns
 * (see docs/api-contract.md — { success, message, data, errors }).
 */
export interface ApiEnvelope<TData> {
  success: boolean;
  message: string;
  data: TData;
  errors: unknown;
}

/** Shared user shape returned by the auth endpoints. */
export interface AuthUserDto {
  id: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  roles: string[];
}

/**
 * The BE on Render free tier sleeps after idle and cold-starts in ~50s —
 * auth calls override httpClient's default 15s timeout so the first
 * request after a sleep doesn't get cut short.
 */
export const AUTH_REQUEST_TIMEOUT_MS = 90_000;

/** Flatten the envelope's `errors` field (object-of-arrays or array) into a detail string. */
function describeErrors(errors: unknown): string | null {
  if (!errors) return null;
  const details = Array.isArray(errors)
    ? errors
    : typeof errors === "object"
      ? Object.values(errors as Record<string, unknown>).flat()
      : [];
  return details.length > 0 ? details.join(", ") : null;
}

function envelopeError(payload: unknown, fallback: string): Error {
  if (payload && typeof payload === "object") {
    const { message, errors } = payload as Partial<ApiEnvelope<unknown>>;
    const base = typeof message === "string" && message.trim() ? message : fallback;
    const details = describeErrors(errors);
    return new Error(details ? `${base}: ${details}` : base);
  }
  return new Error(fallback);
}

/**
 * Standard unwrap for auth calls: resolve with the envelope on success,
 * throw an Error with a readable message (BE message + flattened details)
 * on HTTP errors, network errors, or `success: false` bodies.
 */
export async function unwrapEnvelope<T extends ApiEnvelope<unknown>>(
  request: Promise<AxiosResponse<T>>,
  fallback: string,
): Promise<T> {
  try {
    const { data } = await request;
    if (!data.success) throw envelopeError(data, fallback);
    return data;
  } catch (error) {
    if (isAxiosError(error)) throw envelopeError(error.response?.data, fallback);
    if (error instanceof Error) throw error;
    throw new Error(fallback);
  }
}
