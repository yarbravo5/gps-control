import axios, { AxiosError } from "axios";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAuthTokens, getAccessToken, setAuthTokens, subscribeToSessionExpiration } from "../src/features/auth/authTokenStore";
import { httpClient } from "../src/services/api/httpClient";

const originalAdapter = httpClient.defaults.adapter;

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const response: AxiosResponse = { config, data: {}, headers: {}, status: 401, statusText: "Unauthorized" };
  return new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, response);
}

afterEach(() => {
  httpClient.defaults.adapter = originalAdapter;
  clearAuthTokens();
  document.cookie = "csrf_token=; Max-Age=0; path=/";
  vi.restoreAllMocks();
});

describe("cliente HTTP con sesión", () => {
  it("adjunta bearer en memoria y renueva una vez tras 401", async () => {
    setAuthTokens("old-access", "old-csrf");
    document.cookie = "csrf_token=cookie-csrf; path=/";
    const refresh = vi.spyOn(axios, "post").mockResolvedValue({ data: { access_token: "new-access", csrf_token: "new-csrf" } });
    const adapter: AxiosAdapter = async (config) => {
      if (config.headers.Authorization === "Bearer old-access") throw unauthorized(config);
      return { config, data: { ok: true }, headers: {}, status: 200, statusText: "OK" };
    };
    httpClient.defaults.adapter = adapter;

    const response = await httpClient.get<{ ok: boolean }>("/resource");
    expect(response.data.ok).toBe(true);
    expect(refresh).toHaveBeenCalledWith(expect.stringContaining("/auth/refresh"), undefined, expect.objectContaining({ headers: expect.objectContaining({ "X-CSRF-Token": "cookie-csrf" }) }));
    expect(getAccessToken()).toBe("new-access");
  });

  it("comparte el refresh entre respuestas 401 concurrentes", async () => {
    setAuthTokens("old-access", "old-csrf");
    document.cookie = "csrf_token=cookie-csrf; path=/";
    let resolveRefresh: ((value: { data: { access_token: string; csrf_token: string } }) => void) | undefined;
    const refresh = vi.spyOn(axios, "post").mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve; }) as never);
    let unauthorizedCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      if (config.headers.Authorization === "Bearer old-access") {
        unauthorizedCount += 1;
        throw unauthorized(config);
      }
      return { config, data: { ok: true }, headers: {}, status: 200, statusText: "OK" };
    };
    httpClient.defaults.adapter = adapter;

    const requests = [httpClient.get("/one"), httpClient.get("/two")];
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    resolveRefresh?.({ data: { access_token: "new-access", csrf_token: "new-csrf" } });
    await expect(Promise.all(requests)).resolves.toHaveLength(2);
    expect(unauthorizedCount).toBe(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("limpia la sesión cuando falla el refresh y no repite la solicitud", async () => {
    setAuthTokens("old-access", "old-csrf");
    document.cookie = "csrf_token=cookie-csrf; path=/";
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh denied"));
    const expired = vi.fn();
    const unsubscribe = subscribeToSessionExpiration(expired);
    let requestCount = 0;
    httpClient.defaults.adapter = async (config) => {
      requestCount += 1;
      throw unauthorized(config);
    };

    await expect(httpClient.get("/resource")).rejects.toMatchObject({ status: 401 });
    expect(requestCount).toBe(1);
    expect(getAccessToken()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
