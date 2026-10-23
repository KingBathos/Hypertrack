"use server";

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { ulid } from "ulid";
import { biometricsSchema } from "@/lib/schemas/profile.schema";
import { UserDAO } from "@/lib/dao/user.dao";
import { ProfileDAO } from "@/lib/dao/profile.dao";
import { calculateWHR } from "@/lib/domain/biometrics";
import { logSecurityAction } from "@/lib/audit";

export async function linkProfessional(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Acceso Denegado: No autenticado");
  }

  const professionalId = formData.get("professionalId")?.toString().trim();
  const roleType = formData.get("roleType")?.toString(); // "COACH" or "NUTRITIONIST"

  if (!roleType || (roleType !== "COACH" && roleType !== "NUTRITIONIST")) {
    throw new Error("Rol inválido especificado.");
  }

  const user = await UserDAO.findByPublicId(session.sub);
  if (!user) throw new Error("Usuario no encontrado.");

  const updateField = roleType === "COACH" ? "coachId" : "nutritionistId";

  // Si professionalId viene vacío, es una acción de DESVINCULAR
  if (!professionalId) {
    await UserDAO.unlinkProfessional(user._id, updateField);
    await logSecurityAction(session.sub, "UNLINK_PROFESSIONAL", user._id, { roleType });
    revalidatePath("/profile");
    return;
  }

  // Validate that the professional exists and has the correct role
  const professional = await UserDAO.findByPublicId(professionalId);
  if (!professional) {
    throw new Error("El profesional indicado no existe.");
  }

  if (professional.role !== roleType) {
    throw new Error(`El usuario indicado no es un ${roleType}.`);
  }

  // Update user profile with the new professional link
  await UserDAO.linkProfessional(user._id, updateField, professionalId);
  await logSecurityAction(session.sub, "LINK_PROFESSIONAL", user._id, {
    roleType,
    professionalId,
  });

  revalidatePath("/profile");
}

export async function logBiometrics(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Acceso Denegado: No autenticado" };
  }

  const payload = {
    weight: Number(formData.get("weight")),
    bodyFatPercentage: formData.get("bodyFatPercentage")
      ? Number(formData.get("bodyFatPercentage"))
      : undefined,
    waistCm: formData.get("waistCm") ? Number(formData.get("waistCm")) : undefined,
    hipCm: formData.get("hipCm") ? Number(formData.get("hipCm")) : undefined,
    chestCm: formData.get("chestCm") ? Number(formData.get("chestCm")) : undefined,
    armCm: formData.get("armCm") ? Number(formData.get("armCm")) : undefined,
    thighCm: formData.get("thighCm") ? Number(formData.get("thighCm")) : undefined,
    calfCm: formData.get("calfCm") ? Number(formData.get("calfCm")) : undefined,
  };

  const validatedFields = biometricsSchema.safeParse(payload);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Datos inválidos.",
      details: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const user = await UserDAO.findByPublicId(session.sub);
    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Construir circunferencias (solo las proporcionadas)
    const circumferences: Record<string, number> = {};
    if (validatedFields.data.waistCm) circumferences.waistCm = validatedFields.data.waistCm;
    if (validatedFields.data.hipCm) circumferences.hipCm = validatedFields.data.hipCm;
    if (validatedFields.data.chestCm) circumferences.chestCm = validatedFields.data.chestCm;
    if (validatedFields.data.armCm) circumferences.armCm = validatedFields.data.armCm;
    if (validatedFields.data.thighCm) circumferences.thighCm = validatedFields.data.thighCm;
    if (validatedFields.data.calfCm) circumferences.calfCm = validatedFields.data.calfCm;

    // Calcular ratio cintura/cadera usando el módulo de dominio puro
    let waistToHipRatio: number | undefined;
    if (circumferences.waistCm && circumferences.hipCm) {
      waistToHipRatio = calculateWHR(circumferences.waistCm, circumferences.hipCm);
    }

    // Insertar en body_measurements a través de ProfileDAO
    await ProfileDAO.insertMeasurement({
      publicId: `mes_${ulid()}`,
      userId: user._id,
      weight: validatedFields.data.weight,
      bodyFatPercentage: validatedFields.data.bodyFatPercentage,
      circumferences,
      waistToHipRatio,
      date: new Date(),
    });

    // Actualizar métricas físicas en el perfil principal
    await ProfileDAO.updatePhysicalMetrics(user._id, {
      weightKg: validatedFields.data.weight,
      bodyFatPercentage: validatedFields.data.bodyFatPercentage,
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("[logBiometrics Action] Error:", error);
    return { success: false, error: "Error interno al guardar los datos." };
  }
}
