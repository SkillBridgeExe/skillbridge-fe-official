const DEFAULT_API_ERROR_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string | null = null,
    public readonly errors: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.message === "string" && value.message.trim().length > 0) {
    return value.message;
  }

  if (typeof value.error === "string" && value.error.trim().length > 0) {
    return value.error;
  }

  if (isRecord(value.error)) {
    return readMessage(value.error);
  }

  return null;
}

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim();
  return [
    /^Cannot\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+/i,
    /^Request failed with status code \d{3}$/i,
    /^(Network Error|Failed to fetch|fetch failed)$/i,
    /^(Internal server error|Bad Gateway|Service Unavailable|Gateway Timeout)$/i,
    /^timeout of \d+ms exceeded$/i,
    /^(ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT)\b/i,
    /^(TypeError|ReferenceError|SyntaxError):/i,
  ].some((pattern) => pattern.test(normalized));
}

function readUserSafeMessage(value: unknown): string | null {
  const message = readMessage(value);
  return message && !isTechnicalMessage(message) ? message : null;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  if (isRecord(error) && isRecord(error.response)) {
    const responseMessage = readUserSafeMessage(error.response.data);
    if (responseMessage) {
      return responseMessage;
    }
  }

  if (error instanceof Error) {
    return readUserSafeMessage(error.message) ?? fallback;
  }

  return readUserSafeMessage(error) ?? fallback;
}

export function getApiErrorCode(error: unknown): string | null {
  if (error instanceof ApiError) {
    return error.errorCode;
  }

  if (isRecord(error)) {
    if (typeof error.errorCode === "string" && error.errorCode.trim().length > 0) {
      return error.errorCode;
    }

    if (isRecord(error.response) && isRecord(error.response.data)) {
      const code = error.response.data.errorCode;
      if (typeof code === "string" && code.trim().length > 0) {
        return code;
      }
    }
  }

  return null;
}

/** W44: Detect 429 / ABUSE_THROTTLED — the BE signals "too fast, wait a moment". */
export function isThrottledError(error: unknown): boolean {
  const code = getApiErrorCode(error);
  if (code === "ABUSE_THROTTLED") return true;
  if (isRecord(error) && isRecord(error.response)) {
    const status = error.response.status;
    if (status === 429) return true;
  }
  return false;
}
