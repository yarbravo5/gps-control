import { useEffect, useState } from "react";

interface LoadingStateProps {
  label?: string;
  hint?: string;
  hintAfterMs?: number;
}

export function LoadingState({ label = "Cargando información", hint, hintAfterMs = 5000 }: LoadingStateProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setShowHint(true), hintAfterMs);
    return () => clearTimeout(timer);
  }, [hint, hintAfterMs]);

  return (
    <div aria-live="polite" className="flex items-center gap-3 py-5 text-muted" role="status">
      <span aria-hidden="true" className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand-teal border-r-transparent motion-reduce:animate-none" />
      <div className="grid gap-1">
        <span>{label}</span>
        {hint && showHint ? <span className="text-sm">{hint}</span> : null}
      </div>
    </div>
  );
}
