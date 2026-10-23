/**
 * src/lib/dao/workout.dao.ts
 *
 * Data Access Object (DAO) para el dominio de Entrenamiento.
 * Encapsula colecciones:
 * - `exercise_library`
 * - `training_programs`
 * - `program_assignments`
 * - `workout_templates`
 * - `workout_sessions`
 * - `personal_records`
 */

import { ObjectId } from "mongodb";
import { BaseDAO } from "./base.dao";
import { calculateEpley1RM } from "../domain/biomechanics";
import type {
  WorkoutSessionDocument,
  PersonalRecordDocument,
  WorkoutTemplateDocument,
  ProgramAssignmentDocument,
  WeightUnit,
} from "../../types/workout";

export interface CreateProgramDTO {
  authorId: ObjectId;
  name: string;
  description?: string;
  goal?: string;
  level?: string;
  exercises: Array<{
    exerciseId?: string;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    targetRpe?: number;
    restSeconds?: number;
  }>;
}

export interface WorkoutTemplateDTO {
  clientId: ObjectId;
  name: string;
  notes?: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    targetReps: string | number;
    targetRpe?: number;
    targetRestSeconds?: number;
  }>;
}

export interface RecordWorkoutSessionDTO {
  clientId: ObjectId;
  publicId: string;
  type: "FREE" | "PROGRAM";
  name: string;
  notes?: string;
  startedAt: Date;
  finishedAt: Date;
  durationMinutes: number;
  exercises: any[];
}

class WorkoutDAOImpl extends BaseDAO<any> {
  constructor() {
    super("workout_sessions");
  }

  // ─────────────────────────────────────────────
  // 1. Biblioteca de Ejercicios
  // ─────────────────────────────────────────────

  async getAllExercises() {
    const db = await this.getDatabase();
    return db.collection("exercise_library").find().toArray();
  }

  async insertExercises(exercises: any[]) {
    const db = await this.getDatabase();
    return db.collection("exercise_library").insertMany(exercises);
  }

  async addExercise(data: {
    publicId: string;
    name: string;
    primaryMuscle: string;
    mechanic: string;
    equipment: string;
    status?: string;
  }) {
    const db = await this.getDatabase();
    const now = new Date();
    return db.collection("exercise_library").insertOne({
      publicId: data.publicId,
      name: data.name,
      primaryMuscle: data.primaryMuscle,
      mechanic: data.mechanic,
      equipment: data.equipment,
      status: data.status || "ACTIVE",
      audit: { createdAt: now, updatedAt: now },
    });
  }

  async deleteExercise(publicId: string) {
    const db = await this.getDatabase();
    return db.collection("exercise_library").deleteOne({ publicId });
  }

  // ─────────────────────────────────────────────
  // 2. Programas de Entrenamiento
  // ─────────────────────────────────────────────

  async createTrainingProgram(data: CreateProgramDTO, publicId: string) {
    const db = await this.getDatabase();
    const now = new Date();
    const doc = {
      publicId,
      authorId: data.authorId,
      name: data.name,
      description: data.description || "Programa creado en portal",
      goal: data.goal || "HYPERTROPHY",
      level: data.level || "INTERMEDIATE",
      status: "ACTIVE",
      exercises: data.exercises.map((e, index) => ({
        order: index,
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        targetSets: Number(e.targetSets) || 3,
        targetReps: Number(e.targetReps) || 10,
        targetRpe: Number(e.targetRpe) || 8,
        restSeconds: e.restSeconds || 90,
      })),
      audit: { createdAt: now, updatedAt: now, createdBy: data.authorId },
    };

    await db.collection("training_programs").insertOne(doc);
    return doc;
  }

  async findProgramByPublicId(publicId: string) {
    const db = await this.getDatabase();
    return db.collection("training_programs").findOne({ publicId });
  }

  async findProgramsByAuthor(authorId: ObjectId) {
    const db = await this.getDatabase();
    return db.collection("training_programs").find({ authorId }).sort({ "audit.createdAt": -1 }).toArray();
  }

  // ─────────────────────────────────────────────
  // 3. Asignación de Programas
  // ─────────────────────────────────────────────

  async completeActiveAssignments(clientId: ObjectId) {
    const db = await this.getDatabase();
    return db.collection("program_assignments").updateMany(
      { clientId, status: "ACTIVE" },
      { $set: { status: "COMPLETED", endDate: new Date() } }
    );
  }

