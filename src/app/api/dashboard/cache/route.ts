import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { dashboardQuerySchema } from "@/lib/schemas/dashboard.schema";
import type {
  DashboardCacheDocument,
  DashboardCachePublic,
  DashboardApiResponse,
  CachePeriod,
} from "@/types/dashboard";
import type { UserDocument } from "@/types/user";
import type { ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// GET /api/dashboard/cache
// Estrategia: cache-first (TTL 1h) → agrega datos en tiempo real si miss
// Documento alineado al $jsonSchema físico de `dashboard_cache`
// ──────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/** Calcula el rango de fechas para el período */
function getPeriodRange(period: CachePeriod): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case "DAILY":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "WEEKLY": {
      const dow = now.getDay();
      const daysToMon = dow === 0 ? 6 : dow - 1;
      start.setDate(now.getDate() - daysToMon);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "MONTHLY":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "LIFETIME":
      start.setFullYear(2020, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return { start, end };
}

/** Métricas de entrenamiento vacías */
const EMPTY_TRAINING = { workoutsCompleted: 0, totalVolumeKg: 0, adherencePercentage: 0 };

/** Métricas de nutrición vacías */
const EMPTY_NUTRITION = { averageCalories: 0, adherencePercentage: 0 };

/** Calcula trainingMetrics via agregación */
async function computeTrainingMetrics(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: import("mongodb").ObjectId,
  start: Date,
  end: Date,
  period: CachePeriod
) {
  try {
    const col = db.collection("workout_sessions");
    const pipeline = [
      { $match: { clientId, startedAt: { $gte: start, $lte: end } } },
      {
        $project: {
          sessionVolume: {
            $sum: {
              $map: {
                input: { $ifNull: ["$exercises", []] },
                as: "ex",
                in: {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$$ex.sets", []] },
                      as: "s",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$s.weight", 0] },
                          { $ifNull: ["$$s.reps", 0] },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          workoutsCompleted: { $sum: 1 },
          totalVolumeKg: { $sum: "$sessionVolume" },
        },
      },
    ];

    const results = await col.aggregate(pipeline).toArray();
    if (!results.length) return EMPTY_TRAINING;

    const data = results[0];
    const periodDays =
      period === "DAILY" ? 1
      : period === "WEEKLY" ? 7
      : period === "MONTHLY"
        ? new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
        : Math.max(
            Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ),
            1
          );

    return {
      workoutsCompleted: data.workoutsCompleted ?? 0,
      totalVolumeKg: Math.round((data.totalVolumeKg ?? 0) * 100) / 100,
      adherencePercentage: Math.min(
        Math.round(((data.workoutsCompleted ?? 0) / periodDays) * 100),
        100
      ),
    };
  } catch {
    return EMPTY_TRAINING;
  }
}

/** Calcula nutritionMetrics via agregación */
async function computeNutritionMetrics(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: import("mongodb").ObjectId,
  start: Date,
  end: Date,
  period: CachePeriod
) {
  try {
    const col = db.collection("nutrition_logs");
    const pipeline = [
      { $match: { clientId, date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          daysLogged: { $sum: 1 },
          avgCalories: { $avg: "$totalCalories" },
        },
      },
    ];
    const results = await col.aggregate(pipeline).toArray();
    if (!results.length) return EMPTY_NUTRITION;

    const data = results[0];
    const periodDays =
      period === "DAILY" ? 1
      : period === "WEEKLY" ? 7
      : period === "MONTHLY"
        ? new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
        : Math.max(
            Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ),
            1
          );

    return {
      averageCalories: Math.round(data.avgCalories ?? 0),
      adherencePercentage: Math.min(
        Math.round(((data.daysLogged ?? 0) / periodDays) * 100),
        100
      ),
    };
  } catch {
    return EMPTY_NUTRITION;
  }
}

// ── Handler principal ──

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      userId: searchParams.get("userId") ?? "",
      period: searchParams.get("period") ?? "WEEKLY",
    };

    const parsed = dashboardQuerySchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parámetros inválidos.", details: fieldErrors },
        },
        { status: 422 }
      );
    }

    const { userId: userPublicId, period } = parsed.data;

    const db = await getDb();

    // Resolver publicId → ObjectId (_id) del usuario
    const userDoc = await db
      .collection<UserDocument>("users")
      .findOne({ publicId: userPublicId }, { projection: { _id: 1 } });

    if (!userDoc) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "Usuario no encontrado." },
        },
        { status: 404 }
      );
    }

    const clientId = userDoc._id;
    const cacheCol = db.collection<DashboardCacheDocument>("dashboard_cache");

    // Cache-first: buscar documento vigente (< 1h)
    const cachedDoc = await cacheCol.findOne(
      { clientId, period },
      { sort: { calculatedAt: -1 } }
    );

    const isCacheValid =
      cachedDoc &&
      Date.now() - cachedDoc.calculatedAt.getTime() < CACHE_TTL_MS;

    if (isCacheValid && cachedDoc) {
      const response: DashboardCachePublic = {
        period: cachedDoc.period,
        startDate: cachedDoc.startDate.toISOString(),
        endDate: cachedDoc.endDate.toISOString(),
        trainingMetrics: cachedDoc.trainingMetrics ?? EMPTY_TRAINING,
        nutritionMetrics: cachedDoc.nutritionMetrics ?? EMPTY_NUTRITION,
        calculatedAt: cachedDoc.calculatedAt.toISOString(),
      };
      return NextResponse.json<DashboardApiResponse>(
        { success: true, data: response },
        { status: 200, headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=3600" } }
      );
    }

    // Cache MISS: calcular en tiempo real
    const { start, end } = getPeriodRange(period);

    const [trainingMetrics, nutritionMetrics] = await Promise.all([
      computeTrainingMetrics(db, clientId, start, end, period),
      computeNutritionMetrics(db, clientId, start, end, period),
    ]);

    const calculatedAt = new Date();

    // Upsert en dashboard_cache con campos del $jsonSchema
    await cacheCol.updateOne(
      { clientId, period },
      {
        $set: {
          clientId,
          period,
          startDate: start,
          endDate: end,
          trainingMetrics,
          nutritionMetrics,
          calculatedAt,
        },
      },
      { upsert: true }
    );

    const response: DashboardCachePublic = {
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      trainingMetrics,
      nutritionMetrics,
      calculatedAt: calculatedAt.toISOString(),
      isFallback: true,
    };

    return NextResponse.json<DashboardApiResponse>(
      { success: true, data: response },
      { status: 200, headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=3600" } }
    );
  } catch (error) {
    console.error("[GET /api/dashboard/cache] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error al obtener métricas." },
      },
      { status: 500 }
    );
  }
}
