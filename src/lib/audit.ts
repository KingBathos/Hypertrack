import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export async function logSecurityAction(
  actorId: ObjectId | string,
  actionType: string,
  targetId: ObjectId | string,
  metadata: Record<string, any>
) {
  try {
    const db = await getDb();
    const auditColl = db.collection("audit_logs");

    await auditColl.insertOne({
      timestamp: new Date(),
      actorId,
      action: actionType,
      targetId,
      details: metadata
    });
  } catch (error) {
    console.error("[Audit Error] Falla al registrar auditoría:", error);
  }
}
