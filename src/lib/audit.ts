import { ObjectId } from "mongodb";
import { AuditDAO } from "./dao/audit.dao";

export async function logSecurityAction(
  actorId: ObjectId | string,
  actionType: string,
  targetId: ObjectId | string,
  metadata: Record<string, any>
) {
  await AuditDAO.logAction(actorId, actionType, targetId, metadata);
}
