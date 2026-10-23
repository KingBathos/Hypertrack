"use server";

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { logSecurityAction } from "@/lib/audit";
import { UserDAO } from "@/lib/dao/user.dao";
import { WorkoutDAO } from "@/lib/dao/workout.dao";
import { calculateEpley1RM, calculateVolumeLoad } from "@/lib/domain/biomechanics";
import { getDb } from "@/lib/db/mongodb";

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
  let exercises = await WorkoutDAO.getAllExercises();

  if (exercises.length === 0) {
    const docs = DEFAULT_EXERCISES.map((e) => ({
      publicId: generateId("exe"),
      name: e.name,
      category: e.category,
      movementPattern: e.movementPattern,
      bodyPart: "Full Body",
      equipment: "Variado",
      audit: { createdAt: new Date(), updatedAt: new Date() },
    }));
    await WorkoutDAO.insertExercises(docs);
    exercises = await WorkoutDAO.getAllExercises();
  }

  return exercises.map((e: any) => ({
    ...e,
    _id: e._id.toString(),
  }));
}

export async function createTrainingProgram(data: {
  name: string;
  goal?: string;
  level?: string;
  exercises: any[];
}) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    throw new Error("Solo los coaches pueden crear programas.");
  }

  const coach = await UserDAO.findByPublicId(session.sub);
  if (!coach) throw new Error("Coach no encontrado");

  const programPublicId = generateId("prg");
  await WorkoutDAO.createTrainingProgram(
    {
      authorId: coach._id,
      name: data.name,
      goal: data.goal,
      level: data.level,
      exercises: data.exercises,
    },
    programPublicId
  );

  revalidatePath("/coach");
  return { success: true, programId: programPublicId };
}

