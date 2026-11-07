import { describe, expect, it } from "vitest";

import { httpClient } from "../src/services/api/httpClient";

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
});
