import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "../src/app/providers/AppProviders";
import { AppRouter } from "../src/app/router/AppRouter";
import type { AuthUser } from "../src/features/auth/types";

const api = vi.hoisted(() => ({ loginRequest: vi.fn(), refreshRequest: vi.fn(), getCurrentUser: vi.fn(), logoutRequest: vi.fn(), changePasswordRequest: vi.fn() }));
vi.mock("../src/features/auth/authApi", () => api);
vi.mock("../src/features/dashboard/dashboardApi", () => ({
  getFleetDashboard: vi.fn().mockResolvedValue({
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

const admin: AuthUser = { id: 1, email: "admin@example.com", name: "Ana Admin", role: "admin", is_active: true, must_change_password: false, created_at: "2026-01-01T00:00:00Z", last_login_at: null, permissions: ["dashboard:view", "vehicles:view", "users:manage"] };

function renderRoute(path = "/") {
  window.history.replaceState({}, "", path);
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  return render(<AppProviders><AppRouter /></AppProviders>);
}

describe("landing pública", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.refreshRequest.mockRejectedValue(new Error("Sin sesión"));
  });

  it("presenta las secciones públicas y permite ir al login", async () => {
    const user = userEvent.setup();
    renderRoute();
    expect(await screen.findByRole("heading", { name: /tu flota, bajo control/i })).toBeVisible();
    const hero = screen.getByRole("region", { name: "Presentación principal de GPS Control" });
    const heroLayout = hero.querySelector(".landing-hero__layout");
    expect(hero.querySelector(".landing-hero__banner")).toBeInTheDocument();
    expect(heroLayout?.children).toHaveLength(2);
    expect(heroLayout?.children[0]).toHaveClass("landing-hero__copy");
    expect(heroLayout?.children[1]).toHaveClass("landing-hero__visual");
    expect(hero.querySelectorAll(".fleet-wheel")).toHaveLength(8);
    expect(hero.querySelectorAll('[data-axle^="front-"]')).toHaveLength(2);
    expect(hero.querySelectorAll('[data-axle^="rear-"]')).toHaveLength(6);
    expect(hero.querySelectorAll('[data-axle^="rear-front-"]')).toHaveLength(3);
    expect(hero.querySelectorAll('[data-axle^="rear-back-"]')).toHaveLength(3);
    expect(hero.querySelector(".landing-visual-tag")).not.toBeInTheDocument();
    const wheelGroups = [...hero.querySelectorAll<SVGGElement>(".fleet-wheel")];
    expect(new Set(wheelGroups.map((wheel) => wheel.dataset.center?.split(",")[0])).size).toBe(8);
    expect(wheelGroups.every((wheel) => wheel.dataset.center?.endsWith(",354"))).toBe(true);
    expect(wheelGroups.every((wheel) => wheel.dataset.radius === "31")).toBe(true);
    expect(wheelGroups.every((wheel) => wheel.querySelector(":scope > .fleet-wheel-spin circle[r='31']"))).toBe(true);
    expect(hero.querySelector(".fleet-road-markings")).toBeInTheDocument();
    expect(hero.querySelector(".fleet-gps-route")).toBeInTheDocument();
    expect(hero.querySelector(".fleet-visual__caption")).not.toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: /explorar la plataforma/i })).toBeVisible();
    expect(within(hero).getByRole("group", { name: "Funciones principales" })).toContainElement(
      within(hero).getByRole("heading", { name: /ubicación gps/i }),
    );
    expect(screen.getByRole("heading", { name: /la información que necesitas/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: /de la señal gps a una operación/i })).toBeVisible();
    expect(screen.getByRole("contentinfo")).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Iniciar sesión" })).toHaveLength(1);
    await user.click(screen.getAllByRole("link", { name: "Iniciar sesión" })[0]);
    expect(await screen.findByRole("heading", { name: "Hola de nuevo" })).toBeVisible();
  });

  it("permite desplegar los enlaces de la landing con el control móvil", async () => {
    const user = userEvent.setup();
    renderRoute();
    const menu = screen.getByLabelText("Abrir o cerrar menú de navegación");
    await user.click(menu);
    const menuDetails = menu.closest("details");
    expect(menuDetails).toHaveAttribute("open");
    expect(screen.getAllByRole("link", { name: "Funcionalidades" })).toHaveLength(3);
    await user.click(within(menuDetails as HTMLElement).getByRole("link", { name: "Funcionalidades" }));
    expect(menuDetails).not.toHaveAttribute("open");
    expect(window.location.hash).toBe("#funcionalidades");
  });

  it("mantiene el header visible con mayor profundidad al desplazarse y el logo vuelve a inicio", async () => {
    const user = userEvent.setup();
    renderRoute();
    const header = document.querySelector(".landing-header");
    expect(header).toBeInTheDocument();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 80 });
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(header).toHaveClass("landing-header--scrolled");
    await screen.findAllByRole("link", { name: "Iniciar sesión" });
    const logo = screen.getAllByRole("link", { name: "GPS Control, volver al inicio" })[0];
    expect(logo).toHaveAttribute("href", "#inicio");
    await user.click(logo);
    expect(window.location.hash).toBe("#inicio");
  });

  it("muestra el acceso al panel cuando existe una sesión autenticada", async () => {
    api.loginRequest.mockResolvedValue({ access_token: "memory-only", csrf_token: "csrf", token_type: "bearer", expires_in: 300, user: admin });
    const user = userEvent.setup();
    renderRoute("/login");
    await user.type(await screen.findByLabelText("Correo electrónico"), "admin@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));
    await screen.findByRole("heading", { name: "Tu flota, bajo control." });
    act(() => {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findAllByRole("link", { name: "Ir al panel de control" })).toHaveLength(2);
  });
});
