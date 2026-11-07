import type { HTMLAttributes, PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren<HTMLAttributes<HTMLElement>> {
  title?: string;
}

export function Card({ title, children, className = "", ...props }: CardProps) {
  return (
    <section
      className={`rounded-card border border-slate-200 bg-white p-5 shadow-card sm:p-6 ${className}`}
      {...props}
    >
      {title ? <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </section>
  );
}
