import { z } from "zod";

// ──────────────────────────────────────────────────
// Schema Zod — Colección `dashboard_cache`
// Espeja el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

export const CACHE_PERIOD = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  LIFETIME: "LIFETIME",
} as const;

export type CachePeriod = keyof typeof CACHE_PERIOD;

/**
 * Query params para GET /api/dashboard/cache
 */
export const dashboardQuerySchema = z.object({
  userId: z.string().min(1, "userId (publicId) es obligatorio"),
  period: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "LIFETIME"])
    .default("WEEKLY"),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
