import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { UserDocument } from "@/types/user";

// ──────────────────────────────────────────────────
// GET /api/analytics/volume — Volumen de carga por día
//
// Aggregation Pipeline sobre workout_sessions:
// 1. Filtra por userId
// 2. $unwind exercises → $unwind sets
// 3. Calcula volumen por set (weight × reps)
// 4. $group por fecha (truncada a día) → suma volumen
// 5. Ordena cronológicamente (últimos 30 días)
// ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // 1. Validar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Resolver userId
    const db = await getDb();
    const user = await db
      .collection<UserDocument>("users")
      .findOne({ publicId: session.sub }, { projection: { _id: 1 } });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 3. Rango de fechas: últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    // 4. Aggregation Pipeline
    const pipeline = [
      // Filtrar por usuario y rango de fechas
      {
        $match: {
          clientId: user._id,
          startedAt: { $gte: thirtyDaysAgo },
        },
      },
      // Descomponer exercises
      { $unwind: "$exercises" },
      // Descomponer sets
      { $unwind: "$exercises.sets" },
      // Calcular volumen por set y proyectar la fecha truncada
      {
        $project: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$startedAt" },
          },
          volume: {
            $multiply: [
              "$exercises.sets.weight",
              "$exercises.sets.reps",
            ],
          },
        },
      },
      // Agrupar por día → sumar volumen total
      {
        $group: {
          _id: "$date",
          totalVolume: { $sum: "$volume" },
          totalSets: { $sum: 1 },
        },
      },
      // Ordenar cronológicamente
      { $sort: { _id: 1 as const } },
      // Reformatear la salida
      {
        $project: {
          _id: 0,
          date: "$_id",
          volume: { $round: ["$totalVolume", 0] },
          sets: "$totalSets",
        },
      },
    ];

    const volumeData = await db
      .collection("workout_sessions")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      data: volumeData,
    });
  } catch (error) {
    console.error("[Analytics Volume API] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
