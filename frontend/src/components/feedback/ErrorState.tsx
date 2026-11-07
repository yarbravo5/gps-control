import { useId } from "react";

import { Button } from "../ui/Button";

interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "No pudimos completar la solicitud",
  description,
  onRetry,
}: ErrorStateProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-card border border-red-200 bg-red-50 p-5" role="alert">
      <h2 className="font-semibold text-wine-dark" id={headingId}>{title}</h2>
      <p className="mt-1 text-sm text-wine-dark">{description}</p>
      {onRetry ? <Button className="mt-4" onClick={onRetry} variant="secondary">Reintentar</Button> : null}
    </section>
  );
}
