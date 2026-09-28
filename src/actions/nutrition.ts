"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(13).toString("hex").toUpperCase()}`;
}

export async function logMeal(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Acceso Denegado: No autenticado");
  }

  const db = await getDb();
  const usersCol = db.collection("users");
  const user = await usersCol.findOne({ publicId: session.sub });
  if (!user) throw new Error("Usuario no encontrado");

  const newMeal = {
    userId: user._id,
    mealType: formData.get("mealType")?.toString() || "Desayuno",
    name: formData.get("name")?.toString() || "Comida",
    calories: Number(formData.get("calories")),
    protein: Number(formData.get("protein")),
    carbs: Number(formData.get("carbs")),
    fats: Number(formData.get("fats")),
    loggedAt: new Date()
  };

  await db.collection("meal_logs").insertOne(newMeal as any);

  revalidatePath("/dashboard");
}
