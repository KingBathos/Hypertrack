"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loginFormSchema,
  type LoginFormData,
} from "@/lib/schemas/user.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// LoginForm — Formulario de inicio de sesión
// ──────────────────────────────────────────────────

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/dashboard";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setServerError("Email o contraseña incorrectos. Verifica tus datos.");
        } else if (response.status === 403) {
          setServerError(
            "Tu cuenta está temporalmente bloqueada. Contacta a soporte."
          );
        } else {
          setServerError(
            result.error?.message || "Error inesperado. Inténtalo de nuevo."
          );
        }
        return;
      }

      // Login exitoso
      setIsSuccess(true);

      let finalRedirect = redirectTo;
      if (result.data?.role && result.data.role !== "USER") {
        if (result.data.role === "COACH") finalRedirect = "/coach";
        if (result.data.role === "NUTRITIONIST") finalRedirect = "/nutritionist";
        if (result.data.role === "ADMIN") finalRedirect = "/admin";
      }

      setTimeout(() => {
        router.push(finalRedirect);
        router.refresh();
      }, 800);
    } catch {
      setServerError("No se pudo conectar con el servidor. Verifica tu conexión.");
    }
  };

  // ── Estado de éxito ──
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-2 ring-emerald-500/20">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-100">¡Bienvenido de vuelta!</h3>
          <p className="mt-1 text-sm text-zinc-400">Cargando tu dashboard…</p>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full animate-progress rounded-full bg-linear-to-r from-cyan-500 to-emerald-500" />
        </div>
      </div>
    );
  }

  // ── Formulario ──
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Error del servidor */}
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      {/* Email */}
      <Input
        label="Email"
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      {/* Password */}
      <Input
        label="Contraseña"
        type="password"
        placeholder="Tu contraseña"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      {/* Submit */}
      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
        size="lg"
        className="mt-2"
      >
        Iniciar sesión
      </Button>

      {/* Link olvidé contraseña */}
      <p className="text-center text-xs text-zinc-500">
        ¿Olvidaste tu contraseña?{" "}
        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
          Recupérala aquí
        </a>
      </p>
    </form>
  );
}
