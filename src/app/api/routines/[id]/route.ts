import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { ROUTINE_STATUS } from "@/lib/schemas/routine.schema";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
       return NextResponse.json({ error: "ID de rutina inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;
    
    if (!status || !ROUTINE_STATUS.includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("workout_programs").updateOne(
      { _id: new ObjectId(id), clientId: session.sub },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Rutina no encontrada o no tienes permisos" }, { status: 404 });
    }

    return NextResponse.json({ message: "Rutina actualizada exitosamente" }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/routines/[id] error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
