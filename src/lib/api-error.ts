const DEFAULT_API_ERROR_MESSAGE = "Something went wrong. Please try again.";

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

export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isRecord(error) && isRecord(error.response)) {
    const responseMessage = readMessage(error.response.data);
    if (responseMessage) {
      return responseMessage;
    }
  }

  return readMessage(error) ?? fallback;
}
