import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AppProviders } from "../src/app/providers/AppProviders";
import { AppRouter } from "../src/app/router/AppRouter";

describe("application router", () => {
  it("renders the public landing page at the root route", async () => {
    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    );

    expect(await screen.findByRole("heading", { name: /tu flota, bajo control/i })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Navegación pública" })).toBeInTheDocument();
  });
});
