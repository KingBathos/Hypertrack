"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await getSession();
  
  // Security check
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const newRole = formData.get("role")?.toString();
  if (!newRole || !["USER", "COACH", "NUTRITIONIST", "ADMIN"].includes(newRole)) {
    throw new Error("Invalid role");
  }

  const db = await getDb();
  await db.collection("users").updateOne(
    { publicId: userId },
    { $set: { role: newRole } }
  );

  revalidatePath("/admin");
}

export async function deleteExercise(publicId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");
  
  const db = await getDb();
  await db.collection("exercise_library").deleteOne({ publicId });
  revalidatePath("/admin/exercises");
}

export async function addExercise(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Unauthorized");

  const db = await getDb();
  const name = formData.get("name")?.toString();
  const primaryMuscle = formData.get("primaryMuscle")?.toString();
  const mechanic = formData.get("mechanic")?.toString();
  const equipment = formData.get("equipment")?.toString();

  if (!name || !primaryMuscle || !mechanic || !equipment) {
    throw new Error("Missing fields");
  }

  const { randomBytes } = await import("crypto");
  const publicId = "exe_" + randomBytes(13).toString("hex").toUpperCase();
  const now = new Date();

  await db.collection("exercise_library").insertOne({
    publicId,
    name,
    primaryMuscle,
    mechanic,
    equipment,
    status: "ACTIVE",
    audit: { createdAt: now, updatedAt: now }
  });

  revalidatePath("/admin/exercises");
}
