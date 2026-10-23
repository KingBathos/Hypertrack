/**
 * src/lib/domain/trainingLoad.ts
 *
 * Módulo de dominio puro (SOLID - SRP) para calcular la carga de entrenamiento
 * de un atleta y generar recomendaciones metabólicas adaptativas para el nutricionista.
 */

export type TrainingIntensityLevel = "HEAVY" | "MODERATE" | "LIGHT";

export interface SessionData {
  startedAt?: Date | string;
  durationMinutes?: number;
  exercises?: Array<{
    sets?: Array<{
      weight?: number;
      reps?: number;
      rpe?: number;
      unit?: string;
      isWarmup?: boolean;
    }>;
  }>;
}

export interface TrainingLoadAnalysis {
  intensityLevel: TrainingIntensityLevel;
  intensityLabel: string;
  intensityColor: string;
  intensityBg: string;
  intensityBorder: string;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  weeklyVolumeKg: number;
  avgSessionVolumeKg: number;
  avgRpe: number;
  avgDurationMinutes: number;
  nutritionalPrescription: {
    carbStrategy: string;
    proteinStrategy: string;
    hydrationStrategy: string;
    summary: string;
    suggestedCarbsPerKg: number;
    suggestedProteinPerKg: number;
    suggestedFatPercent: number;
  };
}

/**
 * Analiza las sesiones recientes de entrenamiento y determina si la carga es
 * FUERTE (Heavy), MODERADA (Moderate) o SUAVE (Light), formulando la recomendación nutricional.
 */
