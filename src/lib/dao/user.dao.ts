/**
 * src/lib/dao/user.dao.ts
 *
 * Data Access Object (DAO) para la colección `users` y operaciones de identidad.
 * Desacopla la lógica de negocio y las Server Actions de las consultas directas a MongoDB.
 */

import { ObjectId, type Filter, type UpdateFilter } from "mongodb";
import { BaseDAO } from "./base.dao";
import type { UserDocument } from "../../types/user";

class UserDAOImpl extends BaseDAO<UserDocument> {
  constructor() {
    super("users");
  }

  /**
   * Busca un usuario por su identificador público único semántico (ej: "usr_01JXXX...").
   */
  async findByPublicId(publicId: string): Promise<UserDocument | null> {
    if (!publicId) return null;
    const coll = await this.getCollection();
    return coll.findOne({ publicId });
  }

  /**
   * Busca un usuario por su BSON ObjectId primario.
   */
  async findById(id: string | ObjectId): Promise<UserDocument | null> {
    const objectId = this.toObjectId(id);
    if (!objectId) return null;
    const coll = await this.getCollection();
    return coll.findOne({ _id: objectId });
  }

  /**
   * Busca un usuario por su email normalizado en minúsculas (previene duplicidad).
   */
  async findByNormalizedEmail(email: string): Promise<UserDocument | null> {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const coll = await this.getCollection();
    return coll.findOne({ "email.normalized": normalized });
  }

  /**
   * Obtiene la lista de usuarios con rol de atleta asignados a un entrenador (Coach).
   */
  async findAthletesByCoachPublicId(coachPublicId: string): Promise<UserDocument[]> {
    if (!coachPublicId) return [];
    const coll = await this.getCollection();
    return coll.find({ coachId: coachPublicId, role: "USER" }).toArray();
  }

  /**
   * Obtiene la lista de usuarios con rol de atleta asignados a un nutricionista.
   */
  async findAthletesByNutritionistPublicId(nutritionistPublicId: string): Promise<UserDocument[]> {
    if (!nutritionistPublicId) return [];
    const coll = await this.getCollection();
    return coll.find({ nutritionistId: nutritionistPublicId, role: "USER" }).toArray();
  }

  /**
   * Vincula un atleta a un Entrenador (Coach).
   */
  async assignCoachToAthlete(athletePublicId: string, coachPublicId: string): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { publicId: athletePublicId },
      {
        $set: {
          coachId: coachPublicId,
          "audit.updatedAt": new Date(),
        },
      }
    );
    return result.matchedCount > 0;
  }

  /**
   * Vincula un atleta a un Nutricionista.
   */
  async assignNutritionistToAthlete(athletePublicId: string, nutritionistPublicId: string): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { publicId: athletePublicId },
      {
        $set: {
          nutritionistId: nutritionistPublicId,
          "audit.updatedAt": new Date(),
        },
      }
    );
    return result.matchedCount > 0;
  }

  /**
   * Vincula un profesional por ObjectId de usuario.
   */
  async linkProfessional(userId: ObjectId, field: "coachId" | "nutritionistId", professionalPublicId: string): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { _id: userId },
      {
        $set: {
          [field]: professionalPublicId,
          "audit.updatedAt": new Date(),
        },
      }
    );
    return result.matchedCount > 0;
  }

  /**
   * Desvincula un profesional (Coach o Nutricionista) de un atleta.
   */
  async unlinkProfessional(userId: ObjectId, field: "coachId" | "nutritionistId"): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { _id: userId },
      {
        $unset: { [field]: "" },
        $set: { "audit.updatedAt": new Date() },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Actualiza el rol de un usuario (operación exclusiva de Administradores).
   */
  async updateRole(
    publicId: string,
    newRole: "USER" | "COACH" | "NUTRITIONIST" | "ADMIN"
  ): Promise<boolean> {
    const coll = await this.getCollection();
    const result = await coll.updateOne(
      { publicId },
      {
        $set: {
          role: newRole,
          "audit.updatedAt": new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Registra un nuevo intento fallido de login y bloquea la cuenta si excede el umbral.
   */
  async incrementFailedLoginAttempts(publicId: string, maxAttempts: number = 5): Promise<void> {
    const coll = await this.getCollection();
    const user = await coll.findOne({ publicId });
    if (!user) return;

    const currentAttempts = (user.authentication.failedAttempts || 0) + 1;
    const lockUntil = currentAttempts >= maxAttempts ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await coll.updateOne(
      { publicId },
      {
        $set: {
          "authentication.failedAttempts": currentAttempts,
          "authentication.lockedUntil": lockUntil,
          ...(lockUntil ? { "account.status": "LOCKED" as const } : {}),
          "audit.updatedAt": new Date(),
        },
      }
    );
  }

  /**
   * Restablece los intentos fallidos tras un login exitoso y actualiza `lastLoginAt`.
   */
  async recordSuccessfulLogin(publicId: string): Promise<void> {
    const coll = await this.getCollection();
    await coll.updateOne(
      { publicId },
      {
        $set: {
          "authentication.failedAttempts": 0,
          "authentication.lockedUntil": null,
          "account.status": "ACTIVE",
          "audit.lastLoginAt": new Date(),
          "audit.updatedAt": new Date(),
        },
      }
    );
  }
}

export const UserDAO = new UserDAOImpl();
