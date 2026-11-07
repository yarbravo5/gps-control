import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AppProviders } from "../src/app/providers/AppProviders";
import { AppRouter } from "../src/app/router/AppRouter";

describe("application router", () => {
  it("renders the public landing page at the root route", () => {
    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: /tu flota, bajo control/i })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
  });
});
