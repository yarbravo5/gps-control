import { getStoredCsrfToken } from "./authTokenStore";

const CSRF_COOKIE_NAME = "csrf_token";

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const entry = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return entry.slice(prefix.length);
  }
}

export function getCsrfToken(): string | null {
  return readCsrfCookie() ?? getStoredCsrfToken();
}
