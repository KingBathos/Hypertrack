/**
 * src/lib/domain/biomechanics.ts
 *
 * Módulo de dominio puro (SOLID - SRP) para cálculos de biomecánica,
 * sobrecarga progresiva y estimación de repetición máxima (1RM).
 */

export interface SetRecord {
  reps: number;
  weight: number;
  rpe?: number;
}

/**
 * Fórmula de Epley para estimar 1RM (Una Repetición Máxima).
 * 1RM = Peso * (1 + Reps / 30)
 * Si las repeticiones son 1, el 1RM es exactamente el peso levantado.
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  const estimated = weightKg * (1 + reps / 30);
  return Math.round(estimated * 10) / 10;
}

/**
 * Calcula el volumen total de carga (Volume Load) acumulado en una sesión o ejercicio.
 * Volumen = Suma de (Peso × Repeticiones) por cada set.
 */
export function calculateVolumeLoad(sets: SetRecord[]): number {
  if (!sets || sets.length === 0) return 0;
  return sets.reduce((accum, s) => {
    const validWeight = Math.max(0, Number(s.weight) || 0);
    const validReps = Math.max(0, Number(s.reps) || 0);
    return accum + validWeight * validReps;
  }, 0);
}

/**
 * Calcula el esfuerzo percibido (RPE / RIR - Reps in Reserve) y sugiere progresión.
 * Si RPE <= 7 (RIR >= 3): Sugerir aumento de carga (+2.5% a +5%).
 * Si RPE == 8 o 9: Zona óptima de hipertrofia/fuerza.
 * Si RPE >= 10: Fatiga máxima o fallo técnico.
 */
export function evaluateRPETarget(rpe: number): {
  zone: "SUBMAXIMAL" | "OPTIMAL" | "FAILURE";
  recommendation: string;
} {
  if (rpe < 7.5) {
    return {
      zone: "SUBMAXIMAL",
      recommendation: "Esfuerzo bajo (RIR >= 3). Considera incrementar la carga de 2.5 kg a 5 kg en la próxima sesión.",
    };
  }
  if (rpe <= 9) {
    return {
      zone: "OPTIMAL",
      recommendation: "Estímulo óptimo de hipertrofia (RIR 1-2). Mantén la carga y busca progresión de repeticiones.",
    };
  }
  return {
    zone: "FAILURE",
    recommendation: "Fallo concéntrico o técnico (RIR 0). Precaución con la acumulación de fatiga en articulaciones.",
  };
}
