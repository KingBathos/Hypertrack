import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = await getDb();

    // 1. Resolver publicId → ObjectId del usuario
    const user = await db.collection("users").findOne({ publicId: session.sub });
    if (!user) {
      return NextResponse.json({ routines: [] }, { status: 200 });
    }

    // 2. Buscar la asignación activa en program_assignments (ObjectId)
    const activeAssignment = await db.collection("program_assignments").findOne({
      clientId: user._id,
      status: "ACTIVE",
    });

    if (!activeAssignment) {
      return NextResponse.json({ routines: [] }, { status: 200 });
    }

    // 3. Obtener el programa maestro desde training_programs
    const program = await db.collection("training_programs").findOne({
      _id: activeAssignment.programVersionId,
    });

    if (!program) {
      return NextResponse.json({ routines: [] }, { status: 200 });
    }

    // 4. Devolver el programa con sus ejercicios
    return NextResponse.json({ routines: [program] }, { status: 200 });

  } catch (error) {
    console.error("Error fetching today's routines:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
