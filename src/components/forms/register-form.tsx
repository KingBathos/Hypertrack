"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  registerFormSchema,
  type RegisterFormData,
} from "@/lib/schemas/user.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// RegisterForm — Fase 1 del Onboarding
// ──────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Manejar errores del servidor
        if (response.status === 409) {
          setServerError("Este email ya está registrado. ¿Quieres iniciar sesión?");
        } else if (response.status === 422 && result.error?.details) {
          // Errores de validación del servidor
          const messages = Object.values(result.error.details).flat().join(". ");
          setServerError(messages as string);
        } else {
          setServerError(
            result.error?.message || "Error inesperado. Inténtalo de nuevo."
          );
        }
        return;
      }

      // Registro exitoso
      setIsSuccess(true);

      // Redirigir al onboarding del perfil después de breve delay
      setTimeout(() => {
        router.push(`/onboarding/profile?uid=${result.data.publicId}`);
      }, 1500);
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
          <h3 className="text-lg font-semibold text-zinc-100">
            ¡Cuenta creada!
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Preparando tu perfil…
          </p>
        </div>
        {/* Barra de progreso animada */}
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
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        error={errors.password?.message}
        hint="Mayúscula, minúscula y número requeridos"
        {...register("password")}
      />

      {/* Confirm Password */}
      <Input
        label="Confirmar contraseña"
        type="password"
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {/* Submit */}
      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
        size="lg"
        className="mt-2"
      >
        Crear cuenta
      </Button>

      {/* Términos */}
      <p className="text-center text-xs text-zinc-500">
        Al registrarte, aceptas nuestros{" "}
        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
          Términos de Servicio
        </a>{" "}
        y{" "}
        <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
          Política de Privacidad
        </a>
      </p>
    </form>
  );
}
