import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../src/services/api/apiError";
import { httpClient } from "../src/services/api/httpClient";
import { ToastProvider } from "../src/components/feedback/ToastProvider";
import { getVehiclePollingInterval, VehiclesPage } from "../src/features/vehicles/VehiclesPage";
import { listAllVehicles } from "../src/features/vehicles/vehiclesApi";
import type { Vehicle, VehiclePage } from "../src/features/vehicles/vehiclesApi";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn(), patch: vi.fn() },
}));

const authMock = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ hasPermission: (permission: string) => authMock.permissions.includes(permission) }),
}));

vi.mock("../src/features/vehicles/FleetMap", () => ({
  FleetMap: ({
    vehicles,
    onSelectVehicle,
    selectedVehicleId,
  }: {
    vehicles: Vehicle[];
    onSelectVehicle: (vehicleId: number) => void;
    selectedVehicleId: number | null;
  }) => (
    <div aria-label="Mapa de prueba">
      {vehicles.map((vehicle) => (
        <button
          aria-pressed={vehicle.id === selectedVehicleId}
          key={vehicle.id}
          onClick={() => onSelectVehicle(vehicle.id)}
          type="button"
        >
          Mapa {vehicle.name}
        </button>
      ))}
    </div>
  ),
}));

const getVehicles = vi.mocked(httpClient.get);
const patchVehicle = vi.mocked(httpClient.patch);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<ToastProvider><QueryClientProvider client={queryClient}><VehiclesPage /></QueryClientProvider></ToastProvider>);
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
  custom_fields: [],
};