export function analyzeTrainingLoad(
  sessions: SessionData[],
  athleteWeightKg: number = 75
): TrainingLoadAnalysis {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let volume7d = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  let durationSum = 0;
  let durationCount = 0;
  let count7d = 0;
  const count30d = sessions.length;

  for (const session of sessions) {
    const sessionDate = session.startedAt ? new Date(session.startedAt) : null;
    const isLast7d = sessionDate && sessionDate >= sevenDaysAgo;

    let sessionVolume = 0;

    if (session.exercises && Array.isArray(session.exercises)) {
      for (const ex of session.exercises) {
        if (ex.sets && Array.isArray(ex.sets)) {
          for (const set of ex.sets) {
            if (set.isWarmup) continue;
            const w = Number(set.weight) || 0;
            const r = Number(set.reps) || 0;
            const weightKg = (set.unit || "").toUpperCase() === "LBS" ? w * 0.453592 : w;
            sessionVolume += weightKg * r;

            if (set.rpe && Number(set.rpe) > 0) {
              rpeSum += Number(set.rpe);
              rpeCount++;
            }
          }
        }
      }
    }

    if (session.durationMinutes && session.durationMinutes > 0) {
      durationSum += session.durationMinutes;
      durationCount++;
    }

    if (isLast7d) {
      count7d++;
      volume7d += sessionVolume;
    }
  }

  const avgRpe = rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : 7.0;
  const avgDurationMinutes = durationCount > 0 ? Math.round(durationSum / durationCount) : 45;
  const avgSessionVolumeKg = count7d > 0 ? Math.round(volume7d / count7d) : 0;

  // Clasificación de la intensidad
  // FUERTE: >= 4 sesiones/sem O volumen semanal > 12,000 kg O RPE >= 8.2
  // MODERADA: 3-4 sesiones/sem O volumen semanal entre 5,000 y 12,000 kg O RPE 7-8.1
  // SUAVE: <= 2 sesiones/sem O volumen semanal < 5,000 kg
  let intensityLevel: TrainingIntensityLevel = "MODERATE";

  if (count7d >= 4 || volume7d >= 14000 || (count7d >= 3 && avgRpe >= 8.5)) {
    intensityLevel = "HEAVY";
  } else if (count7d <= 2 && volume7d < 6000 && avgRpe < 7.5) {
    intensityLevel = "LIGHT";
  } else {
    intensityLevel = "MODERATE";
  }

  // Recomendaciones según la carga
  if (intensityLevel === "HEAVY") {
    return {
      intensityLevel,
      intensityLabel: "ENTRENAMIENTO FUERTE (ALTA CARGA)",
      intensityColor: "text-red-500",
      intensityBg: "bg-red-950/40",
      intensityBorder: "border-red-600",
      sessionsLast7Days: count7d,
      sessionsLast30Days: count30d,
      weeklyVolumeKg: Math.round(volume7d),
      avgSessionVolumeKg,
      avgRpe,
      avgDurationMinutes,
      nutritionalPrescription: {
        carbStrategy: `ALTA DEMANDA (${(athleteWeightKg * 4.5).toFixed(0)} - ${(athleteWeightKg * 5.5).toFixed(0)}g/día // ~4.5-5.5 g/kg). Glucógeno muscular altamente comprometido. Concentrar ingesta 1-2h antes y post-entreno.`,
        proteinStrategy: `ELEVADA (${(athleteWeightKg * 2.0).toFixed(0)} - ${(athleteWeightKg * 2.2).toFixed(0)}g/día // ~2.0-2.2 g/kg). Fundamental para frenar el daño miofibrilar e inducir síntesis proteica máxima.`,
        hydrationStrategy: "3.5L a 4.0L de agua diaria + reposición de electrolitos (sodio/potasio intra-entreno).",
        summary: "El atleta entrena con alta frecuencia e intensidad. Requiere un aporte calórico robusto (+250 a +400 kcal peri-entreno) para prevenir el sobreentrenamiento y optimizar la recuperación del SNC y muscular.",
        suggestedCarbsPerKg: 4.8,
        suggestedProteinPerKg: 2.1,
        suggestedFatPercent: 25,
      },
    };
  }

  if (intensityLevel === "LIGHT") {
    return {
      intensityLevel,
      intensityLabel: "ENTRENAMIENTO SUAVE / DESCARGA",
      intensityColor: "text-emerald-400",
      intensityBg: "bg-emerald-950/40",
      intensityBorder: "border-emerald-600",
      sessionsLast7Days: count7d,
      sessionsLast30Days: count30d,
      weeklyVolumeKg: Math.round(volume7d),
      avgSessionVolumeKg,
      avgRpe,
      avgDurationMinutes,
      nutritionalPrescription: {
        carbStrategy: `MODERADA-BAJA (${(athleteWeightKg * 2.5).toFixed(0)} - ${(athleteWeightKg * 3.2).toFixed(0)}g/día // ~2.5-3.2 g/kg). Gasto glucogénico reducido. Mantener carbohidratos controlados para evitar lipogénesis innecesaria.`,
        proteinStrategy: `MANTENIMIENTO (${(athleteWeightKg * 1.6).toFixed(0)} - ${(athleteWeightKg * 1.8).toFixed(0)}g/día // ~1.6-1.8 g/kg). Suficiente para sostener la masa magra actual.`,
        hydrationStrategy: "2.5L a 3.0L de agua diaria.",
        summary: "Carga de entrenamiento baja o fase de descarga pasiva. Ideal para consolidar déficit calórico si el objetivo es pérdida de grasa, o recortar calorías superfluas.",
        suggestedCarbsPerKg: 2.8,
        suggestedProteinPerKg: 1.7,
        suggestedFatPercent: 28,
      },
    };
  }

  // MODERATE
  return {
    intensityLevel,
    intensityLabel: "ENTRENAMIENTO MODERADO (ESTÁNDAR)",
    intensityColor: "text-amber-400",
    intensityBg: "bg-amber-950/40",
    intensityBorder: "border-amber-600",
    sessionsLast7Days: count7d,
    sessionsLast30Days: count30d,
    weeklyVolumeKg: Math.round(volume7d),
    avgSessionVolumeKg,
    avgRpe,
    avgDurationMinutes,
    nutritionalPrescription: {
      carbStrategy: `EQUILIBRADA (${(athleteWeightKg * 3.5).toFixed(0)} - ${(athleteWeightKg * 4.2).toFixed(0)}g/día // ~3.5-4.2 g/kg). Balance óptimo para sesiones estándar de 45-60 min.`,
      proteinStrategy: `ÓPTIMA (${(athleteWeightKg * 1.8).toFixed(0)} - ${(athleteWeightKg * 2.0).toFixed(0)}g/día // ~1.8-2.0 g/kg). Asegura reparación y balance nitrogenado positivo.`,
      hydrationStrategy: "3.0L a 3.5L de agua al día.",
      summary: "Estímulo equilibrado de progresión muscular. Mantener calorías en mantenimiento o ligero superávit/déficit según el objetivo primario del perfil.",
      suggestedCarbsPerKg: 3.8,
      suggestedProteinPerKg: 1.9,
      suggestedFatPercent: 25,
    },
  };
}
