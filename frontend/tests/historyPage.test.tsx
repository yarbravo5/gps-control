import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../src/services/api/httpClient";
import { HistoryPage, validateHistoryRange } from "../src/features/trip-history/HistoryPage";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

vi.mock("../src/features/trip-history/HistoryMap", () => ({
  HistoryMap: ({ points, activeIndex }: { points: { speed_kmh: number | null }[]; activeIndex: number }) => (
    <div aria-label="Mapa de recorrido de prueba">
      Punto activo: {activeIndex} ({points[activeIndex]?.speed_kmh ?? "sin dato"} km/h)
    </div>
  ),
}));

const getApi = vi.mocked(httpClient.get);

const sampleVehicle = {
  id: 7,
  name: "Camión norte",
  latitude: 4.712345,
  longitude: -74.06234,
  speed_kmh: 42,
  heading_degrees: 90,
  direction: "E",
  last_communication: "2026-11-07T12:00:00Z",
  status: "moving" as const,
};

const historyResponse = {
  vehicle_id: 7,
  start_at: "2026-11-07T08:00:00Z",
  end_at: "2026-11-07T09:00:00Z",
  total_points: 3,
  points: [
    { timestamp: "2026-11-07T08:00:00Z", latitude: 4.71, longitude: -74.06, speed_kmh: 0, heading_degrees: 0, heading_cardinal: "N", status: "stopped" as const },
    { timestamp: "2026-11-07T08:10:00Z", latitude: 4.72, longitude: -74.05, speed_kmh: 25, heading_degrees: 90, heading_cardinal: "E", status: "moving" as const },
    { timestamp: "2026-11-07T08:20:00Z", latitude: 4.73, longitude: -74.04, speed_kmh: 45, heading_degrees: 180, heading_cardinal: "S", status: "moving" as const },
  ],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}><HistoryPage /></QueryClientProvider>);
}

function mockVehiclesAndHistory() {
  getApi.mockImplementation((url) => {
    if (url === "/vehicles") {
      return Promise.resolve({ data: { items: [sampleVehicle], total: 1, offset: 0, limit: 100 } }) as never;
    }
    if (url === "/vehicles/7/history") {
      return Promise.resolve({ data: historyResponse }) as never;
    }
    return Promise.reject(new Error(`Solicitud inesperada: ${url}`)) as never;
  });
}

async function selectVehicleAndSubmit() {
  const user = userEvent.setup();
  await user.selectOptions(await screen.findByRole("combobox", { name: "Vehículo" }), "7");
  await user.click(screen.getByRole("button", { name: "Consultar historial" }));
  return user;
}

describe("HistoryPage", () => {
  beforeEach(() => {
    getApi.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("consulta el historial y muestra velocidad y metadatos del recorrido", async () => {
    mockVehiclesAndHistory();
    renderPage();
    await selectVehicleAndSubmit();

    expect(await screen.findByText(/3 puntos en el recorrido/)).toBeVisible();
    expect(await screen.findByLabelText("Mapa de recorrido de prueba")).toBeVisible();
    expect(getApi).toHaveBeenCalledWith("/vehicles/7/history", {
      params: { start: expect.any(String), end: expect.any(String) },
    });
    expect(screen.getByText("Punto activo: 0 (0 km/h)")).toBeVisible();
    expect(screen.getByText("0 km/h")).toBeVisible();
    expect(screen.getByText("N")).toBeVisible();
  });

  it("valida el rango antes de consultar", async () => {
    getApi.mockResolvedValue({
      data: { items: [sampleVehicle], total: 1, offset: 0, limit: 100 },
    } as never);
    renderPage();
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByRole("combobox", { name: "Vehículo" }), "7");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-07T10:00" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-07T09:00" } });
    await user.click(screen.getByRole("button", { name: "Consultar historial" }));

    expect(screen.getByRole("alert")).toHaveTextContent("La fecha y hora de inicio debe ser anterior");
    expect(getApi).not.toHaveBeenCalledWith("/vehicles/7/history", expect.anything());
  });

  it("reproduce el recorrido y avanza por los puntos", async () => {
    mockVehiclesAndHistory();
    renderPage();
    await selectVehicleAndSubmit();
    await screen.findByText(/3 puntos en el recorrido/);
    await screen.findByLabelText("Mapa de recorrido de prueba");

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Reproducir recorrido" }));
    act(() => vi.advanceTimersByTime(1_000));

    expect(screen.getByText("Punto activo: 1 (25 km/h)")).toBeVisible();
    expect(screen.getByText("25 km/h")).toBeVisible();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("Punto activo: 2 (45 km/h)")).toBeVisible();
    expect(screen.getByRole("button", { name: "Reproducir recorrido" })).toBeVisible();
  });

  it("rechaza rangos mayores a siete días", () => {
    expect(validateHistoryRange("2026-11-01T08:00", "2026-11-09T08:00")).toBe(
      "El rango máximo de consulta es de 7 días.",
    );
  });
});
