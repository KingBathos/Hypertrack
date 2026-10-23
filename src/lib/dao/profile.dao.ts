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
    const updateFields: Record<string, any> = {
      "audit.updatedAt": new Date(),
    };

    if (metrics.weightKg !== undefined) {
      updateFields["physical.weightKg"] = metrics.weightKg;
    }
    if (metrics.bodyFatPercentage !== undefined) {
      updateFields["physical.bodyFatPercentage"] = metrics.bodyFatPercentage;
    }

    return db.collection("profiles").updateOne({ userId }, { $set: updateFields });
  }

  async insertMeasurement(data: BodyMeasurementDTO) {
    const db = await this.getDatabase();
    const doc = {
      publicId: data.publicId,
      userId: data.userId,
      weight: data.weight,
      ...(data.bodyFatPercentage !== undefined ? { bodyFatPercentage: data.bodyFatPercentage } : {}),
      ...(data.circumferences && Object.keys(data.circumferences).length > 0
        ? { circumferences: data.circumferences }
        : {}),
      ...(data.waistToHipRatio !== undefined ? { waistToHipRatio: data.waistToHipRatio } : {}),
      date: data.date || new Date(),
      audit: {
        createdAt: new Date(),
      },
    };

    return db.collection("body_measurements").insertOne(doc);
  }

  async getLatestMeasurements(userId: ObjectId, limit: number = 10) {
    const db = await this.getDatabase();
    return db
      .collection("body_measurements")
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
  }
}

export const ProfileDAO = new ProfileDAOImpl();
