"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { logSecurityAction } from "@/lib/audit";

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(13).toString("hex").toUpperCase()}`;
}

export async function setNutritionProtocol(clientIdStr: string, formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== "NUTRITIONIST" && session.role !== "ADMIN")) {
    throw new Error("Acceso Denegado: Se requiere rol NUTRITIONIST o ADMIN");
  }

  const db = await getDb();
  const usersCol = db.collection("users");
  
  // Buscar al cliente
  const clientUser = await usersCol.findOne({ publicId: clientIdStr });
  if (!clientUser) throw new Error("Cliente no encontrado");

  // Parsear macros
  const dailyCalories = Number(formData.get("dailyCalories")) || 0;
  const protein = Number(formData.get("protein")) || 0;
  const carbs = Number(formData.get("carbs")) || 0;
  const fats = Number(formData.get("fats")) || 0;
  const now = new Date();

  const nutritionistUser = await usersCol.findOne({ publicId: session.sub });
  const nutritionistId = nutritionistUser?._id || null;

  // Inactivar planes anteriores de este cliente
  await db.collection("nutrition_plans").updateMany(
    { clientId: clientUser._id, status: "ACTIVE" },
    { $set: { status: "ARCHIVED", "audit.updatedAt": now } }
  );

  const newPlan = {
    publicId: generateId("npl"),
    clientId: clientUser._id,
    nutritionistId,
    status: "ACTIVE",
    targets: {
      dailyCalories,
      macros: { protein, carbs, fats }
    },
    metadata: {
      schemaVersion: 1,
      notes: "Asignado por nutricionista vía web."
    },
    audit: {
      createdAt: now,
      updatedAt: now
    }
  };

  await db.collection("nutrition_plans").insertOne(newPlan as any);

  // Registrar auditoría de seguridad
  await logSecurityAction(session.sub, "UPDATE_NUTRITION", clientUser._id, {
    newTargets: newPlan.targets
  });

  revalidatePath("/dashboard");
  revalidatePath(`/nutritionist/${clientIdStr}`);
  // Redireccionamos al mismo dashboard del cliente para ver los cambios reflejados
  redirect(`/nutritionist/${clientIdStr}`);
}
