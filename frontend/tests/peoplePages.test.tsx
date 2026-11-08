import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../src/services/api/httpClient";
import { ToastProvider } from "../src/components/feedback/ToastProvider";
import { DriversPage } from "../src/features/drivers/DriversPage";
import { PassengersPage } from "../src/features/passengers/PassengersPage";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const authMock = vi.hoisted(() => ({ permissions: ["drivers:write", "passengers:write"] as string[] }));
vi.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ hasPermission: (permission: string) => authMock.permissions.includes(permission) }),
}));

const getApi = vi.mocked(httpClient.get);
const postApi = vi.mocked(httpClient.post);
const patchApi = vi.mocked(httpClient.patch);
const deleteApi = vi.mocked(httpClient.delete);

function renderPage(page: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<ToastProvider><QueryClientProvider client={queryClient}>{page}</QueryClientProvider></ToastProvider>);
}

const resources = { data: { items: [{ id: 20, name: "Flota Norte" }], total: 1, offset: 0, limit: 100 } };

describe("listados de personas Wialon", () => {
  beforeEach(() => {
    getApi.mockReset();
    postApi.mockReset();
    patchApi.mockReset();
    deleteApi.mockReset();
    authMock.permissions = ["drivers:write", "drivers:bind", "passengers:write", "passengers:bind"];
  });

  it("consulta conductores del recurso seleccionado con búsqueda y paginación del servidor", async () => {
    const user = userEvent.setup();
    getApi.mockImplementation((url, config) => {
      if (url === "/resources") return Promise.resolve(resources) as never;
      if (url === "/vehicles") return Promise.resolve({
        data: { items: [{ id: 42, name: "Truck", latitude: 4, longitude: -74, speed_kmh: 0, heading_degrees: 0, direction: "N", last_communication: null, status: "stopped" }], total: 1, offset: 0, limit: 100 },
      }) as never;
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
      params: { resource_id: 20, q: "Ana", offset: 0, limit: 20, sort_by: "name", sort_order: "asc" },
    }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(getApi).toHaveBeenCalledWith("/drivers", {
      params: { resource_id: 20, q: "Ana", offset: 20, limit: 20, sort_by: "name", sort_order: "asc" },
    }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "code:asc");
    await waitFor(() => expect(getApi).toHaveBeenCalledWith("/drivers", {
      params: { resource_id: 20, q: "Ana", offset: 0, limit: 20, sort_by: "code", sort_order: "asc" },
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
      params: { resource_id: 21, offset: 0, limit: 20, sort_by: "name", sort_order: "asc" },
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

  it("crea un conductor usando el recurso seleccionado y el permiso de escritura", async () => {
    const user = userEvent.setup();
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [], total: 0, offset: 0, limit: 20 } }) as never);
    postApi.mockResolvedValue({ data: { id: 8 } } as never);
    renderPage(<DriversPage />);

    await user.click(await screen.findByRole("button", { name: "Nuevo conductor" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis Operador");
    await user.type(screen.getByRole("textbox", { name: "Código" }), "D-8");
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "300123");
    await user.type(screen.getByLabelText("Contraseña móvil"), "MobilePass8");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/drivers", {
      resource_id: 20,
      name: "Luis Operador",
      code: "D-8",
      description: "",
      phone: "300123",
      custom_fields: {},
      mobile_password: "MobilePass8",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Conductor creado.");
  });

  it("edita conductor y elimina un custom field de forma explícita", async () => {
    const user = userEvent.setup();
    const driver = { id: 7, resource_id: 20, name: "Ana", code: "A7", description: "AM", phone: "555", custom_fields: { zona: "norte" }, bound_unit_id: null };
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [driver], total: 1, offset: 0, limit: 20 } }) as never);
    patchApi.mockResolvedValue({ data: driver } as never);
    renderPage(<DriversPage />);

    await user.click(await screen.findByRole("button", { name: "Editar Ana" }));
    await user.type(screen.getByLabelText("Nueva contraseña móvil (opcional)"), "NewMobilePass");
    await user.click(screen.getByRole("button", { name: "Eliminar campo zona" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(patchApi).toHaveBeenCalledWith("/drivers/7", {
      name: "Ana",
      code: "A7",
      description: "AM",
      phone: "555",
      custom_fields: {},
      remove_custom_fields: ["zona"],
      mobile_password: "NewMobilePass",
    }, { params: { resource_id: 20 } }));
  });

  it("crea un pasajero enviando teléfono y campos personalizados explícitos", async () => {
    const user = userEvent.setup();
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [], total: 0, offset: 0, limit: 20 } }) as never);
    postApi.mockResolvedValue({ data: { id: 9 } } as never);
    renderPage(<PassengersPage />);

    await user.click(await screen.findByRole("button", { name: "Nuevo pasajero" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Luis Pasajero");
    await user.type(screen.getByRole("textbox", { name: "Código" }), "P-9");
    await user.type(screen.getByRole("textbox", { name: "Teléfono" }), "300789");
    await user.type(screen.getByRole("textbox", { name: "Nuevo campo" }), "grupo");
    await user.type(screen.getByRole("textbox", { name: "Valor" }), "norte");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/passengers", {
      resource_id: 20,
      name: "Luis Pasajero",
      code: "P-9",
      phone: "300789",
      timezone: 0,
      custom_fields: { grupo: "norte" },
    }));
  });

  it("envía la eliminación explícita de un custom field al editar pasajero", async () => {
    const user = userEvent.setup();
    const passenger = {
      id: 9,
      resource_id: 20,
      name: "Luis",
      code: "P9",
      timezone: -300,
      custom_fields: { grupo: "norte" },
      bound_unit_id: null,
    };
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [passenger], total: 1, offset: 0, limit: 20 } }) as never);
    patchApi.mockResolvedValue({ data: passenger } as never);
    renderPage(<PassengersPage />);

    await user.click(await screen.findByRole("button", { name: "Editar Luis" }));
    await user.type(screen.getByRole("textbox", { name: "Teléfono actual" }), "300456");
    await user.click(screen.getByRole("button", { name: "Eliminar campo grupo" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(patchApi).toHaveBeenCalledWith("/passengers/9", {
      name: "Luis",
      code: "P9",
      phone: "300456",
      timezone: -300,
      custom_fields: {},
      remove_custom_fields: ["grupo"],
    }, { params: { resource_id: 20 } }));
  });

  it("oculta las acciones de conductor si falta drivers:write", async () => {
    authMock.permissions = [];
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [], total: 0, offset: 0, limit: 20 } }) as never);
    renderPage(<DriversPage />);

    await screen.findByRole("heading", { name: "Conductores" });
    expect(screen.queryByRole("button", { name: "Nuevo conductor" })).not.toBeInTheDocument();
  });

  it("vincula un conductor a una unidad elegida desde la lista Wialon", async () => {
    const user = userEvent.setup();
    const driver = { id: 7, resource_id: 20, name: "Ana", code: "A7", description: "", phone: "555", custom_fields: {}, bound_unit_id: null };
    const vehicle = { id: 42, name: "Camión norte", latitude: 4.7, longitude: -74.1, speed_kmh: 0, heading_degrees: 0, direction: "N", last_communication: null, status: "stopped" };
    getApi.mockImplementation((url) => Promise.resolve(
      url === "/resources" ? resources : url === "/vehicles"
        ? { data: { items: [vehicle], total: 1, offset: 0, limit: 100 } }
        : { data: { items: [driver], total: 1, offset: 0, limit: 20 } },
    ) as never);
    postApi.mockResolvedValue(undefined as never);
    renderPage(<DriversPage />);

    await user.selectOptions(await screen.findByRole("combobox", { name: "Vehículo para vincular Ana" }), "42");
    await user.click(screen.getByRole("button", { name: "Vincular" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/drivers/7/bindings", {
      resource_id: 20,
      unit_id: 42,
    }));
  });

  it("vincula un pasajero usando el recurso y el vehículo seleccionados", async () => {
    const user = userEvent.setup();
    const passenger = { id: 9, resource_id: 20, name: "Luis", code: "P9", timezone: 0, custom_fields: {}, bound_unit_id: null };
    getApi.mockImplementation((url) => Promise.resolve(
      url === "/resources" ? resources : url === "/vehicles"
        ? { data: { items: [{ id: 42, name: "Truck" }], total: 1, offset: 0, limit: 100 } }
        : { data: { items: [passenger], total: 1, offset: 0, limit: 20 } },
    ) as never);
    postApi.mockResolvedValue(undefined as never);
    renderPage(<PassengersPage />);

    await user.selectOptions(await screen.findByRole("combobox", { name: "Vehículo para vincular Luis" }), "42");
    await user.click(screen.getByRole("button", { name: "Vincular" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/passengers/9/bindings", {
      resource_id: 20,
      unit_id: 42,
    }));
  });

  it("solicita confirmación antes de eliminar un pasajero", async () => {
    const user = userEvent.setup();
    const passenger = { id: 9, resource_id: 20, name: "Luis", code: "P9", timezone: 0, custom_fields: {}, bound_unit_id: null };
    getApi.mockImplementation((url) => Promise.resolve(url === "/resources"
      ? resources
      : { data: { items: [passenger], total: 1, offset: 0, limit: 20 } }) as never);
    deleteApi.mockResolvedValue(undefined as never);
    renderPage(<PassengersPage />);

    await user.click(await screen.findByRole("button", { name: "Eliminar Luis" }));
    expect(screen.getByRole("alert", { name: "Confirmar eliminación" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));

    await waitFor(() => expect(deleteApi).toHaveBeenCalledWith("/passengers/9", {
      params: { resource_id: 20 },
    }));
  });
});
