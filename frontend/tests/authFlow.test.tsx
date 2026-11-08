import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../src/app/providers/AppProviders";
import { AppRouter } from "../src/app/router/AppRouter";
import type { AuthUser } from "../src/features/auth/types";

const api = vi.hoisted(() => ({ loginRequest: vi.fn(), refreshRequest: vi.fn(), getCurrentUser: vi.fn(), logoutRequest: vi.fn(), changePasswordRequest: vi.fn() }));
vi.mock("../src/features/auth/authApi", () => api);
vi.mock("../src/features/dashboard/dashboardApi", () => ({
  getFleetDashboard: vi.fn().mockResolvedValue({
    generated_at: "2026-11-07T12:00:00Z",
    total_vehicles: 1,
    moving_vehicles: 1,
    stopped_vehicles: 0,
    no_signal_vehicles: 0,
    vehicles_with_driver: 0,
    vehicles_without_driver: 1,
    total_drivers: 0,
    total_passengers: 0,
  }),
}));

const makeUser = (role: AuthUser["role"], permissions: string[] = [], must_change_password = false): AuthUser => ({
  id: 7, email: "person@example.com", name: "Casey User", role, is_active: true, must_change_password,
  created_at: "2026-01-01T00:00:00Z", last_login_at: null, permissions,
});

function renderApp(path: string) {
  window.history.replaceState({}, "", path);
  return render(<AppProviders><AppRouter /></AppProviders>);
}

describe("autenticación y autorización", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.refreshRequest.mockRejectedValue(new Error("Sin sesión"));
  });

  it("valida el formulario antes de enviar credenciales", async () => {
    const user = userEvent.setup();
    renderApp("/login");
    await user.click(await screen.findByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Ingresa un correo válido.")).toBeVisible();
    expect(api.loginRequest).not.toHaveBeenCalled();
  });

  it("inicia sesión y habilita la sección según el permiso recibido", async () => {
    api.loginRequest.mockResolvedValue({ access_token: "memory-token", csrf_token: "csrf-value", expires_in: 300, token_type: "bearer", user: makeUser("admin", ["dashboard:view", "users:manage"]) });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("heading", { name: "Tu flota, bajo control." })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Usuarios y roles" }));
    expect(await screen.findByRole("heading", { name: "Usuarios y roles" })).toBeVisible();
  });

  it("deniega la ruta de administración a un usuario sin permiso", async () => {
    api.loginRequest.mockResolvedValue({ access_token: "memory-token", csrf_token: "csrf-value", expires_in: 300, token_type: "bearer", user: makeUser("operator", ["dashboard:view"]) });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await screen.findByRole("heading", { name: "Tu flota, bajo control." });
    expect(screen.queryByRole("link", { name: "Usuarios y roles" })).not.toBeInTheDocument();
    window.history.pushState({}, "", "/app/admin");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(await screen.findByRole("heading", { name: "Acceso denegado" })).toBeVisible();
  });

  it("obliga a cambiar la contraseña y vuelve al login tras invalidar la sesión", async () => {
    api.loginRequest.mockResolvedValue({ access_token: "memory-token", csrf_token: "csrf-value", expires_in: 300, token_type: "bearer", user: makeUser("viewer", [], true) });
    api.changePasswordRequest.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await user.type(await screen.findByLabelText("Contraseña actual"), "Secret123");
    await user.type(screen.getByLabelText("Nueva contraseña"), "BetterPass456");
    await user.type(screen.getByLabelText("Confirma la nueva contraseña"), "BetterPass456");
    await user.click(screen.getByRole("button", { name: "Actualizar contraseña" }));
    await waitFor(() => expect(api.changePasswordRequest).toHaveBeenCalledWith({ current_password: "Secret123", new_password: "BetterPass456" }));
    expect(await screen.findByRole("heading", { name: "Hola de nuevo" })).toBeVisible();
  });

  it("abre y cierra el menú móvil del shell con teclado y botón accesible", async () => {
    const permissions = ["dashboard:view", "vehicles:view", "drivers:view", "passengers:view", "history:view"];
    api.loginRequest.mockResolvedValue({ access_token: "memory-token", csrf_token: "csrf-value", expires_in: 300, token_type: "bearer", user: makeUser("viewer", permissions) });
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "person@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await screen.findByRole("heading", { name: "Tu flota, bajo control." });
    const menuButton = screen.getByRole("button", { name: "Abrir navegación" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await user.click(menuButton);
    expect(screen.getByRole("button", { name: "Cerrar navegación" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Secciones de la aplicación" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Vehículos" }));
    expect(await screen.findByRole("heading", { name: "Vehículos" })).toBeVisible();
  });
});
