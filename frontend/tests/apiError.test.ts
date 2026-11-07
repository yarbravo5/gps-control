import { describe, expect, it } from "vitest";

import { normalizeApiError } from "../src/services/api/apiError";

describe("normalizeApiError", () => {
  it("returns a human message for a backend 502 without exposing the response", () => {
    const axiosLikeError = Object.assign(new Error("private response"), {
      isAxiosError: true,
      response: { status: 502, data: { detail: "internal upstream host" } },
    });

    const result = normalizeApiError(axiosLikeError);

    expect(result.status).toBe(502);
    expect(result.message).toContain("servicio de monitoreo");
    expect(result.message).not.toContain("internal upstream host");
  });

  it("distinguishes an unavailable backend from an HTTP error", () => {
    const axiosLikeError = Object.assign(new Error("network"), {
      isAxiosError: true,
      request: {},
    });

    expect(normalizeApiError(axiosLikeError).kind).toBe("network");
  });

  it("maps a timeout to a retryable user-facing message", () => {
    const axiosLikeError = Object.assign(new Error("timeout"), {
      isAxiosError: true,
      code: "ECONNABORTED",
    });

    expect(normalizeApiError(axiosLikeError).kind).toBe("timeout");
  });
});
