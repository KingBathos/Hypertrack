"use client";

import React, { useMemo, useState } from "react";
import type { NutritionPlanPublic, MealLogPublic } from "@/types/nutrition";
import { InfoCircle } from "@/components/ui/icons";
import { NutritionSetupForm } from "@/components/nutrition/NutritionSetupForm";

interface NutritionOverviewProps {
  plan: NutritionPlanPublic | null;
  recentLogs: MealLogPublic[];
}

export function NutritionOverview({ plan, recentLogs }: NutritionOverviewProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);

  // 1. Filtrar los logs para obtener solo los del "día local" del usuario
  const consumed = useMemo(() => {
    const todayLocal = new Date().toLocaleDateString(); // ej. "10/24/2026"
    
    const todaysLogs = recentLogs.filter((log) => {
      const logLocal = new Date(log.date).toLocaleDateString();
      return logLocal === todayLocal;
    });

    return todaysLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.macros.protein,
        carbs: acc.carbs + log.macros.carbs,
        fats: acc.fats + log.macros.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [recentLogs]);

  // Empty State si no hay plan
  if (!plan) {
    if (isSettingUp) {
      return <NutritionSetupForm onSuccess={() => setIsSettingUp(false)} />;
    }

    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 p-8 backdrop-blur-md">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-white/5 p-4 text-cyan-400">
            <InfoCircle className="h-8 w-8" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-white">Sin Plan Nutricional</h2>
          <p className="mb-6 max-w-md text-sm text-zinc-400">
            Para un enfoque estricto en hipertrofia y fitness, cada cuerpo requiere
            metas personalizadas. Configura tus calorías y macronutrientes para empezar
            a trackear tus comidas diarias.
          </p>
          <button
            onClick={() => setIsSettingUp(true)}
            className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-medium text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]"
          >
            Configurar Plan Nutricional
          </button>
        </div>
      </div>
    );
  }

  // Cálculos de progreso
  const calPercent = Math.min((consumed.calories / plan.dailyTargets.calories) * 100, 100);
  const proPercent = Math.min((consumed.protein / plan.dailyTargets.proteinGrams) * 100, 100);
  const carbPercent = Math.min((consumed.carbs / plan.dailyTargets.carbsGrams) * 100, 100);
  const fatPercent = Math.min((consumed.fats / plan.dailyTargets.fatsGrams) * 100, 100);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Resumen Calórico */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <h3 className="mb-1 text-sm font-medium text-zinc-400">Calorías Totales</h3>
        <div className="mb-4 flex items-end gap-2">
          <span className="text-4xl font-black text-white">{consumed.calories}</span>
          <span className="mb-1 text-sm text-zinc-500">/ {plan.dailyTargets.calories} kcal</span>
        </div>
        
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000 ease-out"
            style={{ width: `${calPercent}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-zinc-500">
          {plan.dailyTargets.calories - consumed.calories} kcal restantes
        </p>
      </div>

      {/* Resumen Macros */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/50 p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-500/10 blur-2xl" />
        <h3 className="mb-4 text-sm font-medium text-zinc-400">Macronutrientes</h3>
        <div className="space-y-4">
          {/* Proteína */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-purple-400">Proteína</span>
              <span className="text-zinc-400">{consumed.protein} / {plan.dailyTargets.proteinGrams}g</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-1000 ease-out"
                style={{ width: `${proPercent}%` }}
              />
            </div>
          </div>
          {/* Carbos */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-amber-400">Carbohidratos</span>
              <span className="text-zinc-400">{consumed.carbs} / {plan.dailyTargets.carbsGrams}g</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-out"
                style={{ width: `${carbPercent}%` }}
              />
            </div>
          </div>
          {/* Grasas */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium text-rose-400">Grasas</span>
              <span className="text-zinc-400">{consumed.fats} / {plan.dailyTargets.fatsGrams}g</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-1000 ease-out"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
