import { z } from "zod";
import { workoutExerciseSchema } from "./workout.schema";

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const ROUTINE_STATUS = ["ACTIVE", "INACTIVE", "ARCHIVED", "COMPLETED"] as const;

/**
 * Schema para la Plantilla de Rutina (Program/Routine)
 */
export const workoutProgramSchema = z.object({
  name: z
    .string({ error: "El nombre es obligatorio" })
    .min(1, "Nombre requerido")
    .max(100, "Máximo 100 caracteres"),
  authorId: z.string().min(1, "El autor es obligatorio"),
  clientId: z.string().min(1, "El cliente es obligatorio"),
  status: z.enum(ROUTINE_STATUS).default("ACTIVE"),
  assignedDays: z.array(z.enum(DAYS_OF_WEEK)).default([]),
  exercises: z.array(workoutExerciseSchema).min(1, "Debe tener al menos un ejercicio"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type WorkoutProgram = z.infer<typeof workoutProgramSchema>;
