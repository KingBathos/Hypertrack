import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { workoutProgramSchema } from "@/lib/schemas/routine.schema";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const db = await getDb();
    // Obtener todas las rutinas del usuario, excepto las ARCHIVED
    const routines = await db.collection("workout_programs").find({
      clientId: session.sub,
      status: { $ne: "ARCHIVED" }
    }).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ routines }, { status: 200 });
  } catch (error) {
    console.error("GET /api/routines error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    
    // Forzar authorId y clientId al usuario actual
    const payload = {
      ...body,
      authorId: session.sub,
      clientId: session.sub,
    };

    const parsed = workoutProgramSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const db = await getDb();
    
    const doc = {
      ...parsed.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("workout_programs").insertOne(doc);

    return NextResponse.json({ id: result.insertedId, message: "Rutina creada exitosamente" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/routines error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
