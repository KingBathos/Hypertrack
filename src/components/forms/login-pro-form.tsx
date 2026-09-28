"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  loginFormSchema,
  type LoginFormData,
} from "@/lib/schemas/user.schema";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// LoginProForm — Login de Entrenadores y Nutricionistas
// ──────────────────────────────────────────────────

export function LoginProForm() {
  const router = useRouter();

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
          setServerError("Email o contraseña incorrectos.");
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

      // Evitar que usuarios estándar usen este login
      if (result.data.role === "USER") {
        setServerError("Esta cuenta no pertenece a un profesional.");
        return;
      }

      // Login exitoso
      setIsSuccess(true);
      
      let redirectTo = "/dashboard";
      if (result.data.role === "COACH") redirectTo = "/coach";
      if (result.data.role === "NUTRITIONIST") redirectTo = "/nutritionist";
      if (result.data.role === "ADMIN") redirectTo = "/admin";

      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 800);
    } catch {
      setServerError("No se pudo conectar con el servidor. Verifica tu conexión.");
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-none bg-emerald-500/10 border-2 border-emerald-500">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <div className="text-center mt-4">
          <h3 className="text-xl font-heading font-black text-white uppercase tracking-widest">
            ¡ACCESO PERMITIDO!
          </h3>
          <p className="mt-2 text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">
            Cargando portal profesional...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {serverError && (
        <div className="flex items-start gap-3 border-2 border-red-500 bg-black p-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-red-500">{serverError}</p>
        </div>
      )}

      <Input
        label="Email Profesional"
        type="email"
        placeholder="coach@hypertrack.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Contraseña"
        type="password"
        placeholder="Tu contraseña secreta"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full bg-red-600 px-8 py-5 text-lg font-heading font-black tracking-widest text-white uppercase transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-none shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
      >
        {isSubmitting ? "AUTENTICANDO..." : "INGRESAR AL PORTAL PRO"}
      </button>
    </form>
  );
}
