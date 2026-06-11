let accessToken: string | null = null;
let accessTokenExpiresAtMs: number | null = null;

export function setAccessToken(token: string, expiresInSeconds?: number | null) {
  accessToken = token;
  accessTokenExpiresAtMs =
    typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)
      ? Date.now() + expiresInSeconds * 1000
      : null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAccessTokenExpiresAtMs(): number | null {
  return accessTokenExpiresAtMs;
}

export function clearAccessToken() {
  accessToken = null;
  accessTokenExpiresAtMs = null;
}

export function isAccessTokenPresent(): boolean {
  return Boolean(accessToken);
}
