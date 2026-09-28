import type { ObjectId } from "mongodb";

// ──────────────────────────────────────────────────
// Tipos de dominio — Colección `dashboard_cache`
// Alineado exactamente con el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

export type CachePeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "LIFETIME";

/**
 * Documento completo en MongoDB.
 */
export interface DashboardCacheDocument {
  _id: ObjectId;
  clientId: ObjectId; // Referencia a users._id (ObjectId)
  period: CachePeriod;
  startDate: Date;
  endDate: Date;
  trainingMetrics?: {
    workoutsCompleted: number; // bsonType: int
    totalVolumeKg: number;
    adherencePercentage: number; // 0-100
  };
  nutritionMetrics?: {
    averageCalories: number;
    adherencePercentage: number; // 0-100
  };
  calculatedAt: Date;
}

/**
 * Respuesta pública serializada (sin ObjectIds).
 */
export interface DashboardCachePublic {
  period: CachePeriod;
  startDate: string;   // ISO 8601
  endDate: string;
  trainingMetrics: {
    workoutsCompleted: number;
    totalVolumeKg: number;
    adherencePercentage: number;
  };
  nutritionMetrics: {
    averageCalories: number;
    adherencePercentage: number;
  };
  calculatedAt: string; // ISO 8601
  /** true si los datos son calculados en tiempo real (sin caché previa) */
  isFallback?: boolean;
}

/**
 * Respuesta de la API GET /api/dashboard/cache.
 */
export interface DashboardApiResponse {
  success: true;
  data: DashboardCachePublic;
}
