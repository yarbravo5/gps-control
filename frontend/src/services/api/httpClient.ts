import axios from "axios";

import { clearAuthTokens, getAccessToken, notifySessionExpired, setAuthTokens } from "../../features/auth/authTokenStore";
import { getCsrfToken } from "../../features/auth/csrf";
import type { RefreshResponse } from "../../features/auth/types";
import { normalizeApiError } from "./apiError";

const LOCAL_API_URL = "http://localhost:8000/api/v1";

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolveApiBaseUrl(
  configuredApiUrl: string | undefined,
  isDevelopment: boolean,
  pageOrigin: string,
): string {
  const pageUrl = new URL(pageOrigin);
  const localPage = isLoopback(pageUrl.hostname);
  const configuredUrl = configuredApiUrl?.trim();

  if (configuredUrl) {
    try {
      const configuredOrigin = new URL(configuredUrl, pageOrigin);
      if (!localPage && isLoopback(configuredOrigin.hostname)) return "/api/v1";
      return configuredUrl;
    } catch {
      return isDevelopment || localPage ? LOCAL_API_URL : "/api/v1";
    }
  }

  return isDevelopment || localPage ? LOCAL_API_URL : "/api/v1";
}

const baseURL = resolveApiBaseUrl(import.meta.env.VITE_API_URL, import.meta.env.DEV, window.location.origin);
const BACKEND_HEALTH_TIMEOUT_MS = 12_000;
const HEALTH_MAX_ATTEMPTS = 4;
const HEALTH_RETRY_DELAY_MS = [1_000, 2_000, 4_000] as const;

export const httpClient = axios.create({
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export async function checkBackendHealth(): Promise<void> {
  const apiOrigin = new URL(baseURL, window.location.origin).origin;
  let lastError: unknown;
  for (let attempt = 0; attempt < HEALTH_MAX_ATTEMPTS; attempt += 1) {
    try {
      await axios.get(`${apiOrigin}/health`, {
        timeout: BACKEND_HEALTH_TIMEOUT_MS,
        withCredentials: false,
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableHealthError(error) || attempt === HEALTH_MAX_ATTEMPTS - 1) break;
      await new Promise((resolve) => window.setTimeout(resolve, HEALTH_RETRY_DELAY_MS[attempt]));
    }
  }
  throw normalizeApiError(lastError);
}

function isRetryableHealthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 429 || status === 502 || status === 503 || status === 504;
}

declare module "axios" {
  export interface AxiosRequestConfig { _authRetried?: boolean; skipAuthRefresh?: boolean }
  export interface InternalAxiosRequestConfig { _authRetried?: boolean; skipAuthRefresh?: boolean }
}

let refreshInFlight: Promise<string> | null = null;

httpClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.url?.includes("/auth/login") && !config.url?.includes("/auth/refresh")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(normalizeApiError(error));
    const config = error.config;
    if (error.response?.status === 401 && config && !config._authRetried && !config.skipAuthRefresh &&
      !config.url?.includes("/auth/login") && !config.url?.includes("/auth/refresh") && !config.url?.includes("/auth/logout")) {
      config._authRetried = true;
      try {
        if (!refreshInFlight) {
          const csrfToken = getCsrfToken();
          if (!csrfToken) throw new Error("No hay token CSRF disponible.");
          refreshInFlight = axios.post<RefreshResponse>(`${baseURL}/auth/refresh`, undefined, {
            withCredentials: true,
            timeout: 60_000,
            headers: { Accept: "application/json", "X-CSRF-Token": csrfToken },
          }).then(({ data }) => {
            setAuthTokens(data.access_token, data.csrf_token);
            return data.access_token;
          }).finally(() => { refreshInFlight = null; });
        }
        const token = await refreshInFlight;
        config.headers.set("Authorization", `Bearer ${token}`);
        return httpClient.request(config);
      } catch {
        clearAuthTokens();
        notifySessionExpired();
        return Promise.reject(normalizeApiError(error));
      }
    }
    return Promise.reject(normalizeApiError(error));
  },
);
