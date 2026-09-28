import { z } from "zod";

// ──────────────────────────────────────────────────
// Schemas de Nutrición (Validación y Formularios)
// ──────────────────────────────────────────────────

// Enums permitidos para las comidas
export const mealTypes = ["Desayuno", "Almuerzo", "Cena", "Snack"] as const;

// Schema base para macros
export const macrosSchema = z.object({
  protein: z.number().min(0, "La proteína no puede ser negativa"),
  carbs: z.number().min(0, "Los carbohidratos no pueden ser negativos"),
  fats: z.number().min(0, "Las grasas no pueden ser negativas"),
});

// Schema para registrar una comida (Frontend -> Backend)
export const mealLogSchema = z.object({
  mealType: z.enum(mealTypes, { error: "Tipo de comida inválido" }),
  foodName: z
    .string()
    .min(2, "El nombre del alimento debe tener al menos 2 caracteres")
    .max(100, "El nombre del alimento no puede exceder 100 caracteres"),
  calories: z
    .number()
    .positive("Las calorías deben ser mayores a 0")
    .max(5000, "Valor de calorías poco realista"),
  macros: macrosSchema,
});

export type MealLogFormData = z.infer<typeof mealLogSchema>;

// Schema para crear/actualizar un plan nutricional
export const nutritionPlanSchema = z.object({
  dailyCalories: z
    .number()
    .min(1000, "El mínimo recomendado son 1000 calorías")
    .max(10000, "Valor calórico no permitido"),
  macros: macrosSchema,
});

export type NutritionPlanFormData = z.infer<typeof nutritionPlanSchema>;
