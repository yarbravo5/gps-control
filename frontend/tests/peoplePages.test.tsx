import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../src/services/api/httpClient";
import { DriversPage } from "../src/features/drivers/DriversPage";
import { PassengersPage } from "../src/features/passengers/PassengersPage";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn() },
}));

const getApi = vi.mocked(httpClient.get);

function renderPage(page: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{page}</QueryClientProvider>);
}

const resources = { data: { items: [{ id: 20, name: "Flota Norte" }], total: 1, offset: 0, limit: 100 } };

describe("listados de personas Wialon", () => {
  beforeEach(() => getApi.mockReset());

  it("consulta conductores del recurso seleccionado con búsqueda y paginación del servidor", async () => {
    const user = userEvent.setup();
    getApi.mockImplementation((url, config) => {
      if (url === "/resources") return Promise.resolve(resources) as never;
      const params = config?.params as { offset?: number } | undefined;
      return Promise.resolve({
        data: {
          items: [{ id: 7, resource_id: 20, name: "Ana", code: "A7", description: "AM", phone: "555", custom_fields: {}, bound_unit_id: null }],
          total: 21,
          offset: params?.offset ?? 0,
          limit: 20,
        },
      }) as never;
    });
    renderPage(<DriversPage />);

    expect(await screen.findByRole("heading", { name: "Conductores" })).toBeVisible();
    expect(await screen.findByText("Ana")).toBeVisible();
    await user.type(screen.getByRole("textbox", { name: "Buscar conductor" }), "Ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(getApi).toHaveBeenCalledWith("/drivers", {
      params: { resource_id: 20, q: "Ana", offset: 0, limit: 20 },
    }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(getApi).toHaveBeenCalledWith("/drivers", {
      params: { resource_id: 20, q: "Ana", offset: 20, limit: 20 },
    }));
  });

  it("muestra el estado vacío del listado de pasajeros", async () => {
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [], total: 0, offset: 0, limit: 20 } }) as never);
    renderPage(<PassengersPage />);

    expect(await screen.findByRole("heading", { name: "No hay pasajeros en este recurso" })).toBeVisible();
  });

  it("permite seleccionar el recurso sin enviarlo fuera de los parámetros del API", async () => {
    const user = userEvent.setup();
    const resourceData = {
      data: { items: [{ id: 20, name: "Flota Norte" }, { id: 21, name: "Flota Sur" }], total: 2, offset: 0, limit: 100 },
    };
    getApi.mockImplementation((url, config) => {
      if (url === "/resources") return Promise.resolve(resourceData) as never;
      const params = config?.params as { resource_id?: number } | undefined;
      return Promise.resolve({ data: { items: [], total: 0, offset: 0, limit: 20, selected: params?.resource_id } }) as never;
    });
    renderPage(<PassengersPage />);

    await user.selectOptions(await screen.findByRole("combobox", { name: "Recurso Wialon" }), "21");

    await waitFor(() => expect(getApi).toHaveBeenCalledWith("/passengers", {
      params: { resource_id: 21, offset: 0, limit: 20 },
    }));
  });

  it("ofrece reintento si falla la lectura del recurso", async () => {
    getApi
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ data: { items: [], total: 0, offset: 0, limit: 100 } } as never);
    renderPage(<DriversPage />);

    expect(await screen.findByRole("alert")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "No hay recursos disponibles" })).toBeVisible();
    await waitFor(() => expect(getApi).toHaveBeenCalledTimes(2));
  });
});