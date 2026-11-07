import { useId } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-card border border-dashed border-slate-300 bg-white p-6 text-center">
      <h2 className="font-semibold text-slate-900" id={headingId}>{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </section>
  );
}
