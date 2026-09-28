import { z } from "zod";

// ──────────────────────────────────────────────────
// Schemas Zod — Colección `profiles`
// Espeja exactamente el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

export const SEX_OPTIONS = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
  PREFER_NOT_TO_SAY: "PREFER_NOT_TO_SAY",
} as const;

export type Sex = keyof typeof SEX_OPTIONS;

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
  PREFER_NOT_TO_SAY: "Prefiero no decir",
};

export const GOAL_OPTIONS = {
  HYPERTROPHY: "HYPERTROPHY",
  FAT_LOSS: "FAT_LOSS",
  STRENGTH: "STRENGTH",
  ENDURANCE: "ENDURANCE",
  GENERAL_HEALTH: "GENERAL_HEALTH",
  RECOMPOSITION: "RECOMPOSITION",
} as const;

export type PrimaryGoal = keyof typeof GOAL_OPTIONS;

export const GOAL_LABELS: Record<PrimaryGoal, string> = {
  HYPERTROPHY: "Hipertrofia",
  FAT_LOSS: "Pérdida de grasa",
  STRENGTH: "Fuerza",
  ENDURANCE: "Resistencia",
  GENERAL_HEALTH: "Salud general",
  RECOMPOSITION: "Recomposición",
};

export const GOAL_DESCRIPTIONS: Record<PrimaryGoal, string> = {
  HYPERTROPHY: "Maximizar el crecimiento muscular",
  FAT_LOSS: "Reducir grasa manteniendo músculo",
  STRENGTH: "Aumentar fuerza y rendimiento",
  ENDURANCE: "Mejorar capacidad cardiovascular",
  GENERAL_HEALTH: "Mejorar salud y bienestar general",
  RECOMPOSITION: "Ganar músculo y perder grasa simultáneamente",
};

export const GOAL_ICONS: Record<PrimaryGoal, string> = {
  HYPERTROPHY: "💪",
  FAT_LOSS: "🔥",
  STRENGTH: "🏋️",
  ENDURANCE: "🏃",
  GENERAL_HEALTH: "❤️",
  RECOMPOSITION: "⚖️",
};

// ── Nivel de Actividad Física (PAL) ──

export const ACTIVITY_LEVEL_OPTIONS = {
  SEDENTARY: "SEDENTARY",
  LIGHTLY_ACTIVE: "LIGHTLY_ACTIVE",
  MODERATELY_ACTIVE: "MODERATELY_ACTIVE",
  VERY_ACTIVE: "VERY_ACTIVE",
  EXTRA_ACTIVE: "EXTRA_ACTIVE",
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVEL_OPTIONS;

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentario",
  LIGHTLY_ACTIVE: "Ligeramente activo",
  MODERATELY_ACTIVE: "Moderadamente activo",
  VERY_ACTIVE: "Muy activo",
  EXTRA_ACTIVE: "Extremadamente activo",
};

export const ACTIVITY_LEVEL_DESCRIPTIONS: Record<ActivityLevel, string> = {
  SEDENTARY: "Trabajo de escritorio, poco o nada de ejercicio",
  LIGHTLY_ACTIVE: "Ejercicio ligero 1-3 días/semana",
  MODERATELY_ACTIVE: "Ejercicio moderado 3-5 días/semana",
  VERY_ACTIVE: "Ejercicio intenso 6-7 días/semana",
  EXTRA_ACTIVE: "Atleta profesional o trabajo físico muy pesado",
};

/** Multiplicadores Harris-Benedict para TDEE = BMR × factor */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
};

// ── Experiencia de Entrenamiento ──

export const TRAINING_EXPERIENCE_OPTIONS = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;

export type TrainingExperience = keyof typeof TRAINING_EXPERIENCE_OPTIONS;

export const TRAINING_EXPERIENCE_LABELS: Record<TrainingExperience, string> = {
  BEGINNER: "Principiante (< 1 año)",
  INTERMEDIATE: "Intermedio (1-3 años)",
  ADVANCED: "Avanzado (3+ años)",
};

