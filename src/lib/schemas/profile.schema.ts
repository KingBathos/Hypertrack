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

// ── Schema completo fusionado ──

export const profileFormSchema = profileStep1Schema
  .merge(profileStep2Schema)
  .merge(profileStep3Schema)
  .merge(profileStep4Schema);

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
] as const;

// ── Biometría (Mediciones Corporales) ──

export const biometricsSchema = z.object({
  weight: z
    .number({ error: "El peso es obligatorio" })
    .min(20, "Mínimo 20 kg")
    .max(500, "Máximo 500 kg"),
  bodyFatPercentage: z
    .number()
    .min(1, "Mínimo 1%")
    .max(100, "Máximo 100%")
    .optional()
    .or(z.nan().transform(() => undefined)),
});

export type BiometricsFormData = z.infer<typeof biometricsSchema>;
