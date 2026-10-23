/**
 * src/lib/domain/metabolic.ts
 *
 * Módulo de dominio puro (SOLID - SRP) para cálculos metabólicos y nutricionales.
 * No depende de bases de datos ni de frameworks. 100% testeable.
 */

export type BiologicalSex = "MALE" | "FEMALE";

export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHTLY_ACTIVE"
  | "MODERATELY_ACTIVE"
  | "VERY_ACTIVE"
  | "EXTRA_ACTIVE";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
};

export interface MetabolicInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: BiologicalSex;
}

/**
 * Calcula la Tasa Metabólica Basal (BMR) usando la ecuación clínica de Mifflin-St Jeor.
 * Hombres: 10 * peso(kg) + 6.25 * altura(cm) - 5 * edad + 5
 * Mujeres: 10 * peso(kg) + 6.25 * altura(cm) - 5 * edad - 161
 */
export function calculateBMR(input: MetabolicInput): number {
  const { weightKg, heightCm, ageYears, sex } = input;
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new Error("El peso, la altura y la edad deben ser valores positivos mayores a cero.");
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === "MALE" ? base + 5 : base - 161;
  return Math.round(bmr * 10) / 10;
}

/**
 * Calcula el Gasto Energético Diario Total (TDEE real).
 * TDEE = BMR × Factor de Actividad Física
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel | string = "MODERATELY_ACTIVE"): number {
  if (bmr <= 0) throw new Error("El BMR debe ser un valor positivo.");
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel as ActivityLevel] || 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Distribución estándar de macronutrientes según objetivo metabólico:
 * - FAT_LOSS: Déficit calórico (-20%), 2.2g/kg de proteína aprox, grasas moderadas (25%).
 * - HYPERTROPHY: Superávit calórico (+10%), 2.0g/kg de proteína aprox, carbohidratos elevados.
 * - MAINTENANCE: Calorías de mantenimiento, balance equilibrado.
 */
export function calculateMacroTargets(
  tdee: number,
  weightKg: number,
  goal: "FAT_LOSS" | "MAINTENANCE" | "HYPERTROPHY" = "MAINTENANCE"
) {
  let targetCalories = tdee;
  if (goal === "FAT_LOSS") targetCalories = Math.round(tdee * 0.80);
  if (goal === "HYPERTROPHY") targetCalories = Math.round(tdee * 1.10);

  // Proteína: 2.0 g/kg (4 kcal/g)
  const proteinGrams = Math.round(weightKg * 2.0);
  const proteinCalories = proteinGrams * 4;

  // Grasas: 25% de las calorías totales (9 kcal/g)
  const fatCalories = Math.round(targetCalories * 0.25);
  const fatGrams = Math.round(fatCalories / 9);

  // Carbohidratos: El remanente calórico (4 kcal/g)
  const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const carbGrams = Math.round(remainingCalories / 4);

  return {
    targetCalories,
    proteinGrams,
    carbGrams,
    fatGrams,
  };
}
