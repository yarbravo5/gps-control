import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../src/services/api/httpClient";
import { ExportCsvButton } from "../src/features/foundation/ExportCsvButton";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

const getApi = vi.mocked(httpClient.get);

describe("ExportCsvButton", () => {
  beforeEach(() => getApi.mockReset());

  it("descarga el CSV como blob y revoca el object URL", async () => {
    const user = userEvent.setup();
    const blob = new Blob(["id,name\r\n1,Unit"] , { type: "text/csv" });
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-csv");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    getApi.mockResolvedValue({ data: blob } as never);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><ExportCsvButton kind="drivers" /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Exportar conductores CSV" }));

    expect(await screen.findByRole("button", { name: "Exportar conductores CSV" })).toBeEnabled();
    expect(getApi).toHaveBeenCalledWith("/exports/drivers", { responseType: "blob" });
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith("blob:test-csv");
    createUrl.mockRestore();
    revokeUrl.mockRestore();
    click.mockRestore();
  });
});