import type { ObjectId } from "mongodb";

// ──────────────────────────────────────────────────
// Tipos de dominio — Colección `workout_sessions`
// Alineado con la agregación existente en dashboard_cache
// y la estructura de exercise_library
// ──────────────────────────────────────────────────

export type WorkoutType = "FREE" | "PROGRAM";
export type WeightUnit = "KG" | "LBS";

/**
 * Serie individual dentro de un ejercicio.
 */
export interface WorkoutSet {
  setNumber: number;    // bsonType: int, minimum: 1
  reps: number;         // bsonType: int, minimum: 1
  weight: number;       // bsonType: double, minimum: 0
  unit: WeightUnit;
  targetRestSeconds?: number; // De la plantilla
  actualRestSeconds?: number; // Tiempo de descanso real cronometrado
  rpe?: number;         // bsonType: double, 1-10 (Rate of Perceived Exertion)
  isWarmup?: boolean;
  isDropSet?: boolean;
  isFailure?: boolean;
}

/**
 * Ejercicio dentro de una sesión.
 * `exerciseId` es opcional — en entrenamiento libre puede no existir.
 */
export interface WorkoutExercise {
  exerciseId?: string;   // publicId de exercise_library (exe_ULID) — opcional
  exerciseName: string;  // Nombre legible (ej: "Press Banca Plano con Barra")
  sets: WorkoutSet[];
}

/**
 * Documento completo en MongoDB. NUNCA se expone directamente al cliente.
 */
export interface WorkoutSessionDocument {
  _id: ObjectId;
  publicId: string;       // "^wks_[0-9A-HJKMNP-TV-Z]{26}$"
  clientId: ObjectId;     // Referencia a users._id (ObjectId)

  type: WorkoutType;
  name: string;           // Nombre de la sesión (ej: "Push Day", "Entrenamiento Libre")
  notes?: string;         // Notas opcionales, maxLength: 1000

  exercises: WorkoutExercise[];

  startedAt: Date;
  finishedAt: Date;
  durationMinutes: number; // bsonType: int — calculado server-side

  metadata: {
    schemaVersion: number; // bsonType: int, minimum: 1
    source: "web" | "mobile" | "api";
  };

  audit: {
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Respuesta pública del POST (sin ObjectIds).
 */
export interface WorkoutSessionResponse {
  success: true;
  data: {
    publicId: string;
    name: string;
    exerciseCount: number;
    totalSets: number;
    totalVolume: number;     // Σ(weight × reps) en la unidad dominante
    durationMinutes: number;
  };
}

/**
 * Documento en MongoDB para la asignación de un programa de entrenamiento.
 */
export interface ProgramAssignmentDocument {
  _id?: ObjectId;
  publicId: string;
  clientId: ObjectId;
  coachId: ObjectId | null;
  programVersionId: ObjectId;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate: Date;
  endDate?: Date | null;
  audit: {
    createdAt: Date;
    createdBy: ObjectId;
    updatedAt: Date;
  };
}

/**
 * Plantilla de entrenamiento creada por el usuario (Modo Atleta Libre).
 */
export interface WorkoutTemplateExercise {
  exerciseId: string;    // reference to exercise_library publicId
  exerciseName: string;
  targetSets: number;
  targetReps: string | number; 
  targetRpe?: number;
  targetRestSeconds?: number;
}

export interface WorkoutTemplateDocument {
  _id?: ObjectId;
  publicId: string;       // "^tpl_[0-9A-HJKMNP-TV-Z]{26}$"
  clientId: ObjectId;
  name: string;
  notes?: string;
  exercises: WorkoutTemplateExercise[];
  audit: {
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Materialized View para Récords Personales (PRs).
 */
export interface PersonalRecordDocument {
  _id?: ObjectId;
  clientId: ObjectId;
  exerciseId: string; 
  exerciseName: string;
  maxWeight: number;      // Peso máximo levantado
  maxWeightReps: number;  // Repeticiones logradas con ese peso
  maxWeightUnit: WeightUnit;
  estimated1RM: number;   // Calculado: weight * (1 + reps/30)
  dateAchieved: Date;
  workoutSessionId: ObjectId;
  audit: {
    createdAt: Date;
    updatedAt: Date;
  };
}