// ── Tipo de Entrenamiento ──

export const TRAINING_TYPE_OPTIONS = {
  BODYBUILDING: "BODYBUILDING",
  POWERLIFTING: "POWERLIFTING",
  CROSSFIT: "CROSSFIT",
  CALISTHENICS: "CALISTHENICS",
  FUNCTIONAL: "FUNCTIONAL",
  MIXED: "MIXED",
} as const;

export type TrainingType = keyof typeof TRAINING_TYPE_OPTIONS;

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  BODYBUILDING: "Bodybuilding",
  POWERLIFTING: "Powerlifting",
  CROSSFIT: "CrossFit",
  CALISTHENICS: "Calistenia",
  FUNCTIONAL: "Funcional",
  MIXED: "Mixto",
};

// ── Nivel de Estrés ──

export const STRESS_LEVEL_OPTIONS = {
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  VERY_HIGH: "VERY_HIGH",
} as const;

export type StressLevel = keyof typeof STRESS_LEVEL_OPTIONS;

export const STRESS_LEVEL_LABELS: Record<StressLevel, string> = {
  LOW: "Bajo",
  MODERATE: "Moderado",
  HIGH: "Alto",
  VERY_HIGH: "Muy alto",
};

// ── Fase de Entrenamiento ──

export const TRAINING_PHASE_OPTIONS = {
  BULK: "BULK",
  CUT: "CUT",
  MAINTENANCE: "MAINTENANCE",
  REVERSE_DIET: "REVERSE_DIET",
} as const;

export type TrainingPhase = keyof typeof TRAINING_PHASE_OPTIONS;

export const TRAINING_PHASE_LABELS: Record<TrainingPhase, string> = {
  BULK: "Volumen (Bulk)",
  CUT: "Definición (Cut)",
  MAINTENANCE: "Mantenimiento",
  REVERSE_DIET: "Dieta Reversa",
};

// ──────────────────────────────────────────────────
// Schemas del Stepper (Onboarding)
// ──────────────────────────────────────────────────

// ── Paso 1: Nombre y apellido ──

export const profileStep1Schema = z.object({
  firstName: z
    .string({ error: "El nombre es obligatorio" })
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres")
    .regex(/^[^0-9@$*]+$/, "No puede contener números ni símbolos especiales")
    .trim(),
  lastName: z
    .string({ error: "El apellido es obligatorio" })
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres")
    .regex(/^[^0-9@$*]+$/, "No puede contener números ni símbolos especiales")
    .trim(),
});

// ── Paso 2: Datos demográficos ──

export const profileStep2Schema = z.object({
  sex: z.enum(
    ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
    { error: "Selecciona una opción" }
  ),
  birthDate: z
    .string({ error: "La fecha de nacimiento es obligatoria" })
    .min(1, "La fecha de nacimiento es obligatoria")
    .refine(
      (val) => !isNaN(new Date(val).getTime()),
      { message: "Fecha inválida" }
    )
    .refine(
      (val) => {
        const date = new Date(val);
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        return age >= 13 && age <= 120;
      },
      { message: "Debes tener al menos 13 años" }
    ),
});

// ── Paso 3: Contacto y medidas ──

export const profileStep3Schema = z.object({
  phone: z
    .string({ error: "El teléfono es obligatorio" })
    .min(1, "El teléfono es obligatorio")
    // Formato internacional E.164
    .regex(/^\+[1-9]\d{6,14}$/, "Formato internacional requerido (ej: +123456789)"),
  heightCm: z
    .number({ error: "La altura es obligatoria" })
    .int("Debe ser un número entero")
    .min(50, "Mínimo 50 cm")
    .max(300, "Máximo 300 cm"),
  weightKg: z
    .number({ error: "El peso es obligatorio" })
    .min(20, "Mínimo 20 kg")
    .max(500, "Máximo 500 kg"),
});

