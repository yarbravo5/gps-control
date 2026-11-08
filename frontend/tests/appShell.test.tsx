import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { name: "Admin", role: "admin" as const, permissions: [
    "dashboard:view", "vehicles:view", "drivers:view", "passengers:view",
    "history:view", "users:manage", "audit:view",
  ] },
  logout: vi.fn(),
  hasPermission: (permission: string) => auth.user.permissions.includes(permission),
}));

vi.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: auth.user, logout: auth.logout, hasPermission: auth.hasPermission }),
}));

import { AppShell } from "../src/features/auth/AppShell";

describe("dashboard navigation drawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens as an overlay and closes with Escape without removing the page content", () => {
    render(<MemoryRouter initialEntries={["/app"]}><Routes><Route path="/app" element={<AppShell />}><Route index element={<h1>Centro de operaciones</h1>} /></Route></Routes></MemoryRouter>);

    const heading = screen.getByRole("heading", { name: "Centro de operaciones" });
    const toggle = screen.getByRole("button", { name: "Abrir navegación" });
    fireEvent.click(toggle);

    expect(screen.getByRole("navigation", { name: "Secciones de la aplicación" })).toBeVisible();
    expect(screen.getByRole("link", { name: /vehículos/i })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cerrar navegación" })).toHaveAttribute("aria-expanded", "true");
    expect(heading).toBeInTheDocument();
    expect(document.querySelector(".app-navigation-backdrop")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector("#app-navigation")?.className).toContain("hidden");
    expect(screen.getByRole("button", { name: "Abrir navegación" })).toHaveAttribute("aria-expanded", "false");
    expect(heading).toBeInTheDocument();
  });
});
