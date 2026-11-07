import { httpClient } from "../../services/api/httpClient";
import { getCsrfToken } from "./csrf";
import type { AuthUser, ChangePasswordRequest, LoginRequest, LoginResponse, RefreshResponse } from "./types";

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const response = await httpClient.post<LoginResponse>("/auth/login", payload, { timeout: 60_000 });
  return response.data;
}

export async function refreshRequest(csrfToken: string): Promise<RefreshResponse> {
  const response = await httpClient.post<RefreshResponse>("/auth/refresh", undefined, {
    headers: { "X-CSRF-Token": csrfToken },
    timeout: 60_000,
  });
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await httpClient.get<AuthUser>("/auth/me");
  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await httpClient.post("/auth/logout", undefined, {
    headers: { "X-CSRF-Token": getCsrfToken() ?? "" },
  });
}

export async function changePasswordRequest(payload: ChangePasswordRequest): Promise<void> {
  await httpClient.post("/auth/change-password", payload);
}
