"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  registerProFormSchema,
  type RegisterProFormData,
} from "@/lib/schemas/user.schema";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertCircle } from "@/components/ui/icons";

// ──────────────────────────────────────────────────
// RegisterProForm — Registro de Entrenadores y Nutricionistas
// ──────────────────────────────────────────────────

export function RegisterProForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterProFormData>({
    resolver: zodResolver(registerProFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      role: "COACH", // Default
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterProFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/register-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setServerError("Este email ya está registrado.");
        } else if (response.status === 422 && result.error?.details) {
          const messages = Object.values(result.error.details).flat().join(". ");
          setServerError(messages as string);
        } else {
          setServerError(
            result.error?.message || "Error inesperado. Inténtalo de nuevo."
          );
        }
        return;
      }

      setIsSuccess(true);

      setTimeout(() => {
        if (data.role === "COACH") {
          router.push("/coach");
        } else {
          router.push("/nutritionist");
        }
      }, 1500);
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
            ¡ACEPTADO!
          </h3>
          <p className="mt-2 text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">
            Iniciando portal profesional...
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

      {/* Role Selection (Brutalist style) */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-black text-zinc-500 uppercase tracking-widest">
          Especialidad
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={`
            cursor-pointer border-2 p-4 text-center transition-all duration-200
            ${selectedRole === "COACH" ? "border-red-600 bg-red-600/10 text-red-500" : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600"}
          `}>
            <input type="radio" value="COACH" className="sr-only" {...register("role")} />
            <span className="font-heading font-black tracking-widest uppercase">COACH</span>
          </label>
          <label className={`
            cursor-pointer border-2 p-4 text-center transition-all duration-200
            ${selectedRole === "NUTRITIONIST" ? "border-red-600 bg-red-600/10 text-red-500" : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600"}
          `}>
            <input type="radio" value="NUTRITIONIST" className="sr-only" {...register("role")} />
            <span className="font-heading font-black tracking-widest uppercase">NUTRICIONISTA</span>
          </label>
        </div>
        {errors.role && (
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-500 mt-1">
            {errors.role.message}
          </p>
        )}
      </div>

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
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        error={errors.password?.message}
        hint="Mayúscula, minúscula y número"
        {...register("password")}
      />

      <Input
        label="Confirmar contraseña"
        type="password"
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full bg-red-600 px-8 py-5 text-lg font-heading font-black tracking-widest text-white uppercase transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-none shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
      >
        {isSubmitting ? "PROCESANDO..." : "UNIRME COMO PROFESIONAL"}
      </button>
    </form>
  );
}
