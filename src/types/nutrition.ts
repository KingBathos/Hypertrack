import type { ObjectId } from "mongodb";

// ──────────────────────────────────────────────────
// Tipos de dominio — Colección `nutrition_plans` y `meal_logs`
// ──────────────────────────────────────────────────

export type MealType = "Desayuno" | "Almuerzo" | "Cena" | "Snack";

/**
 * Documento completo en MongoDB para el Plan Nutricional.
 * NUNCA se expone directamente al cliente (sin filtrar ObjectIds).
 */
export interface NutritionPlanDocument {
  _id?: ObjectId;
  publicId: string; // Debe empezar con nut_
  clientId: ObjectId;
  nutritionistId?: ObjectId | null;
  name?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  dailyTargets: {
    calories: number; // Int
    proteinGrams: number; // Int
    carbsGrams: number; // Int
    fatsGrams: number; // Int
  };
  mealsPerDay?: number;
  startDate: Date;
  endDate?: Date | null;
  audit: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: ObjectId;
  };
}

/**
 * Documento completo en MongoDB para el Registro de Comidas.
 */
export interface MealLogDocument {
  _id?: ObjectId;
  publicId: string; // "^mlg_[0-9A-HJKMNP-TV-Z]{26}$"
  userId: ObjectId; // Referencia a users._id
  
  date: Date; // Timestamp UTC absoluto generado en el backend
  mealType: MealType;
  foodName: string;
  
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };

  audit: {
    createdAt: Date;
  };
}

// ──────────────────────────────────────────────────
// Interfaces para el Cliente (serializadas)
// ──────────────────────────────────────────────────

export interface NutritionPlanPublic {
  publicId: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  dailyTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  startDate: string;
  audit: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface MealLogPublic {
  publicId: string;
  date: string; // ISO string
  mealType: MealType;
  foodName: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  audit: {
    createdAt: string;
  };
}