// ── Paso 4: Objetivo y sistema de medición ──

export const profileStep4Schema = z.object({
  primaryGoal: z.enum(
    ["HYPERTROPHY", "FAT_LOSS", "STRENGTH", "ENDURANCE", "GENERAL_HEALTH", "RECOMPOSITION"],
    { error: "Selecciona tu objetivo principal" }
  ),
  measurementSystem: z.enum(
    ["METRIC", "IMPERIAL"],
    { error: "Selecciona el sistema de medición" }
  ),
});

// ── Paso 5: Estilo de vida y contexto deportivo ──

export const profileStep5Schema = z.object({
  activityLevel: z.enum(
    ["SEDENTARY", "LIGHTLY_ACTIVE", "MODERATELY_ACTIVE", "VERY_ACTIVE", "EXTRA_ACTIVE"],
    { error: "Selecciona tu nivel de actividad" }
  ),
  trainingExperience: z.enum(
    ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
    { error: "Selecciona tu experiencia" }
  ),
  trainingFrequencyDays: z
    .number({ error: "Indica cuántos días entrenas" })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 día")
    .max(7, "Máximo 7 días"),
  sleepHoursAvg: z
    .number({ error: "Indica tus horas de sueño" })
    .min(3, "Mínimo 3 horas")
    .max(14, "Máximo 14 horas"),
});

// ── Schema completo fusionado ──

export const profileFormSchema = profileStep1Schema
  .merge(profileStep2Schema)
  .merge(profileStep3Schema)
  .merge(profileStep4Schema)
  .merge(profileStep5Schema);

export type ProfileFormData = z.infer<typeof profileFormSchema>;

/**
 * Schema para el endpoint API (añade userId = publicId del usuario).
 */
export const profileApiSchema = profileFormSchema.extend({
  userId: z.string().min(1, "userId es obligatorio"),
});

export type ProfileApiInput = z.infer<typeof profileApiSchema>;

/**
 * Schemas indexados por paso para validación progresiva en el stepper.
 */
export const STEP_SCHEMAS = [
  profileStep1Schema,
  profileStep2Schema,
  profileStep3Schema,
  profileStep4Schema,
  profileStep5Schema,
] as const;

// ── Biometría (Mediciones Corporales con Circunferencias) ──

export const biometricsSchema = z.object({
  weight: z
    .number({ error: "El peso es obligatorio" })
    .min(20, "Mínimo 20 kg")
    .max(500, "Máximo 500 kg"),
  bodyFatPercentage: z
    .number()
    .min(1, "Mínimo 1%")
    .max(60, "Máximo 60%")
    .optional()
    .or(z.nan().transform(() => undefined)),
  // Circunferencias corporales (todas opcionales, en cm)
  waistCm: z.number().min(30, "Mínimo 30 cm").max(200, "Máximo 200 cm").optional()
    .or(z.nan().transform(() => undefined)),
  hipCm: z.number().min(30, "Mínimo 30 cm").max(200, "Máximo 200 cm").optional()
    .or(z.nan().transform(() => undefined)),
  chestCm: z.number().min(40, "Mínimo 40 cm").max(200, "Máximo 200 cm").optional()
    .or(z.nan().transform(() => undefined)),
  armCm: z.number().min(15, "Mínimo 15 cm").max(70, "Máximo 70 cm").optional()
    .or(z.nan().transform(() => undefined)),
  thighCm: z.number().min(20, "Mínimo 20 cm").max(100, "Máximo 100 cm").optional()
    .or(z.nan().transform(() => undefined)),
  calfCm: z.number().min(15, "Mínimo 15 cm").max(70, "Máximo 70 cm").optional()
    .or(z.nan().transform(() => undefined)),
});

export type BiometricsFormData = z.infer<typeof biometricsSchema>;
