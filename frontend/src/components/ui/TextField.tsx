import { useId } from "react";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, className = "", ...props }: TextFieldProps) {
  const inputId = useId();
  const descriptionId = `${inputId}-description`;

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-slate-800" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={error || hint ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        className={`min-h-11 rounded-control border bg-white px-3 py-2 text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? "border-brand-wine" : "border-slate-300"} ${className}`}
        id={inputId}
        {...props}
      />
      {error || hint ? (
        <p className={`text-sm ${error ? "text-wine-dark" : "text-muted"}`} id={descriptionId}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
