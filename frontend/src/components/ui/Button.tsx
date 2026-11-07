import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "button-primary focus-visible:outline-brand-teal",
  secondary: "border border-brand-teal text-teal-900 hover:bg-purple-soft focus-visible:outline-brand-teal",
  danger: "bg-brand-wine text-white hover:bg-red-950 focus-visible:outline-brand-wine",
  quiet: "text-slate-700 hover:bg-purple-soft focus-visible:outline-brand-teal",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-control px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    />
  );
}
