"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { ObjectId, Int32 } from "mongodb";

// Utilidad para IDs únicos
function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(13).toString("hex").toUpperCase()}`;
}

export async function saveWorkoutSession(workoutData: any) {
  // 1. Obtener la sesión del usuario logueado
  const session = await getSession();
  if (!session) {
    throw new Error("Acceso Denegado: No autenticado");
  }

  // 2. Conectarse a MongoDB y obtener ObjectId
  const db = await getDb();
  const usersCol = db.collection("users");
  const user = await usersCol.findOne({ publicId: session.sub });
  if (!user) throw new Error("Usuario no encontrado en la base de datos");

  // 3. Calcular el Volumen Total e iterar rutinas
  let totalVolume = 0;
  const cleanExercises = workoutData.exercises.map((exe: any, idx: number) => {
    return {
      exerciseId: exe.exerciseId ? new ObjectId(exe.exerciseId) : new ObjectId(),
      order: new Int32(idx + 1),
      exerciseName: exe.exerciseName || "Ejercicio Libre",
      sets: exe.sets.map((s: any, sIdx: number) => {
        const weight = Number(s.weight) || 0;
        const reps = Number(s.reps) || 0;
        totalVolume += (weight * reps); // Suma para la telemetría
        
        return {
          setNumber: new Int32(sIdx + 1),
          setType: "WORKING",
          reps: new Int32(reps),
          weight: weight,
          completed: true,
          unit: s.unit || "KG",
          rpe: Number(s.rpe) || null
        };
      })
    };
  });

  const now = new Date();
  const startedAt = new Date(workoutData.startedAt);
  const durationMinutes = Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000));
  const shortDate = now.toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });

  // 4. Construir y guardar el documento de la sesión
  const newSession = {
    publicId: generateId("ses"),
    clientId: user._id,
    status: "COMPLETED",
    type: "FREE",
    name: `Entrenamiento Libre - ${shortDate}`,
    exercises: cleanExercises,
    startedAt,
    finishedAt: now,
    durationMinutes: new Int32(durationMinutes),
    metadata: {
      schemaVersion: new Int32(1),
      source: "web"
    },
    audit: {
      createdAt: now,
      updatedAt: now
    }
  };

  // 5. Insertar en MongoDB
  await db.collection("workout_sessions").insertOne(newSession as any);

  // TAREA 2: GAMIFICACIÓN (SUBIR DE NIVEL)
  // Hacemos updateOne en el perfil del usuario para incrementar su XP y Volumen de por vida
  await db.collection("profiles").updateOne(
    { userId: user._id },
    { 
      $inc: { 
        lifetimeVolume: totalVolume, 
        totalXp: Math.floor(totalVolume * 0.1) // 10% del volumen convertido en XP
      } 
    }
  );

  // Purgar caché para que el Dashboard Central muestre los datos frescos
  revalidatePath("/dashboard");
}