  async assignProgram(assignment: {
    publicId: string;
    clientId: ObjectId;
    coachId: ObjectId;
    programVersionId: ObjectId;
  }) {
    const db = await this.getDatabase();
    const now = new Date();
    const doc: ProgramAssignmentDocument = {
      publicId: assignment.publicId,
      clientId: assignment.clientId,
      coachId: assignment.coachId,
      programVersionId: assignment.programVersionId,
      status: "ACTIVE",
      startDate: now,
      audit: {
        createdAt: now,
        createdBy: assignment.coachId,
        updatedAt: now,
      },
    };

    await db.collection("program_assignments").insertOne(doc as any);
    return doc;
  }

  async getActiveAssignment(clientId: ObjectId) {
    const db = await this.getDatabase();
    return db.collection("program_assignments").findOne({ clientId, status: "ACTIVE" });
  }

  // ─────────────────────────────────────────────
  // 4. Plantillas de Atleta Libre
  // ─────────────────────────────────────────────

  async createWorkoutTemplate(data: WorkoutTemplateDTO, publicId: string) {
    const db = await this.getDatabase();
    const now = new Date();
    const doc: WorkoutTemplateDocument = {
      publicId,
      clientId: data.clientId,
      name: data.name,
      notes: data.notes,
      exercises: data.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        targetSets: Number(e.targetSets) || 3,
        targetReps: e.targetReps || "10",
        targetRpe: e.targetRpe ? Number(e.targetRpe) : undefined,
        targetRestSeconds: e.targetRestSeconds ? Number(e.targetRestSeconds) : 90,
      })),
      audit: { createdAt: now, updatedAt: now },
    };

    await db.collection("workout_templates").insertOne(doc as any);
    return doc;
  }

  async getUserTemplates(clientId: ObjectId) {
    const db = await this.getDatabase();
    return db
      .collection("workout_templates")
      .find({ clientId })
      .sort({ "audit.createdAt": -1 })
      .toArray();
  }

  // ─────────────────────────────────────────────
  // 5. Sesiones de Entrenamiento y Récords Personales (PRs)
  // ─────────────────────────────────────────────

  async insertWorkoutSession(sessionData: RecordWorkoutSessionDTO) {
    const db = await this.getDatabase();
    const doc = {
      ...sessionData,
      prsBroken: 0,
      metadata: { schemaVersion: 1, source: "web" },
      audit: { createdAt: new Date(), updatedAt: new Date() },
    };

    const result = await db.collection("workout_sessions").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async updateSessionPrsCount(sessionId: ObjectId, prsCount: number) {
    const db = await this.getDatabase();
    return db.collection("workout_sessions").updateOne(
      { _id: sessionId },
      { $set: { prsBroken: prsCount, "audit.updatedAt": new Date() } }
    );
  }

  async getPersonalRecord(clientId: ObjectId, exerciseTrackingId: string) {
    const db = await this.getDatabase();
    return db.collection("personal_records").findOne({
      clientId,
      $or: [{ exerciseId: exerciseTrackingId }, { exerciseName: exerciseTrackingId }],
    });
  }

  async upsertPersonalRecord(prDoc: {
    clientId: ObjectId;
    exerciseId: string;
    exerciseName: string;
    maxWeight: number;
    maxWeightReps: number;
    maxWeightUnit: WeightUnit;
    workoutSessionId: ObjectId;
  }) {
    const db = await this.getDatabase();
    const estimated1RM = calculateEpley1RM(prDoc.maxWeight, prDoc.maxWeightReps);
    const now = new Date();

    return db.collection("personal_records").updateOne(
      {
        clientId: prDoc.clientId,
        $or: [{ exerciseId: prDoc.exerciseId }, { exerciseName: prDoc.exerciseName }],
      },
      {
        $set: {
          clientId: prDoc.clientId,
          exerciseId: prDoc.exerciseId,
          exerciseName: prDoc.exerciseName,
          maxWeight: prDoc.maxWeight,
          maxWeightReps: prDoc.maxWeightReps,
          maxWeightUnit: prDoc.maxWeightUnit,
          estimated1RM,
          dateAchieved: now,
          workoutSessionId: prDoc.workoutSessionId,
          "audit.updatedAt": now,
        },
        $setOnInsert: {
          "audit.createdAt": now,
        },
      },
      { upsert: true }
    );
  }

  async getPersonalRecordsForClient(clientId: ObjectId) {
    const db = await this.getDatabase();
    return db
      .collection("personal_records")
      .find({ clientId })
      .sort({ maxWeight: -1 })
      .toArray();
  }

  async getSessionsForClient(clientId: ObjectId, limit: number = 20) {
    const db = await this.getDatabase();
    return db
      .collection("workout_sessions")
      .find({ clientId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .toArray();
  }
}

export const WorkoutDAO = new WorkoutDAOImpl();