describe("VehiclesPage", () => {
  beforeEach(() => {
    getVehicles.mockReset();
    patchVehicle.mockReset();
    authMock.permissions = [];
  });

  it("pausa el polling en segundo plano y refresca cada 30 segundos visible", () => {
    expect(getVehiclePollingInterval("visible")).toBe(30_000);
    expect(getVehiclePollingInterval("hidden")).toBe(false);
  });

  it("recupera todas las páginas de la flota para dibujar el mapa", async () => {
    getVehicles.mockImplementation((_url, config) => {
      const params = config?.params as { offset?: number } | undefined;
      const offset = params?.offset ?? 0;
      const items = Array.from({ length: offset === 0 ? 100 : 1 }, (_, index) => ({
        ...sampleVehicle,
        id: offset + index + 1,
        name: `Vehículo ${offset + index + 1}`,
      }));
      return Promise.resolve({ data: page(items, 101, offset) }) as never;
    });

    const vehicles = await listAllVehicles({ query: "", status: "" });

    expect(vehicles).toHaveLength(101);
    expect(getVehicles).toHaveBeenNthCalledWith(1, "/vehicles", {
      params: { offset: 0, limit: 100 },
    });
    expect(getVehicles).toHaveBeenNthCalledWith(2, "/vehicles", {
      params: { offset: 100, limit: 100 },
    });
  });

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
    getVehicles.mockImplementation((url, config) => {
      if (url !== "/vehicles") {
        return Promise.resolve({ data: { ...sampleVehicle, drivers: [], passengers: [] } }) as never;
      }
      const params = config?.params as { limit?: number; offset?: number } | undefined;
      const total = params?.limit === 100 ? 1 : 45;
      return Promise.resolve({
        data: page([sampleVehicle], total, Number(params?.offset ?? 0)),
      }) as never;
    });
    renderPage();

    await screen.findByRole("article", { name: "Camión norte" });
    await user.type(screen.getByRole("textbox", { name: "Buscar vehículo" }), "Camión");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "moving");

    await waitFor(() => expect(getVehicles).toHaveBeenCalledWith("/vehicles", {
      params: { q: "Camión", status: "moving", offset: 0, limit: 20, sort_order: "asc" },
    }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(getVehicles).toHaveBeenCalledWith("/vehicles", {
      params: { q: "Camión", status: "moving", offset: 20, limit: 20, sort_order: "asc" },
    }));
  });

  it("presenta el estado vacío cuando no hay coincidencias", async () => {
    getVehicles.mockResolvedValue({ data: page([]) } as never);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Aún no hay vehículos disponibles" })).toBeVisible();
  });

  it("ofrece reintentar cuando la API falla", async () => {
    getVehicles.mockImplementation((_url, config) => {
      const params = config?.params as { limit?: number } | undefined;
      if (params?.limit === 100 && getVehicles.mock.calls.filter(([, request]) =>
        (request?.params as { limit?: number } | undefined)?.limit === 100,
      ).length === 1) {
        return Promise.reject(new ApiError("Servicio no disponible", "network")) as never;
      }
      return Promise.resolve({ data: page([sampleVehicle]) }) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("button", { name: "Mapa Camión norte" })).toBeVisible();
    await waitFor(() => expect(getVehicles.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  it("sincroniza la selección del mapa con el vehículo y su página", async () => {
    const user = userEvent.setup();
    const allVehicles = Array.from({ length: 21 }, (_, index) => ({
      ...sampleVehicle,
      id: index + 1,
      name: index === 0 ? "Camión norte" : `Vehículo ${index + 1}`,
    }));
    getVehicles.mockImplementation((url, config) => {
      if (url !== "/vehicles") {
        return Promise.resolve({ data: { ...sampleVehicle, drivers: [], passengers: [] } }) as never;
      }
      const params = config?.params as { limit?: number; offset?: number } | undefined;
      const offset = params?.offset ?? 0;
      const items = params?.limit === 100
        ? allVehicles
        : allVehicles.slice(offset, offset + 20);
      return Promise.resolve({ data: page(items, allVehicles.length, offset) }) as never;
    });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Mapa Camión norte" }));

    const selectedVehicle = screen.getByRole("complementary", { name: "Detalle del vehículo seleccionado" });
    expect(within(selectedVehicle).getByRole("heading", { name: "Camión norte" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mapa Camión norte" })).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra el conductor devuelto por el detalle del backend", async () => {
    const user = userEvent.setup();
    getVehicles.mockImplementation((url) => Promise.resolve({
      data: url === "/vehicles"
        ? page([sampleVehicle])
        : { ...sampleVehicle, drivers: [{ id: 7, name: "Ana", phone: "555" }], passengers: [] },
    }) as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Ubicar" }));

    expect(await screen.findByText("Ana · 555")).toBeVisible();
  });

  it("comunica claramente cuando el vehículo no tiene conductor vinculado", async () => {
    const user = userEvent.setup();
    getVehicles.mockImplementation((url) => Promise.resolve({
      data: url === "/vehicles" ? page([sampleVehicle]) : { ...sampleVehicle, drivers: [], passengers: [] },
    }) as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Ubicar" }));

    expect(await screen.findByText("No hay conductor vinculado a este vehículo.")).toBeVisible();
  });

  it("muestra los pasajeros vinculados que devuelve el detalle", async () => {
    const user = userEvent.setup();
    getVehicles.mockImplementation((url) => Promise.resolve({
      data: url === "/vehicles"
        ? page([sampleVehicle])
        : { ...sampleVehicle, drivers: [], passengers: [{ id: 9, name: "Luis", code: "P9" }] },
    }) as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Ubicar" }));

    expect(await screen.findByText("Pasajeros asignados")).toBeVisible();
    expect(screen.getByText("Luis · P9")).toBeVisible();
  });

  it("lista y guarda cambios de campos personalizados del vehículo", async () => {
    const user = userEvent.setup();
    authMock.permissions = ["vehicles:custom_fields:write"];
    const detail = {
      ...sampleVehicle,
      drivers: [],
      passengers: [],
      custom_fields: [
        { id: 5, name: "Placa", value: "ABC123" },
        { id: 6, name: "Odometro", value: "1200" },
      ],
    };
    getVehicles.mockImplementation((url) => Promise.resolve({
      data: url === "/vehicles" ? page([sampleVehicle]) : detail,
    }) as never);
    patchVehicle.mockResolvedValue({ data: detail } as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Ubicar" }));
    const plateValue = await screen.findByRole("textbox", { name: "Valor de Placa" });
    await user.clear(plateValue);
    await user.type(plateValue, "XYZ");
    await user.click(screen.getByRole("button", { name: "Eliminar campo Odometro" }));
    await user.type(screen.getByRole("textbox", { name: "Nuevo campo" }), "Color");
    await user.type(screen.getByRole("textbox", { name: "Valor" }), "Rojo");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    await user.click(screen.getByRole("button", { name: "Guardar campos" }));

    await waitFor(() => expect(patchVehicle).toHaveBeenCalledWith("/vehicles/17/custom-fields", {
      fields: [
        { id: 5, name: "Placa", value: "XYZ" },
        { name: "Color", value: "Rojo" },
      ],
      remove_field_ids: [6],
    }));
    expect(await screen.findByText("Campos personalizados actualizados.")).toBeVisible();
  });

  it("muestra el error y permite reintentar al guardar campos personalizados", async () => {
    const user = userEvent.setup();
    authMock.permissions = ["vehicles:custom_fields:write"];
    const detail = {
      ...sampleVehicle,
      drivers: [],
      passengers: [],
      custom_fields: [{ id: 5, name: "Placa", value: "ABC123" }],
    };
    getVehicles.mockImplementation((url) => Promise.resolve({
      data: url === "/vehicles" ? page([sampleVehicle]) : detail,
    }) as never);
    patchVehicle.mockRejectedValueOnce(new ApiError("No fue posible guardar los campos.", "network"));
    patchVehicle.mockResolvedValueOnce({ data: detail } as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Ubicar" }));
    const plateValue = await screen.findByRole("textbox", { name: "Valor de Placa" });
    await user.clear(plateValue);
    await user.type(plateValue, "XYZ");
    await user.click(screen.getByRole("button", { name: "Guardar campos" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No fue posible guardar los campos.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(patchVehicle).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Campos personalizados actualizados.")).toBeVisible();
  });
});
