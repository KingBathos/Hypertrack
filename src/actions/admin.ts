"use server";

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { UserDAO } from "@/lib/dao/user.dao";
import { WorkoutDAO } from "@/lib/dao/workout.dao";
import { logSecurityAction } from "@/lib/audit";

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await getSession();

  // Security check: RBAC perimetral a nivel de servidor
  if (!session || session.role !== "ADMIN") {
    throw new Error("Acceso denegado: Se requiere rol de Administrador");
  }

  const newRole = formData.get("role")?.toString();
  if (!newRole || !["USER", "COACH", "NUTRITIONIST", "ADMIN"].includes(newRole)) {
    throw new Error("Rol inválido especificado");
  }

  await UserDAO.updateRole(userId, newRole as any);

  await logSecurityAction(session.sub, "UPDATE_USER_ROLE", userId, {
    assignedRole: newRole,
  });

  revalidatePath("/admin");
}

export async function deleteExercise(publicId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Acceso denegado: Se requiere rol de Administrador");
  }

  await WorkoutDAO.deleteExercise(publicId);

  await logSecurityAction(session.sub, "DELETE_EXERCISE", publicId, {});

  revalidatePath("/admin/exercises");
}

export async function addExercise(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Acceso denegado: Se requiere rol de Administrador");
  }

  const name = formData.get("name")?.toString();
  const primaryMuscle = formData.get("primaryMuscle")?.toString();
  const mechanic = formData.get("mechanic")?.toString();
  const equipment = formData.get("equipment")?.toString();

  if (!name || !primaryMuscle || !mechanic || !equipment) {
    throw new Error("Faltan campos obligatorios para registrar el ejercicio");
  }

  const { randomBytes } = await import("crypto");
  const publicId = "exe_" + randomBytes(13).toString("hex").toUpperCase();

  await WorkoutDAO.addExercise({
    publicId,
    name,
    primaryMuscle,
    mechanic,
    equipment,
  });

  await logSecurityAction(session.sub, "CREATE_EXERCISE", publicId, { name });

  revalidatePath("/admin/exercises");
}
