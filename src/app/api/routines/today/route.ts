import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { applyAutoProgression } from "@/lib/utils/auto-progression";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.sub;
    
    // Calcular el día actual en formato esperado por el schema
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const todayName = days[new Date().getDay()];

    const db = await getDb();
    
    // Obtener las rutinas base asignadas a hoy
    const routines = await db.collection("workout_programs").find({
      clientId: userId,
      status: "ACTIVE",
      assignedDays: { $in: [todayName] }
    }).toArray();

    // 4. Interceptar y aplicar lógica de auto-progresión (IA lógica)
    const progressedRoutines = await applyAutoProgression(db, userId, routines);

    return NextResponse.json({ routines: progressedRoutines }, { status: 200 });

  } catch (error) {
    console.error("Error fetching today's routines:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
