"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// Input — Componente reutilizable con estados
// ──────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, type, className = "", id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;
    const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="group relative flex flex-col gap-1.5">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest transition-colors group-focus-within:text-red-500"
        >
          {label}
        </label>

        {/* Input wrapper */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            autoComplete={isPassword ? "current-password" : undefined}
            className={`
              w-full rounded-none border-2 bg-black px-4 py-4 text-sm font-black text-zinc-100 uppercase tracking-widest
              placeholder:text-zinc-600
              outline-none transition-all duration-200
              border-zinc-800
              hover:border-zinc-600
              focus:border-red-600 focus:bg-zinc-900
              disabled:cursor-not-allowed disabled:opacity-50
              ${isPassword ? "pr-12" : ""}
              ${error ? "border-red-500 focus:border-red-500" : ""}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {/* Toggle de visibilidad para passwords */}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-red-500 animate-in slide-in-from-top-1 fade-in duration-200"
            role="alert"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-zinc-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