export async function assignProgramToClient(clientIdStr: string, programPublicId: string) {
  const session = await getSession();
  if (!session || (session.role !== "COACH" && session.role !== "ADMIN")) {
    throw new Error("Acceso Denegado");
  }

  const client = await UserDAO.findByPublicId(clientIdStr);
  const program = await WorkoutDAO.findProgramByPublicId(programPublicId);
  const coach = await UserDAO.findByPublicId(session.sub);

  if (!client || !program || !coach) throw new Error("Datos no encontrados");

  // Inactivar asignaciones activas previas a través del DAO
  await WorkoutDAO.completeActiveAssignments(client._id);

  // Crear la nueva asignación
  const assignmentPublicId = generateId("asn");
  await WorkoutDAO.assignProgram({
    publicId: assignmentPublicId,
    clientId: client._id,
    coachId: coach._id,
    programVersionId: program._id,
  });

  // Registrar auditoría de seguridad
  await logSecurityAction(session.sub, "ASSIGN_PROGRAM", client._id, {
    programId: program._id,
    programName: program.name,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/coach/assign-program/${clientIdStr}`);
  return { success: true };
}

// --- MODO ATLETA LIBRE: Plantillas ---

export async function createWorkoutTemplate(data: {
  name: string;
  notes?: string;
  exercises: any[];
}) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) throw new Error("Usuario no encontrado");

  const templatePublicId = generateId("tpl");
  await WorkoutDAO.createWorkoutTemplate(
    {
      clientId: user._id,
      name: data.name,
      notes: data.notes,
      exercises: data.exercises,
    },
    templatePublicId
  );

  revalidatePath("/entrenamiento");
  return { success: true, templateId: templatePublicId };
}

export async function getUserTemplates() {
  const session = await getSession();
  if (!session) return [];

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) return [];

  const templates = await WorkoutDAO.getUserTemplates(user._id);

  return templates.map((t: any) => ({
    ...t,
    _id: t._id.toString(),
    clientId: t.clientId.toString(),
  }));
}

// --- HISTORIAL DE ENTRENAMIENTOS Y PRs ---

export async function logWorkoutSession(data: {
  name: string;
  type: "FREE" | "PROGRAM";
  notes?: string;
  startedAt: string | Date;
  finishedAt: string | Date;
  exercises: any[];
}) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) throw new Error("Usuario no encontrado");

  const startedAt = new Date(data.startedAt);
  const finishedAt = new Date(data.finishedAt);
  const durationMinutes = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);

  const sessionPublicId = generateId("wks");
  const insertedSession = await WorkoutDAO.insertWorkoutSession({
    clientId: user._id,
    publicId: sessionPublicId,
    type: data.type,
    name: data.name,
    notes: data.notes,
    exercises: data.exercises,
    startedAt,
    finishedAt,
    durationMinutes,
  });

  // === CÁLCULO REACTIVO DE PRs (Usando WorkoutDAO y Biomechanics Domain) ===
  let prsBroken = 0;

  for (let eIdx = 0; eIdx < data.exercises.length; eIdx++) {
    const ex = data.exercises[eIdx];
    const trackingId = ex.exerciseId || ex.exerciseName;
    if (!trackingId) continue;

    let maxWeightKg = 0;
    let bestSet: any = null;

    for (let sIdx = 0; sIdx < ex.sets.length; sIdx++) {
      const set = ex.sets[sIdx];
      if (set.isWarmup || set.isDropSet) continue;

      const weightInKg = set.unit === "LBS" ? set.weight * 0.453592 : set.weight;

      if (weightInKg > maxWeightKg || (weightInKg === maxWeightKg && bestSet && set.reps > bestSet.reps)) {
        maxWeightKg = weightInKg;
        bestSet = set;
      }
    }

    if (bestSet) {
      const existingPr = await WorkoutDAO.getPersonalRecord(user._id, trackingId);

      let isNewPr = false;
      if (!existingPr) {
        isNewPr = true;
      } else {
        const existingWeightKg =
          existingPr.maxWeightUnit === "LBS"
            ? existingPr.maxWeight * 0.453592
            : existingPr.maxWeight;
        if (maxWeightKg > existingWeightKg) {
          isNewPr = true;
        } else if (maxWeightKg === existingWeightKg && bestSet.reps > existingPr.maxWeightReps) {
          isNewPr = true;
        }
      }

      if (isNewPr) {
        prsBroken++;
        await WorkoutDAO.upsertPersonalRecord({
          clientId: user._id,
          exerciseId: ex.exerciseId || trackingId,
          exerciseName: ex.exerciseName,
          maxWeight: bestSet.weight,
          maxWeightReps: bestSet.reps,
          maxWeightUnit: bestSet.unit,
          workoutSessionId: insertedSession._id,
        });
      }
    }
  }

  if (prsBroken > 0) {
    await WorkoutDAO.updateSessionPrsCount(insertedSession._id, prsBroken);
  }

  // === COMPLETAR PROGRAMA ACTIVO ===
  if (data.type === "PROGRAM") {
    await WorkoutDAO.completeActiveAssignments(user._id);
  }

  // === GAMIFICACIÓN (XP Y VOLUMEN CON LÓGICA DE DOMINIO) ===
  let totalVolume = 0;
  for (const ex of data.exercises) {
    totalVolume += calculateVolumeLoad(ex.sets);
  }

  if (totalVolume > 0) {
    const db = await getDb();
    await db.collection("profiles").updateOne(
      { userId: user._id },
      {
        $inc: {
          lifetimeVolume: totalVolume,
          totalXp: Math.floor(totalVolume * 0.1),
        },
      }
    );
  }

  revalidatePath("/entrenamiento");
  revalidatePath("/dashboard");
  return { success: true, sessionId: sessionPublicId };
}

export async function getWorkoutHistory(limit = 10) {
  const session = await getSession();
  if (!session) return [];

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) return [];

  const history = await WorkoutDAO.getSessionsForClient(user._id, limit);

  return history.map((h: any) => ({
    ...h,
    _id: h._id.toString(),
    clientId: h.clientId.toString(),
  }));
}

export async function getExercisePRs(exerciseId: string) {
  const session = await getSession();
  if (!session) return null;

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) return null;

  const pr = await WorkoutDAO.getPersonalRecord(user._id, exerciseId);
  if (!pr) return null;

  return {
    ...pr,
    _id: pr._id.toString(),
    clientId: pr.clientId.toString(),
    workoutSessionId: pr.workoutSessionId?.toString() || "",
  };
}
