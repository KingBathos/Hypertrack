import type { ObjectId } from "mongodb";

// ──────────────────────────────────────────────────
// Tipos de dominio — Colección `profiles`
// Alineado exactamente con el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

export type Sex = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type PrimaryGoal =
  | "HYPERTROPHY"
  | "FAT_LOSS"
  | "STRENGTH"
  | "ENDURANCE"
  | "GENERAL_HEALTH"
  | "RECOMPOSITION";

export type MeasurementSystem = "METRIC" | "IMPERIAL";

export type InjurySeverity = "MILD" | "MODERATE" | "SEVERE";

export type ActivityLevel = "SEDENTARY" | "LIGHTLY_ACTIVE" | "MODERATELY_ACTIVE" | "VERY_ACTIVE" | "EXTRA_ACTIVE";

export type TrainingExperience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type TrainingType = "BODYBUILDING" | "POWERLIFTING" | "CROSSFIT" | "CALISTHENICS" | "FUNCTIONAL" | "MIXED";

export type StressLevel = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";

export type TrainingPhase = "BULK" | "CUT" | "MAINTENANCE" | "REVERSE_DIET";

/**
 * Documento completo en MongoDB. NUNCA se expone directamente al cliente.
 */
export interface ProfileDocument {
  _id: ObjectId;
  userId: ObjectId; // Referencia a users._id (ObjectId, NO publicId)
  publicId: string; // "^prf_[0-9A-HJKMNP-TV-Z]{26}$"

  identity: {
    firstName: string; // 2-80 chars, sin dígitos ni @$*
    lastName: string;  // 2-80 chars, sin dígitos ni @$*
    displayName: string; // 2-120 chars, auto: firstName + " " + lastName
  };

  contact: {
    phone: string;   // E.164 Perú: "^\+51\d{9}$"
    country: string; // ISO 2-letter: "^[A-Z]{2}$" (ej: "PE")
  };

  demographics: {
    birthDate: Date;
    sex: Sex;
  };

  physical: {
    heightCm: number; // bsonType: int, minimum: 50, maximum: 300
    weightKg: number; // bsonType: double, minimum: 20, maximum: 500
    bodyFatPercentage?: number; // porcentaje de grasa corporal
  };

  goals: {
    primaryGoal: PrimaryGoal;
    goalWeightKg?: number; // peso objetivo
    goalBodyFatPercentage?: number; // % grasa objetivo
    trainingPhase?: TrainingPhase; // fase actual: bulk, cut, mantenimiento
  };

  lifestyle: {
    activityLevel: ActivityLevel; // Factor de actividad para TDEE
    trainingExperience: TrainingExperience;
    trainingFrequencyDays: number; // 1-7 días/semana
    trainingType?: TrainingType;
    sleepHoursAvg: number; // horas de sueño promedio
    stressLevel?: StressLevel;
    occupation?: string; // tipo de trabajo
    hydrationLitersAvg?: number; // litros de agua diarios
  };

  preferences: {
    measurementSystem: MeasurementSystem;
  };

  medical: {
    injuries: Array<{
      bodyPart: string;
      severity: InjurySeverity;
      notes: string; // maxLength: 500
    }>;
    allergies: string[];
    conditions?: string[]; // condiciones médicas (diabetes, tiroides, etc.)
    medications?: string[]; // medicamentos actuales
    supplements?: string[]; // creatina, whey, etc.
  };

  metadata: {
    schemaVersion: number; // bsonType: int, minimum: 1
  };

  audit: {
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Respuesta pública del perfil (serializada, sin ObjectIds).
 */
export interface ProfilePublic {
  publicId: string;
  userId: string; // publicId del usuario (usr_ULID)
  identity: { firstName: string; lastName: string; displayName: string };
  contact: { phone: string; country: string };
  demographics: { birthDate: string; sex: Sex };
  physical: { heightCm: number; weightKg: number; bodyFatPercentage?: number };
  goals: { primaryGoal: PrimaryGoal; goalWeightKg?: number; trainingPhase?: TrainingPhase };
  lifestyle: {
    activityLevel: ActivityLevel;
    trainingExperience: TrainingExperience;
    trainingFrequencyDays: number;
    sleepHoursAvg: number;
  };
  preferences: { measurementSystem: MeasurementSystem };
  audit: { createdAt: string; updatedAt: string };
}

/**
 * Respuesta del endpoint de creación de perfil.
 */
export interface ProfileResponse {
  success: true;
  data: {
    publicId: string;
    userId: string;
    displayName: string;
  };
}

/**
 * Documento completo en MongoDB para las mediciones físicas.
 * Incluye circunferencias corporales para tracking de recomposición.
 */
export interface BodyMeasurementDocument {
  _id?: ObjectId;
  publicId: string;
  userId: ObjectId;
  weight: number; // en KG o LBS según preferencia
  bodyFatPercentage?: number;
  // Circunferencias corporales (cm)
  circumferences?: {
    waistCm?: number;    // cintura
    hipCm?: number;      // cadera
    chestCm?: number;    // pecho
    armCm?: number;      // brazo (bíceps)
    thighCm?: number;    // muslo
    calfCm?: number;     // pantorrilla
  };
  // Ratio cintura/cadera calculado automáticamente
  waistToHipRatio?: number;
  date: Date;
  audit: {
    createdAt: Date;
  };
}
