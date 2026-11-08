import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkBackendHealth, httpClient, resolveApiBaseUrl } from "../src/services/api/httpClient";

afterEach(() => vi.restoreAllMocks());

describe("central HTTP client", () => {
  it("sends backend cookies and reads the configured API base URL", () => {
    expect(httpClient.defaults.withCredentials).toBe(true);
    expect(httpClient.defaults.baseURL).toBe(
      import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
    );
    expect(httpClient.defaults.timeout).toBe(15_000);
    expect(httpClient.defaults.headers.common.Accept).toContain("application/json");
    expect(httpClient.defaults.headers.common["Content-Type"]).toBeUndefined();
  });

  it("checks the backend health endpoint through the same API origin before login", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ status: 200 });

    await expect(checkBackendHealth()).resolves.toBeUndefined();

    const configuredBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
    const apiOrigin = new URL(configuredBase, window.location.origin).origin;
    expect(get).toHaveBeenCalledWith(`${apiOrigin}/health`, expect.objectContaining({
      timeout: 12_000,
      withCredentials: false,
    }));
  });

  it("retries transient health failures with increasing delays before login", async () => {
    vi.useFakeTimers();
    const get = vi.spyOn(axios, "get")
      .mockRejectedValueOnce(Object.assign(new Error("warming"), { isAxiosError: true, response: { status: 503 } }))
      .mockResolvedValueOnce({ status: 200 });

    const pending = checkBackendHealth();
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(pending).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("uses the same-origin API proxy for a public site with a stale localhost build variable", () => {
    expect(resolveApiBaseUrl("http://localhost:8000/api/v1", false, "https://gps-control-mu.vercel.app"))
      .toBe("/api/v1");
  });

  it("keeps localhost for local development while using the proxy in public production builds", () => {
    expect(resolveApiBaseUrl(undefined, true, "http://localhost:5173")).toBe("http://localhost:8000/api/v1");
    expect(resolveApiBaseUrl(undefined, false, "https://gps-control-mu.vercel.app")).toBe("/api/v1");
  });
});
