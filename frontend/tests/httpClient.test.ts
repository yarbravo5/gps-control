import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkBackendHealth, httpClient } from "../src/services/api/httpClient";

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
      timeout: 60_000,
      withCredentials: false,
    }));
  });
});
