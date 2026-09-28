import { z } from "zod";

// ──────────────────────────────────────────────────
// Schemas Zod — Colección `workout_sessions`
// Espeja la estructura de WorkoutSessionDocument
// ──────────────────────────────────────────────────

/**
 * Schema de un set individual.
 */
export const workoutSetSchema = z.object({
  setNumber: z
    .number({ error: "Número de serie requerido" })
    .int("Debe ser entero")
    .min(1, "Mínimo 1"),
  reps: z
    .number({ error: "Repeticiones requeridas" })
    .int("Debe ser entero")
    .min(1, "Mínimo 1 repetición")
    .max(999, "Máximo 999 repeticiones"),
  weight: z
    .number({ error: "Peso requerido" })
    .min(0, "El peso no puede ser negativo")
    .max(9999, "Máximo 9999"),
  unit: z.enum(["KG", "LBS"], { error: "Unidad inválida" }),
  restSeconds: z
    .number()
    .int()
    .min(0)
    .optional(),
  rpe: z
    .number()
    .min(1, "RPE mínimo 1")
    .max(10, "RPE máximo 10")
    .optional(),
  isPR: z.boolean().optional(),
});

export type WorkoutSetInput = z.infer<typeof workoutSetSchema>;

/**
 * Schema de un ejercicio con sus sets.
 */
export const workoutExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z
    .string({ error: "Nombre del ejercicio requerido" })
    .min(1, "El nombre es obligatorio")
    .max(120, "Máximo 120 caracteres")
    .trim(),
  sets: z
    .array(workoutSetSchema)
    .min(1, "Mínimo 1 serie por ejercicio"),
});

export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;

/**
 * Schema para el endpoint POST /api/workouts/session.
 */
export const workoutSessionApiSchema = z.object({
  userId: z
    .string({ error: "userId es obligatorio" })
    .min(1, "userId (publicId) es obligatorio"),
  programId: z.string({ error: "El ID del programa es obligatorio" }).min(1, "programId no puede estar vacío"),
  type: z.enum(["FREE", "PROGRAM"], { error: "Tipo de entrenamiento inválido" }),
  name: z
    .string({ error: "Nombre de la sesión requerido" })
    .min(1, "El nombre es obligatorio")
    .max(200, "Máximo 200 caracteres")
    .trim(),
  exercises: z
    .array(workoutExerciseSchema)
    .min(1, "Agrega al menos 1 ejercicio"),
  notes: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional(),
  startedAt: z
    .string({ error: "Hora de inicio requerida" })
    .min(1, "startedAt es obligatorio")
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Fecha de inicio inválida",
    }),
  finishedAt: z
    .string({ error: "Hora de fin requerida" })
    .min(1, "finishedAt es obligatorio")
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Fecha de fin inválida",
    }),
});

export type WorkoutSessionApiInput = z.infer<typeof workoutSessionApiSchema>;
