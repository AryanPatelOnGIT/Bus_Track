/**
 * BusTrack - Shared Button Component - Ref: Ecosystem entry
 *
 * Props:
 *   variant: "primary" | "secondary" | "ghost" | "danger"
 *   size: "sm" | "md" | "lg"
 *   loading?: boolean  – Show spinner, disable interaction
 *   icon?: ReactNode   – Optional left icon
 *
 * TODO: Implement with:
 * - Tailwind variant classes based on brand color tokens
 * - Framer Motion press/hover micro-animations
 * - Loading spinner state that preserves button width
 * - Accessible: role="button", aria-disabled, focus ring
 */

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

// STUB: Implement full variant logic
export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/50";

  // TODO: Expand this map with full variant + size classes
  const variants: Record<string, string> = {
    primary: "bg-brand-primary text-white hover:bg-brand-primary/90 active:scale-95",
    secondary: "bg-brand-surface text-white/80 hover:bg-brand-muted border border-white/10",
    ghost: "text-white/70 hover:text-white hover:bg-white/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}
