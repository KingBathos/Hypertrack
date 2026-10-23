"use server";

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { UserDAO } from "@/lib/dao/user.dao";
import { NutritionDAO } from "@/lib/dao/nutrition.dao";

export async function logMeal(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Acceso Denegado: No autenticado");
  }

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) throw new Error("Usuario no encontrado");

  await NutritionDAO.insertMealLog({
    userId: user._id,
    mealType: formData.get("mealType")?.toString() || "Desayuno",
    name: formData.get("name")?.toString() || "Comida",
    calories: Number(formData.get("calories")) || 0,
    protein: Number(formData.get("protein")) || 0,
    carbs: Number(formData.get("carbs")) || 0,
    fats: Number(formData.get("fats")) || 0,
    loggedAt: new Date(),
  });

  revalidatePath("/dashboard");
}
