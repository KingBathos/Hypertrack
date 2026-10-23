/**
 * src/lib/dao/nutrition.dao.ts
 *
 * Data Access Object (DAO) para el dominio de Nutrición.
 * Encapsula colecciones:
 * - `nutrition_plans`
 * - `meal_logs`
 */

import { ObjectId } from "mongodb";
import { BaseDAO } from "./base.dao";
import type { NutritionPlanDocument, MealLogDocument } from "../../types/nutrition";

export interface LogMealDTO {
  userId: ObjectId;
  mealType: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  loggedAt?: Date;
}

export interface CreateNutritionPlanDTO {
  publicId: string;
  clientId: ObjectId;
  authorId: ObjectId;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
}

class NutritionDAOImpl extends BaseDAO<any> {
  constructor() {
    super("nutrition_plans");
  }

  // ─────────────────────────────────────────────
  // 1. Planes Nutricionales
  // ─────────────────────────────────────────────

  async getActivePlanByClientId(clientId: ObjectId): Promise<NutritionPlanDocument | null> {
    const db = await this.getDatabase();
    return db.collection<NutritionPlanDocument>("nutrition_plans").findOne(
      { clientId, status: "ACTIVE" },
      { sort: { "audit.createdAt": -1 } }
    );
  }

  async deactivateExistingPlans(clientId: ObjectId): Promise<void> {
    const db = await this.getDatabase();
    await db.collection("nutrition_plans").updateMany(
      { clientId, status: "ACTIVE" },
      { $set: { status: "CANCELLED", "audit.updatedAt": new Date() } }
    );
  }

  async createPlan(data: CreateNutritionPlanDTO): Promise<NutritionPlanDocument> {
    const db = await this.getDatabase();
    await this.deactivateExistingPlans(data.clientId);

    const now = new Date();
    const doc: NutritionPlanDocument = {
      publicId: data.publicId,
      clientId: data.clientId,
      status: "ACTIVE",
      dailyTargets: {
        calories: Number(data.dailyCalories),
        proteinGrams: Number(data.proteinGrams),
        carbsGrams: Number(data.carbsGrams),
        fatsGrams: Number(data.fatsGrams),
      },
      startDate: now,
      audit: {
        createdAt: now,
        updatedAt: now,
        createdBy: data.authorId,
      },
    };

    await db.collection("nutrition_plans").insertOne(doc as any);
    return doc;
  }

  // ─────────────────────────────────────────────
  // 2. Bitácora de Comidas (Meal Logs)
  // ─────────────────────────────────────────────

  async insertMealLog(mealData: LogMealDTO) {
    const db = await this.getDatabase();
    const doc = {
      ...mealData,
      loggedAt: mealData.loggedAt || new Date(),
    };
    return db.collection("meal_logs").insertOne(doc as any);
  }

  async getMealLogsForUser(userId: ObjectId, limit: number = 50) {
    const db = await this.getDatabase();
    return db
      .collection("meal_logs")
      .find({ userId })
      .sort({ loggedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getMealLogsForDateRange(userId: ObjectId, start: Date, end: Date) {
    const db = await this.getDatabase();
    return db
      .collection("meal_logs")
      .find({
        userId,
        loggedAt: { $gte: start, $lte: end },
      })
      .sort({ loggedAt: 1 })
      .toArray();
  }
}

export const NutritionDAO = new NutritionDAOImpl();
