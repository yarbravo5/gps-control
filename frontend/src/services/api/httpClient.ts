import axios from "axios";

import { clearAuthTokens, getAccessToken, notifySessionExpired, setAuthTokens } from "../../features/auth/authTokenStore";
import { getCsrfToken } from "../../features/auth/csrf";
import type { RefreshResponse } from "../../features/auth/types";
import { normalizeApiError } from "./apiError";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export const httpClient = axios.create({
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

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
