"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";

// ──────────────────────────────────────────────────
// Select — Componente reutilizable estilo dark mode
// ──────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, options, placeholder, className = "", id, ...props },
    ref
  ) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="group relative flex flex-col gap-1.5">
        {/* Label */}
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-zinc-400 transition-colors group-focus-within:text-cyan-400"
        >
          {label}
        </label>

        {/* Select */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full appearance-none rounded-xl border bg-zinc-900/50 px-4 py-3 pr-10 text-sm text-zinc-100
              outline-none transition-all duration-200
              border-zinc-700/50
              hover:border-zinc-600
              focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-zinc-900/80
              disabled:cursor-not-allowed disabled:opacity-50
              ${error ? "border-red-500/50 ring-2 ring-red-500/20 focus:border-red-500/50 focus:ring-red-500/20" : ""}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-zinc-600 bg-zinc-900">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-zinc-900 text-zinc-100"
              >
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={`${selectId}-error`}
            className="flex items-center gap-1 text-xs text-red-400"
            role="alert"
          >
            <svg
              className="h-3.5 w-3.5 flex-shrink-0"
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
          <p id={`${selectId}-hint`} className="text-xs text-zinc-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
