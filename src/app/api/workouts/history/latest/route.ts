import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseNamesParam = searchParams.get("exercises");
    
    const db = await getDb();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ publicId: session.sub });
    
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const workoutsCol = db.collection("workout_sessions");

    let query: any = { clientId: user._id };

    if (exerciseNamesParam) {
      const names = exerciseNamesParam.split(",").map(n => n.trim().toLowerCase());
      query = {
        ...query,
        "exercises.exerciseName": { $in: names.map(n => new RegExp(`^${n}$`, "i")) }
      };
    }

    // Buscar los últimos 10 entrenamientos para buscar el historial
    const recentWorkouts = await workoutsCol
      .find(query)
      .sort({ startedAt: -1 })
      .limit(10)
      .toArray();

    const historyMap = new Map();

    recentWorkouts.forEach((workout) => {
      if (!workout.exercises) return;
      workout.exercises.forEach((exe: any) => {
        const name = exe.exerciseName.trim().toLowerCase();
        
        if (!historyMap.has(name) && exe.sets && exe.sets.length > 0) {
          // Buscamos el set más pesado o simplemente el primero como referencia
          const bestSet = exe.sets.reduce((best: any, current: any) => {
            const currentWeight = Number(current.weight) || 0;
            const bestWeight = Number(best.weight) || 0;
            return currentWeight > bestWeight ? current : best;
          }, exe.sets[0]);
          
          if (bestSet && bestSet.weight) {
            historyMap.set(name, {
              weight: bestSet.weight,
              reps: bestSet.reps,
              date: workout.startedAt || workout.audit?.createdAt
            });
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      history: Object.fromEntries(historyMap)
    });

  } catch (error) {
    console.error("[GET /api/workouts/history/latest] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
