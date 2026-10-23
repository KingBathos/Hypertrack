"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { logSecurityAction } from "@/lib/audit";

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(13).toString("hex").toUpperCase()}`;
}

const DEFAULT_EXERCISES = [
  { name: "Press de Banca Plano con Barra", category: "Push", movementPattern: "Horizontal Push" },
  { name: "Press de Banca Inclinado con Mancuernas", category: "Push", movementPattern: "Horizontal Push" },
  { name: "Sentadilla Libre con Barra", category: "Legs", movementPattern: "Squat" },
  { name: "Prensa Inclinada", category: "Legs", movementPattern: "Squat" },
  { name: "Dominadas", category: "Pull", movementPattern: "Vertical Pull" },
  { name: "Remo con Barra", category: "Pull", movementPattern: "Horizontal Pull" },
  { name: "Press Militar", category: "Push", movementPattern: "Vertical Push" },
  { name: "Peso Muerto", category: "Legs", movementPattern: "Hinge" }
];

export async function getExercises() {
  const db = await getDb();
  const coll = db.collection("exercise_library");
  
  let exercises = await coll.find().toArray();
  
  if (exercises.length === 0) {
    const docs = DEFAULT_EXERCISES.map(e => ({
      publicId: generateId("exe"),
      name: e.name,
      category: e.category,
      movementPattern: e.movementPattern,
      bodyPart: "Full Body",
      equipment: "Variado",
      audit: { createdAt: new Date(), updatedAt: new Date() }
    }));
    await coll.insertMany(docs);
    exercises = await coll.find().toArray();
  }
  
  return exercises.map(e => ({
    ...e,
    _id: e._id.toString()
  }));
}

export async function createTrainingProgram(data: { name: string, goal?: string, level?: string, exercises: any[] }) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    throw new Error("Solo los coaches pueden crear programas.");
  }
  const db = await getDb();
  const coach = await db.collection("users").findOne({ publicId: session.sub });
  if (!coach) throw new Error("Coach no encontrado");

  const now = new Date();
  
  const program = {
    publicId: generateId("prg"),
    authorId: coach._id,
    name: data.name,
    description: "Programa creado en portal",
    goal: data.goal || "HYPERTROPHY",
    level: data.level || "INTERMEDIATE",
    status: "ACTIVE",
    exercises: data.exercises.map((e, index) => ({
      order: index,
      exerciseId: e.exerciseId, // String para UI, opcional mapear a ObjectId
      exerciseName: e.exerciseName,
      targetSets: Number(e.targetSets) || 3,
      targetReps: Number(e.targetReps) || 10,
      targetRpe: Number(e.targetRpe) || 8,
      restSeconds: 90
    })),
    audit: { createdAt: now, updatedAt: now, createdBy: coach._id }
  };

  await db.collection("training_programs").insertOne(program);
  
  revalidatePath("/coach");
  return { success: true, programId: program.publicId };
}

export async function assignProgramToClient(clientIdStr: string, programPublicId: string) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) throw new Error("Acceso Denegado");
  
  const db = await getDb();
  const client = await db.collection("users").findOne({ publicId: clientIdStr });
  const program = await db.collection("training_programs").findOne({ publicId: programPublicId });
  const coach = await db.collection("users").findOne({ publicId: session.sub });
  
  if (!client || !program || !coach) throw new Error("Datos no encontrados");

  await db.collection("program_assignments").updateMany(
    { clientId: client._id, status: "ACTIVE" },
    { $set: { status: "COMPLETED", endDate: new Date() } }
  );

  const now = new Date();
  const assignment = {
    publicId: generateId("asn"),
    clientId: client._id,
    coachId: coach._id,
    programVersionId: program._id,
    status: "ACTIVE",
    startDate: now,
    audit: {
      createdAt: now,
      createdBy: coach._id,
      updatedAt: now
    }
  };

  await db.collection("program_assignments").insertOne(assignment);

  // Registrar auditoría de seguridad
  await logSecurityAction(session.sub, "ASSIGN_PROGRAM", client._id, {
    programId: program._id,
    programName: program.name
  });

  revalidatePath("/dashboard");
  revalidatePath(`/coach/assign-program/${clientIdStr}`);
  return { success: true };
}

// --- MODO ATLETA LIBRE: Plantillas ---

export async function createWorkoutTemplate(data: { name: string; notes?: string; exercises: any[] }) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) throw new Error("Usuario no encontrado");

  const now = new Date();
  const template = {
    publicId: generateId("tpl"),
    clientId: user._id,
    name: data.name,
    notes: data.notes,
    exercises: data.exercises.map(e => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      targetSets: Number(e.targetSets) || 3,
      targetReps: e.targetReps || "10",
      targetRpe: e.targetRpe ? Number(e.targetRpe) : undefined,
      targetRestSeconds: e.targetRestSeconds ? Number(e.targetRestSeconds) : 90
    })),
    audit: { createdAt: now, updatedAt: now }
  };

  await db.collection("workout_templates").insertOne(template);
  revalidatePath("/entrenamiento");
  return { success: true, templateId: template.publicId };
}

export async function getUserTemplates() {
  const session = await getSession();
  if (!session) return [];

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) return [];

  const templates = await db.collection("workout_templates")
    .find({ clientId: user._id })
    .sort({ "audit.createdAt": -1 })
    .toArray();

  return templates.map(t => ({
    ...t,
    _id: t._id.toString(),
    clientId: t.clientId.toString()
  }));
}

// --- HISTORIAL DE ENTRENAMIENTOS Y PRs ---

export async function logWorkoutSession(data: {
  name: string;
  type: "FREE" | "PROGRAM";
  notes?: string;
  startedAt: string | Date;
  finishedAt: string | Date;
  exercises: any[]; // WorkoutExercise[]
}) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) throw new Error("Usuario no encontrado");

  const startedAt = new Date(data.startedAt);
  const finishedAt = new Date(data.finishedAt);
  const durationMinutes = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);

  const workoutSession = {
    publicId: generateId("wks"),
    clientId: user._id,
    type: data.type,
    name: data.name,
    notes: data.notes,
    exercises: data.exercises,
    startedAt,
    finishedAt,
    durationMinutes,
    prsBroken: 0, // Placeholder, se actualiza después
    metadata: {
      schemaVersion: 1,
      source: "web"
    },
    audit: {
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  // === CÁLCULO REACTIVO DE PRs (Materialized View) ===
  const prsColl = db.collection("personal_records");
  let prsBroken = 0;

  for (let eIdx = 0; eIdx < workoutSession.exercises.length; eIdx++) {
    const ex = workoutSession.exercises[eIdx];
    const trackingId = ex.exerciseId || ex.exerciseName; // Fallback al nombre si no hay ID
    if (!trackingId) continue;

    let maxWeightKg = 0;
    let bestSet = null;
    let bestSetIdx = -1;

    for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
      const set = ex.sets[sIdx];
      if (set.isWarmup || set.isDropSet) continue;
      
      const weightInKg = set.unit === "LBS" ? set.weight * 0.453592 : set.weight;
      
      if (weightInKg > maxWeightKg || (weightInKg === maxWeightKg && bestSet && set.reps > bestSet.reps)) {
        maxWeightKg = weightInKg;
        bestSet = set;
        bestSetIdx = sIdx;
      }
    }

    if (bestSet) {
      const estimated1RM = maxWeightKg * (1 + (bestSet.reps / 30));

      const existingPr = await prsColl.findOne({
        clientId: user._id,
        exerciseId: trackingId
      });

      let isNewPr = false;
      if (!existingPr) {
        isNewPr = true;
      } else {
        const existingWeightKg = existingPr.maxWeightUnit === "LBS" ? existingPr.maxWeight * 0.453592 : existingPr.maxWeight;
        if (maxWeightKg > existingWeightKg) {
          isNewPr = true;
        } else if (maxWeightKg === existingWeightKg && bestSet.reps > existingPr.maxWeightReps) {
          isNewPr = true;
        }
      }

      if (isNewPr) {
        prsBroken++;
        workoutSession.exercises[eIdx].sets[bestSetIdx].isPR = true; // Marcar en memoria antes de guardar

        // Aquí no tenemos result.insertedId todavía, porque lo guardaremos al final
        await prsColl.updateOne(
          { clientId: user._id, exerciseId: trackingId },
          {
            $set: {
              exerciseName: ex.exerciseName,
              maxWeight: bestSet.weight,
              maxWeightReps: bestSet.reps,
              maxWeightUnit: bestSet.unit,
              estimated1RM: estimated1RM,
              dateAchieved: startedAt,
              "audit.updatedAt": new Date()
            },
            $setOnInsert: {
              "audit.createdAt": new Date()
            }
          },
          { upsert: true }
        );
      }
    }
  }

  workoutSession.prsBroken = prsBroken;
  const result = await db.collection("workout_sessions").insertOne(workoutSession);

  // Enlazar los PRs con la sesión recién creada (workoutSessionId)
  if (prsBroken > 0) {
    await prsColl.updateMany(
      { clientId: user._id, dateAchieved: startedAt },
      { $set: { workoutSessionId: result.insertedId } }
    );
  }

  // === COMPLETAR PROGRAMA ACTIVO ===
  // Si la sesión fue de tipo PROGRAM, marcar la asignación como completada
  // para que no siga apareciendo como activa en el dashboard
  if (data.type === "PROGRAM") {
    await db.collection("program_assignments").updateOne(
      { clientId: user._id, status: "ACTIVE" },
      {
        $set: {
          status: "COMPLETED",
          endDate: new Date(),
          "audit.updatedAt": new Date(),
        },
      }
    );
  }

  // === GAMIFICACIÓN (SUBIR DE NIVEL) ===
  // Calcular volumen total para XP
  let totalVolume = 0;
  for (const ex of data.exercises) {
    for (const set of ex.sets) {
      if (set.isWarmup || set.isDropSet) continue;
      const weight = Number(set.weight) || 0;
      const reps = Number(set.reps) || 0;
      totalVolume += (weight * reps);
    }
  }

  if (totalVolume > 0) {
    await db.collection("profiles").updateOne(
      { userId: user._id },
      { 
        $inc: { 
          lifetimeVolume: totalVolume, 
          totalXp: Math.floor(totalVolume * 0.1) // 10% del volumen convertido en XP
        } 
      }
    );
  }

  revalidatePath("/entrenamiento");
  revalidatePath("/dashboard");
  return { success: true, sessionId: workoutSession.publicId };
}

export async function getWorkoutHistory(limit = 10) {
  const session = await getSession();
  if (!session) return [];

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) return [];

  const history = await db.collection("workout_sessions")
    .find({ clientId: user._id })
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();

  return history.map(h => ({
    ...h,
    _id: h._id.toString(),
    clientId: h.clientId.toString()
  }));
}

export async function getExercisePRs(exerciseId: string) {
  const session = await getSession();
  if (!session) return null;

  const db = await getDb();
  const user = await db.collection("users").findOne({ publicId: session.sub });
  if (!user) return null;

  const pr = await db.collection("personal_records").findOne({
    clientId: user._id,
    exerciseId: exerciseId
  });

  if (!pr) return null;

  return {
    ...pr,
    _id: pr._id.toString(),
    clientId: pr.clientId.toString(),
    workoutSessionId: pr.workoutSessionId.toString()
  };
}
