import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { workoutSessionApiSchema } from "@/lib/schemas/workout.schema";
import { generatePublicId } from "@/lib/utils/id";
import { calculateAndMarkPRs } from "@/lib/utils/pr-calculator";
import type { WorkoutSessionDocument, WorkoutSessionResponse } from "@/types/workout";
import type { UserDocument, ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// POST /api/workouts/session
// Estructura del documento alineada a `workout_sessions`
// y compatible con la agregación de dashboard_cache
// ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Parsear y validar body
    const body = await request.json();
    const parsed = workoutSessionApiSchema.safeParse(body);

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
          error: { code: "VALIDATION_ERROR", message: "Datos de sesión inválidos.", details: fieldErrors },
        },
        { status: 422 }
      );
    }

    const { userId: userPublicId, type, name, exercises, notes, startedAt, finishedAt } = parsed.data;

    // 2. Conectar
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>("users");

    // 3. Resolver publicId → ObjectId del usuario
    const userDoc = await usersCollection.findOne(
      { publicId: userPublicId },
      { projection: { _id: 1 } }
    );

    if (!userDoc) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "No se encontró el usuario." },
        },
        { status: 404 }
      );
    }

    // 4. Calcular duración en minutos
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    // 5. Calcular volumen total (Σ weight × reps)
    let totalSets = 0;
    let totalVolume = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        totalSets++;
        totalVolume += set.weight * set.reps;
      }
    }

    // 6. Calcular PRs y generar publicId
    const { enrichedExercises, prsBroken } = await calculateAndMarkPRs(db, userDoc._id, exercises);
    const publicId = generatePublicId("wks");

    // 7. Construir documento según estructura esperada por dashboard_cache
    const now = new Date();
    const sessionDocument: Omit<WorkoutSessionDocument, "_id"> = {
      publicId,
      clientId: userDoc._id,

      type,
      name: name.trim(),
      notes: notes?.trim() || undefined,

      exercises: enrichedExercises.map((ex) => ({
        exerciseId: ex.exerciseId || undefined,
        exerciseName: ex.exerciseName.trim(),
        sets: ex.sets.map((s: any) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          unit: s.unit,
          restSeconds: s.restSeconds,
          rpe: s.rpe,
          isPR: s.isPR,
        })),
      })),

      startedAt: start,
      finishedAt: end,
      durationMinutes,

      metadata: {
        schemaVersion: 1,
        source: "web",
      },

      audit: {
        createdAt: now,
        updatedAt: now,
      },
    };

    // 8. Insertar
    const sessionsCollection = db.collection<WorkoutSessionDocument>("workout_sessions");
    await sessionsCollection.insertOne(sessionDocument as WorkoutSessionDocument);

    // 9. Respuesta (sin ObjectIds)
    return NextResponse.json<WorkoutSessionResponse>(
      {
        success: true,
        data: {
          publicId,
          name: name.trim(),
          exerciseCount: exercises.length,
          totalSets,
          totalVolume: Math.round(totalVolume * 100) / 100,
          durationMinutes,
          prsBroken,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/workouts/session] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno. Inténtalo más tarde." },
      },
      { status: 500 }
    );
  }
}
