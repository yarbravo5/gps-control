import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/services/api/apiError";
import { httpClient } from "../src/services/api/httpClient";
import { VehiclesPage } from "../src/features/vehicles/VehiclesPage";
import type { VehiclePage } from "../src/features/vehicles/vehiclesApi";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

const getVehicles = vi.mocked(httpClient.get);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}><VehiclesPage /></QueryClientProvider>);
}

function page(items: VehiclePage["items"], total = items.length, offset = 0): VehiclePage {
  return { items, total, offset, limit: 20 };
}

const sampleVehicle = {
  id: 17,
  name: "Camión norte",
  latitude: 4.712345,
  longitude: -74.06234,
  speed_kmh: 42,
  heading_degrees: 90,
  direction: "E",
  last_communication: "2026-11-07T12:00:00Z",
  status: "moving" as const,
};

describe("VehiclesPage", () => {
  beforeEach(() => getVehicles.mockReset());

  it("muestra datos normalizados y fecha en la zona horaria de Bogotá", async () => {
    getVehicles.mockResolvedValue({ data: page([sampleVehicle]) } as never);
    renderPage();

    const vehicle = await screen.findByRole("article", { name: "Camión norte" });
    expect(within(vehicle).getByText("En movimiento")).toBeVisible();
    expect(within(vehicle).getByText("4.71235, -74.06234")).toBeVisible();
    expect(within(vehicle).getByText("42 km/h")).toBeVisible();
    expect(within(vehicle).getByText(/7:00 a\. m\./)).toBeVisible();
  });

  it("envía búsqueda, estado y página al servidor", async () => {
    const user = userEvent.setup();
    getVehicles.mockImplementation((_url, config) => {
      const params = config?.params as { offset?: number } | undefined;
      return Promise.resolve({
        data: page([sampleVehicle], 45, Number(params?.offset ?? 0)),
      }) as never;
    });
    renderPage();

    await screen.findByRole("article", { name: "Camión norte" });
    await user.type(screen.getByRole("textbox", { name: "Buscar vehículo" }), "Camión");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "moving");

    await waitFor(() => expect(getVehicles).toHaveBeenLastCalledWith("/vehicles", {
      params: { q: "Camión", status: "moving", offset: 0, limit: 20 },
    }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(getVehicles).toHaveBeenLastCalledWith("/vehicles", {
      params: { q: "Camión", status: "moving", offset: 20, limit: 20 },
    }));
  });

  it("presenta el estado vacío cuando no hay coincidencias", async () => {
    getVehicles.mockResolvedValue({ data: page([]) } as never);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Aún no hay vehículos disponibles" })).toBeVisible();
  });

  it("ofrece reintentar cuando la API falla", async () => {
    getVehicles
      .mockRejectedValueOnce(new ApiError("Servicio no disponible", "network"))
      .mockResolvedValue({ data: page([sampleVehicle]) } as never);
    renderPage();

    expect(await screen.findByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article", { name: "Camión norte" })).toBeVisible();
    await waitFor(() => expect(getVehicles).toHaveBeenCalledTimes(2));
  });
});