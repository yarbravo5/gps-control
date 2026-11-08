import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "../src/components/feedback/EmptyState";
import { ErrorState } from "../src/components/feedback/ErrorState";
import { LoadingState } from "../src/components/feedback/LoadingState";
import { ToastProvider, useToast } from "../src/components/feedback/ToastProvider";
import { Button } from "../src/components/ui/Button";
import { TextField } from "../src/components/ui/TextField";

describe("base accessible components", () => {
  it("supports Tab navigation and disables pending actions", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button>Primera acción</Button>
        <Button variant="secondary">Segunda acción</Button>
        <Button disabled>Guardando</Button>
      </>,
    );

    const firstButton = screen.getByRole("button", { name: "Primera acción" });
    const secondButton = screen.getByRole("button", { name: "Segunda acción" });
    const pendingButton = screen.getByRole("button", { name: "Guardando" });

    await user.tab();
    expect(firstButton).toHaveFocus();
    await user.tab();
    expect(secondButton).toHaveFocus();
    expect(firstButton).toHaveClass("focus-visible:outline-2");
    expect(pendingButton).toBeDisabled();
  });

  it("connects a field error to its input", () => {
    render(<TextField error="El correo no es válido." label="Correo" />);
    const input = screen.getByRole("textbox", { name: "Correo" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("El correo no es válido.");
  });

  it("exposes loading, empty and retry states semantically", () => {
    const onRetry = vi.fn();
    render(
      <>
        <LoadingState label="Cargando" />
        <EmptyState title="Sin resultados" description="Prueba otra búsqueda." />
        <ErrorState description="Vuelve a intentar." onRetry={onRetry} />
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.getByRole("heading", { name: "Sin resultados" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Vuelve a intentar.");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("announces success notifications and lets keyboard users dismiss them", async () => {
    function NotifyButton() {
      const notify = useToast();
      return <Button onClick={() => notify("Cambios guardados.")}>Guardar cambio</Button>;
    }

    const user = userEvent.setup();
    render(<ToastProvider><NotifyButton /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Guardar cambio" }));

    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados.");
    await user.click(screen.getByRole("button", { name: "Cerrar notificación" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
