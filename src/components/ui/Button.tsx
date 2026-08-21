"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-brand-horizontal text-white shadow-[0_4px_24px_-4px_rgba(217,70,239,0.5)] hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-3 text-white hover:bg-surface-3/80 border border-border",
  outline: "bg-transparent text-white border border-border-strong hover:bg-white/5",
  ghost: "bg-transparent text-white hover:bg-white/5",
  danger: "bg-danger text-white hover:brightness-110",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-6 py-3.5 rounded-2xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, fullWidth, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] tap-highlight-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
});
