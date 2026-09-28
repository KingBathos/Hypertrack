import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { commentSchema } from "@/lib/schemas/comment.schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: sessionId } = await params;
    
    const body = await request.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.format() }, { status: 400 });
    }

    const db = await getDb();
    
    const newComment = {
      _id: new ObjectId(),
      authorPublicId: session.sub,
      role: session.role || "USER",
      text: parsed.data.text,
      createdAt: new Date(),
    };

    // Agregar el comentario a la sesión. Intentamos primero por publicId.
    const result = await db.collection("workout_sessions").updateOne(
      { publicId: sessionId },
      { $push: { comments: newComment } as any }
    );

    if (result.matchedCount === 0) {
      // Fallback a ObjectId por si el frontend mandó el _id de Mongo
      if (ObjectId.isValid(sessionId)) {
        const resultById = await db.collection("workout_sessions").updateOne(
          { _id: new ObjectId(sessionId) },
          { $push: { comments: newComment } as any }
        );
        if (resultById.matchedCount === 0) {
           return NextResponse.json({ error: "Sesión de entrenamiento no encontrada" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "Sesión de entrenamiento no encontrada" }, { status: 404 });
      }
    }

    return NextResponse.json({ message: "Comentario publicado exitosamente", comment: newComment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workouts/[id]/comments error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: sessionId } = await params;
    const db = await getDb();
    
    const query = ObjectId.isValid(sessionId) 
      ? { $or: [{ publicId: sessionId }, { _id: new ObjectId(sessionId) }] }
      : { publicId: sessionId };

    const workoutSession = await db.collection("workout_sessions").findOne(query, { projection: { comments: 1 } });

    if (!workoutSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ comments: workoutSession.comments || [] }, { status: 200 });
  } catch (error) {
    console.error("GET /api/workouts/[id]/comments error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
