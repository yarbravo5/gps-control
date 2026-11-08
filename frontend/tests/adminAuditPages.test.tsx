import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../src/services/api/httpClient";
import { ToastProvider } from "../src/components/feedback/ToastProvider";
import { AdminUsersPage } from "../src/features/admin/AdminUsersPage";
import { AuditPage } from "../src/features/audit/AuditPage";
import type { ManagedUser } from "../src/features/admin/adminApi";

vi.mock("../src/services/api/httpClient", () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const getApi = vi.mocked(httpClient.get);
const postApi = vi.mocked(httpClient.post);

const managedUser: ManagedUser = {
  id: 1,
  email: "admin@gpscontrol.com",
  name: "Ana Admin",
  role: "admin",
  is_active: true,
  must_change_password: false,
  created_at: "2026-01-01T00:00:00Z",
  last_login_at: null,
};

function renderPage(page: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<ToastProvider><QueryClientProvider client={queryClient}>{page}</QueryClientProvider></ToastProvider>);
}

describe("páginas de administración", () => {
  beforeEach(() => {
    getApi.mockReset();
    postApi.mockReset();
    vi.mocked(httpClient.patch).mockReset();
  });

  it("crea un usuario con rol y contraseña temporal", async () => {
    const user = userEvent.setup();
    getApi.mockResolvedValue({ data: { items: [], total: 0, offset: 0, limit: 25 } } as never);
    postApi.mockResolvedValue({ data: managedUser } as never);
    renderPage(<AdminUsersPage />);

    await user.click(await screen.findByRole("button", { name: "Crear usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Operador Uno");
    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "operator@example.com");
    await user.type(screen.getByLabelText("Contraseña temporal"), "TempPass123!");
    await user.selectOptions(screen.getByRole("combobox", { name: "Rol" }), "operator");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/users", {
      name: "Operador Uno",
      email: "operator@example.com",
      password: "TempPass123!",
      role: "operator",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Debe cambiar la contraseña");
  });

  it("valida la contraseña antes de enviar y conserva el rol seleccionado", async () => {
    const user = userEvent.setup();
    getApi.mockResolvedValue({ data: { items: [], total: 0, offset: 0, limit: 25 } } as never);
    renderPage(<AdminUsersPage />);

    await user.click(await screen.findByRole("button", { name: "Crear usuario" }));
    await user.type(screen.getByRole("textbox", { name: "Nombre" }), "Operador Dos");
    await user.type(screen.getByRole("textbox", { name: "Correo electrónico" }), "operator2@example.com");
    await user.type(screen.getByLabelText("Contraseña temporal"), "WeakPass");
    await user.selectOptions(screen.getByRole("combobox", { name: "Rol" }), "operator");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("debe incluir al menos un número");
    expect(postApi).not.toHaveBeenCalled();
  });

  it("restablece la contraseña con el endpoint administrativo", async () => {
    const user = userEvent.setup();
    getApi.mockResolvedValue({ data: { items: [managedUser], total: 1, offset: 0, limit: 25 } } as never);
    postApi.mockResolvedValue({ data: managedUser } as never);
    renderPage(<AdminUsersPage />);

    await user.click(await screen.findByRole("button", { name: "Restablecer contraseña de admin@gpscontrol.com" }));
    await user.type(screen.getByLabelText("Nueva contraseña temporal"), "ResetPass456!");
    await user.click(screen.getByRole("button", { name: "Restablecer" }));

    await waitFor(() => expect(postApi).toHaveBeenCalledWith("/users/1/reset-password", {
      new_password: "ResetPass456!",
    }));
  });

  it("muestra actor, acción y hora de auditoría sin volcar details", async () => {
    getApi.mockResolvedValue({ data: { items: [{
      id: 11,
      user_id: 7,
      action: "user.create",
      entity: "user",
      entity_id: "9",
      details: { password: "must-not-render" },
      ip_address: "127.0.0.1",
      created_at: "2026-11-07T12:00:00Z",
    }], total: 1, offset: 0, limit: 25 } } as never);
    renderPage(<AuditPage />);

    expect(await screen.findByText("user.create")).toBeVisible();
    expect(screen.getByText("Usuario #7")).toBeVisible();
    expect(screen.getByText(/7:00 a\. m\./)).toBeVisible();
    expect(screen.queryByText("must-not-render")).not.toBeInTheDocument();
  });

  it("presenta el estado vacío de auditoría", async () => {
    getApi.mockResolvedValue({ data: { items: [], total: 0, offset: 0, limit: 25 } } as never);
    renderPage(<AuditPage />);

    expect(await screen.findByRole("heading", { name: "No hay eventos de auditoría" })).toBeVisible();
  });
});
