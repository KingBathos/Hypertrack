/**
 * src/lib/dao/audit.dao.ts
 *
 * Data Access Object (DAO) para la colección `audit_logs`.
 * Provee persistencia estructurada para trazabilidad forense, eventos de seguridad
 * y registro de cambios administrativos.
 */

import { ObjectId } from "mongodb";
import { BaseDAO } from "./base.dao";

export interface AuditLogDocument {
  _id?: ObjectId;
  timestamp: Date;
  actorId: ObjectId | string;
  action: string;
  targetId: ObjectId | string;
  details: Record<string, any>;
}

class AuditDAOImpl extends BaseDAO<AuditLogDocument> {
  constructor() {
    super("audit_logs");
  }

  /**
   * Registra un evento de seguridad o auditoría administrativa.
   */
  async logAction(
    actorId: ObjectId | string,
    action: string,
    targetId: ObjectId | string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const coll = await this.getCollection();
      await coll.insertOne({
        timestamp: new Date(),
        actorId,
        action,
        targetId,
        details,
      });
    } catch (error) {
      console.error("[AuditDAO Error] No se pudo registrar la acción de auditoría:", error);
    }
  }

  /**
   * Obtiene los eventos de auditoría más recientes para el centro de comando de administración.
   */
  async getRecentLogs(limit: number = 50): Promise<AuditLogDocument[]> {
    const coll = await this.getCollection();
    return coll.find().sort({ timestamp: -1 }).limit(limit).toArray();
  }

  /**
   * Obtiene el historial de eventos que involucran a un actor o target específico.
   */
  async getLogsByActorOrTarget(identifier: string | ObjectId, limit: number = 30): Promise<AuditLogDocument[]> {
    const coll = await this.getCollection();
    return coll
      .find({
        $or: [{ actorId: identifier }, { targetId: identifier }],
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }
}

export const AuditDAO = new AuditDAOImpl();
