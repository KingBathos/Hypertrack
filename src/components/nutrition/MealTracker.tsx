"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { mealLogSchema, type MealLogFormData, mealTypes } from "@/lib/schemas/nutrition.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "@/components/ui/icons";

export function MealTracker() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MealLogFormData>({
    resolver: zodResolver(mealLogSchema),
    defaultValues: {
      mealType: "Almuerzo",
      foodName: "",
      calories: 0,
      macros: { protein: 0, carbs: 0, fats: 0 },
    },
  });

  // Watch values para mostrar resumen en tiempo real
  const currentCalories = useWatch({ control, name: "calories" }) || 0;
  const currentProtein = useWatch({ control, name: "macros.protein" }) || 0;
  const currentCarbs = useWatch({ control, name: "macros.carbs" }) || 0;
  const currentFats = useWatch({ control, name: "macros.fats" }) || 0;

  const onSubmit = async (data: MealLogFormData) => {
    setServerError(null);
    setIsSuccess(false);

    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar la comida");
      }

      setIsSuccess(true);
      reset({
        mealType: data.mealType, // Mantener el tipo por si registra varios
        foodName: "",
        calories: 0,
        macros: { protein: 0, carbs: 0, fats: 0 },
      });
      router.refresh(); // Recargar los Server Components para actualizar barras
      
      // Limpiar el mensaje de éxito después de 3s
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 p-6 backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />
      
      <div className="relative z-10 flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Registrar Comida</h3>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-zinc-400">Total: <span className="text-white">{currentCalories} kcal</span></span>
          <span className="text-purple-400">P: {currentProtein}g</span>
          <span className="text-amber-400">C: {currentCarbs}g</span>
          <span className="text-rose-400">G: {currentFats}g</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Nombre y Tipo */}
          <div className="space-y-4">
            <Input
              label="Alimento / Comida"
              {...register("foodName")}
              placeholder="Ej. Pechuga de pollo con arroz"
              error={errors.foodName?.message}
            />

            <div className="group relative flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-400 transition-colors group-focus-within:text-cyan-400">
                Momento del Día
              </label>
              <select
                {...register("mealType")}
                className="w-full rounded-xl border border-zinc-700/50 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 outline-none transition-all duration-200 hover:border-zinc-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-zinc-900/80"
              >
                {mealTypes.map((type) => (
                  <option key={type} value={type} className="bg-zinc-900">
                    {type}
                  </option>
                ))}
              </select>
              {errors.mealType && (
                <p className="text-xs text-red-400">{errors.mealType.message}</p>
              )}
            </div>
            
            <Input
              label="Calorías (kcal)"
              type="number"
              {...register("calories", { valueAsNumber: true })}
              error={errors.calories?.message}
            />
          </div>

          {/* Macros */}
          <div className="rounded-xl border border-white/5 bg-white/2 p-4">
            <h4 className="mb-4 text-xs font-medium text-zinc-500">MACRONUTRIENTES (g)</h4>
            <div className="space-y-4">
              <Input
                label="Proteína"
                type="number"
                {...register("macros.protein", { valueAsNumber: true })}
                error={errors.macros?.protein?.message}
              />
              
              <Input
                label="Carbohidratos"
                type="number"
                {...register("macros.carbs", { valueAsNumber: true })}
                error={errors.macros?.carbs?.message}
              />

              <Input
                label="Grasas"
                type="number"
                {...register("macros.fats", { valueAsNumber: true })}
                error={errors.macros?.fats?.message}
              />
            </div>
          </div>
        </div>

        {/* Mensajes de Error y Éxito */}
        {serverError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <p>Comida registrada correctamente.</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-cyan-500 text-black hover:bg-cyan-400"
        >
          {isSubmitting ? "Registrando..." : "Guardar Comida"}
        </Button>
      </form>
    </div>
  );
}
