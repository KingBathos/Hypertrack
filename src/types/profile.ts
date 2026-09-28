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
  };

  goals: {
    primaryGoal: PrimaryGoal;
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
  physical: { heightCm: number; weightKg: number };
  goals: { primaryGoal: PrimaryGoal };
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
 */
export interface BodyMeasurementDocument {
  _id?: ObjectId;
  publicId: string;
  userId: ObjectId;
  weight: number; // en KG o LBS según preferencia
  bodyFatPercentage?: number;
  date: Date;
  audit: {
    createdAt: Date;
  };
}
