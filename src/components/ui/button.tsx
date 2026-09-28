"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Loader } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// Button — Componente con variantes y estado loading
// ──────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-red-600 
    text-white font-black tracking-widest uppercase
    border-2 border-transparent
    hover:bg-black hover:border-red-600 hover:text-red-500
    active:bg-zinc-900
    disabled:opacity-50 disabled:hover:bg-red-600 disabled:hover:border-transparent disabled:hover:text-white
  `,
  secondary: `
    bg-black border-2 border-zinc-800
    text-zinc-400 font-black tracking-widest uppercase
    hover:border-zinc-400 hover:text-white
    active:bg-zinc-900
    disabled:opacity-50
  `,
  ghost: `
    bg-transparent border-2 border-transparent
    text-zinc-500 font-bold tracking-widest uppercase
    hover:text-white hover:border-zinc-800
    active:bg-zinc-900
    disabled:opacity-50
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-xs rounded-none gap-2",
  md: "h-14 px-8 text-sm rounded-none gap-3",
  lg: "h-16 px-10 text-base rounded-none gap-4",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          relative inline-flex items-center justify-center
          font-medium
          transition-all duration-200 ease-out
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${isDisabled ? "cursor-not-allowed" : ""}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Loader size={size === "sm" ? 14 : 18} className="shrink-0" />
        )}
        <span className={loading ? "opacity-80" : ""}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
