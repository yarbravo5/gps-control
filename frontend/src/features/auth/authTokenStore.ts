let accessToken: string | null = null;
let csrfToken: string | null = null;

const sessionExpiredListeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getStoredCsrfToken(): string | null {
  return csrfToken;
}

export function setAuthTokens(nextAccessToken: string, nextCsrfToken: string): void {
  accessToken = nextAccessToken;
  csrfToken = nextCsrfToken;
}

export function clearAuthTokens(): void {
  accessToken = null;
  csrfToken = null;
}

export function subscribeToSessionExpiration(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

export function notifySessionExpired(): void {
  for (const listener of sessionExpiredListeners) listener();
}
