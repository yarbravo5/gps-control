import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/services/api/apiError";
import { httpClient } from "../src/services/api/httpClient";
import { DashboardPage } from "../src/features/dashboard/DashboardPage";
import type { FleetDashboard } from "../src/features/dashboard/dashboardApi";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

const getDashboard = vi.mocked(httpClient.get);

const dashboardData: FleetDashboard = {
  generated_at: "2026-11-07T12:00:00Z",
  total_vehicles: 12,
  moving_vehicles: 5,
  stopped_vehicles: 4,
  no_signal_vehicles: 3,
  vehicles_with_driver: 8,
  vehicles_without_driver: 4,
  total_drivers: 9,
  total_passengers: 14,
};

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<MemoryRouter><QueryClientProvider client={queryClient}><DashboardPage /></QueryClientProvider></MemoryRouter>);
}

describe("DashboardPage", () => {
  beforeEach(() => getDashboard.mockReset());

  it("muestra KPIs y dos gráficas accesibles con datos de la API", async () => {
    getDashboard.mockResolvedValue({ data: dashboardData } as never);
    renderDashboard();

    expect(await screen.findByText("12", { selector: "dd" })).toBeVisible();
    expect(screen.getByText(/Actualizado/)).toHaveTextContent("a. m.");
    expect(screen.getByRole("figure", { name: "Estado de los vehículos" })).toBeVisible();
    expect(screen.getByRole("figure", { name: "Asignación de conductores" })).toBeVisible();
    expect(screen.getByRole("meter", { name: "En movimiento: 5 de 12" })).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByRole("meter", { name: "Con conductor: 8 de 12" })).toHaveAttribute("aria-valuenow", "8");
    expect(getDashboard).toHaveBeenCalledWith("/dashboard");
  });

  it("presenta el estado de carga mientras espera la respuesta", async () => {
    let resolveRequest: ((value: { data: FleetDashboard }) => void) | undefined;
    getDashboard.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }) as never);
    renderDashboard();

    expect(screen.getByRole("status")).toHaveTextContent("Consultando indicadores de la flota");
    resolveRequest?.({ data: dashboardData });
    expect(await screen.findByRole("figure", { name: "Estado de los vehículos" })).toBeVisible();
  });

  it("ofrece reintento tras el error de API", async () => {
    getDashboard
      .mockRejectedValueOnce(new ApiError("Servicio no disponible", "network"))
      .mockResolvedValue({ data: dashboardData } as never);
    renderDashboard();

    expect(await screen.findByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("figure", { name: "Estado de los vehículos" })).toBeVisible();
    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2));
  });

  it("muestra un estado vacío cuando Wialon no devuelve vehículos", async () => {
    getDashboard.mockResolvedValue({
      data: { ...dashboardData, total_vehicles: 0, moving_vehicles: 0, stopped_vehicles: 0, no_signal_vehicles: 0, vehicles_with_driver: 0, vehicles_without_driver: 0 },
    } as never);
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Aún no hay vehículos para resumir" })).toBeVisible();
    expect(screen.getByRole("figure", { name: "Asignación de conductores" })).toBeVisible();
    expect(screen.getByRole("meter", { name: "Con conductor: 0 de 0" })).toHaveAttribute("aria-valuenow", "0");
  });
});
