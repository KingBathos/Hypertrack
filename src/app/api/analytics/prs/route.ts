import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const db = await getDb();
    
    // Convertir el publicId del JWT al ObjectId real de la base de datos
    const userDoc = await db.collection("users").findOne(
      { publicId: session.sub },
      { projection: { _id: 1 } }
    );

    if (!userDoc) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Pipeline para buscar todos los PRs por ejercicio
    const pipeline = [
      { $match: { clientId: userDoc._id } },
      { $unwind: "$exercises" },
      { $unwind: "$exercises.sets" },
      { $match: { "exercises.sets.isPR": true } },
      { $group: {
          _id: "$exercises.exerciseName",
          maxWeight: { $max: "$exercises.sets.weight" },
          lastPRDate: { $max: "$startedAt" }
        }
      },
      { $sort: { lastPRDate: -1 } }
    ];

    const prs = await db.collection("workout_sessions").aggregate(pipeline).toArray();

    return NextResponse.json({ prs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/analytics/prs error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
