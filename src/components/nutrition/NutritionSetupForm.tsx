"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { nutritionPlanSchema, type NutritionPlanFormData } from "@/lib/schemas/nutrition.schema";

// ──────────────────────────────────────────────────
// NutritionSetupForm — Formulario de Configuración
// Permite al usuario definir sus calorías y macros
// ──────────────────────────────────────────────────

interface NutritionSetupFormProps {
  onSuccess?: () => void;
}

export function NutritionSetupForm({ onSuccess }: NutritionSetupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NutritionPlanFormData>({
    resolver: zodResolver(nutritionPlanSchema),
    defaultValues: {
      dailyCalories: 2000,
      macros: {
        protein: 150,
        carbs: 200,
        fats: 65,
      },
    },
  });

  const onSubmit = async (data: NutritionPlanFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/nutrition/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al guardar el plan");
      }

      router.refresh();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-white">Configura tu Plan</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Define tus objetivos calóricos y macronutrientes para empezar a trackear.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm font-medium text-red-400 border border-red-500/20">
              {serverError}
            </div>
          )}

          <div>
            <Input
              label="Calorías Diarias (kcal)"
              type="number"
              {...register("dailyCalories", { valueAsNumber: true })}
              error={errors.dailyCalories?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Proteína (g)"
              type="number"
              {...register("macros.protein", { valueAsNumber: true })}
              error={errors.macros?.protein?.message}
            />
            <Input
              label="Carbohidratos (g)"
              type="number"
              {...register("macros.carbs", { valueAsNumber: true })}
              error={errors.macros?.carbs?.message}
            />
            <Input
              label="Grasas (g)"
              type="number"
              {...register("macros.fats", { valueAsNumber: true })}
              error={errors.macros?.fats?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative w-full overflow-hidden rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-black transition-all hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando Plan...
                </>
              ) : (
                "Guardar Plan Nutricional"
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
