"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ──────────────────────────────────────────────────
// LogoutButton — Botón de cierre de sesión
// Llama POST /api/auth/logout y redirige a /login
// ──────────────────────────────────────────────────

interface LogoutButtonProps {
  className?: string;
  variant?: "icon" | "full";
}

function IconLogout({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function LogoutButton({ className = "", variant = "full" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  if (variant === "icon") {
    return (
      <button
        id="btn-logout"
        onClick={handleLogout}
        disabled={loading}
        title="Cerrar sesión"
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-500 transition-all hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-40 ${className}`}
      >
        <IconLogout className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
      </button>
    );
  }

  return (
    <button
      id="btn-logout"
      onClick={handleLogout}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all hover:bg-red-500/5 hover:text-red-400 disabled:opacity-40 ${className}`}
    >
      <IconLogout className={`h-3.5 w-3.5 ${loading ? "animate-pulse" : ""}`} />
      {loading ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}
