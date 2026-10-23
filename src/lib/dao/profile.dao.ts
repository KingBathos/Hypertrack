/**
 * src/lib/dao/profile.dao.ts
 *
 * Data Access Object (DAO) para las colecciones:
 * - `profiles`
 * - `body_measurements`
 */

import { ObjectId } from "mongodb";
import { BaseDAO } from "./base.dao";

export interface BodyMeasurementDTO {
  publicId: string;
  userId: ObjectId;
  weight: number;
  bodyFatPercentage?: number;
  circumferences?: Record<string, number>;
  waistToHipRatio?: number;
  date?: Date;
}

class ProfileDAOImpl extends BaseDAO<any> {
  constructor() {
    super("profiles");
  }

  async findProfileByUserId(userId: ObjectId) {
    const db = await this.getDatabase();
    return db.collection("profiles").findOne({ userId });
  }

  async findProfileByPhone(phone: string) {
    const db = await this.getDatabase();
    return db.collection("profiles").findOne({ "contact.phone": phone }, { projection: { _id: 1 } });
  }

  async insertProfile(profileDoc: any) {
    const db = await this.getDatabase();
    return db.collection("profiles").insertOne(profileDoc);
  }

  async updatePhysicalMetrics(
    userId: ObjectId,
    metrics: { weightKg?: number; bodyFatPercentage?: number }
  ) {
    const db = await this.getDatabase();
    const now = new Date();
    const updateFields: Record<string, any> = {
      "audit.updatedAt": now,
    };

    if (metrics.weightKg !== undefined) {
      updateFields["physical.weightKg"] = metrics.weightKg;
    }
    if (metrics.bodyFatPercentage !== undefined) {
      updateFields["physical.bodyFatPercentage"] = metrics.bodyFatPercentage;
    }

    return db.collection("profiles").updateOne(
      { userId },
      {
        $set: updateFields,
        $setOnInsert: {
          userId,
          "audit.createdAt": now,
        },
      },
      { upsert: true }
    );
  }

  async insertMeasurement(data: BodyMeasurementDTO) {
    const db = await this.getDatabase();
    const now = data.date || new Date();
    const objectIdUser = this.requireObjectId(data.userId, "userId");

    // Construir circunferencias BSON compatibles con el validador de MongoDB
    const circumferencesCm: Record<string, number> = {};
    if (data.circumferences) {
      if (data.circumferences.waistCm && data.circumferences.waistCm >= 40) circumferencesCm.waist = data.circumferences.waistCm;
      if (data.circumferences.chestCm && data.circumferences.chestCm >= 50) circumferencesCm.chest = data.circumferences.chestCm;
      if (data.circumferences.armCm && data.circumferences.armCm >= 15) {
        circumferencesCm.leftArm = data.circumferences.armCm;
        circumferencesCm.rightArm = data.circumferences.armCm;
      }
      if (data.circumferences.calfCm && data.circumferences.calfCm >= 20) circumferencesCm.calves = data.circumferences.calfCm;
    }

    const doc: Record<string, any> = {
      publicId: data.publicId,
      clientId: objectIdUser,     // Requerido por el validador $jsonSchema de MongoDB
      userId: objectIdUser,       // Retrocompatibilidad
      logDate: now,               // Requerido por el validador $jsonSchema
      date: now,                  // Retrocompatibilidad
      weight: data.weight,        // Retrocompatibilidad
      bodyFatPercentage: data.bodyFatPercentage ?? null,
      metrics: {                  // Requerido por el validador $jsonSchema
        weightKg: data.weight,
        bodyFatPercentage: data.bodyFatPercentage ?? null,
      },
      ...(Object.keys(circumferencesCm).length > 0 ? { circumferencesCm } : {}),
      ...(data.circumferences && Object.keys(data.circumferences).length > 0 ? { circumferences: data.circumferences } : {}),
      ...(data.waistToHipRatio !== undefined ? { waistToHipRatio: data.waistToHipRatio } : {}),
      audit: {                    // Requerido por el validador $jsonSchema: createdAt y updatedAt
        createdAt: now,
        updatedAt: now,
      },
    };

    return db.collection("body_measurements").insertOne(doc);
  }

  async getLatestMeasurements(userId: ObjectId, limit: number = 10) {
    const db = await this.getDatabase();
    return db
      .collection("body_measurements")
      .find({
        $or: [{ clientId: userId }, { userId: userId }],
      })
      .sort({ logDate: -1, date: -1 })
      .limit(limit)
      .toArray();
  }
}

export const ProfileDAO = new ProfileDAOImpl();
