"use server";

import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { revalidatePath } from "next/cache";
import { ulid } from "ulid";
import { biometricsSchema } from "@/lib/schemas/profile.schema";

export async function linkProfessional(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error("Acceso Denegado: No autenticado");
  }

  const professionalId = formData.get("professionalId")?.toString().trim();
  const roleType = formData.get("roleType")?.toString(); // "COACH" or "NUTRITIONIST"

  if (!roleType) {
    throw new Error("Rol inválido.");
  }

  const db = await getDb();
  const usersCollection = db.collection("users");

  // Validate that the user exists
  const user = await usersCollection.findOne({ publicId: session.sub });
  if (!user) throw new Error("Usuario no encontrado.");

  const updateField = roleType === "COACH" ? "coachId" : "nutritionistId";

  // Si professionalId viene vacío, es una acción de DESVINCULAR
  if (!professionalId) {
    await usersCollection.updateOne(
      { _id: user._id },
      { $unset: { [updateField]: "" } }
    );
    revalidatePath("/profile");
    return;
  }

  // Validate that the professional exists and has the correct role
  const professional = await usersCollection.findOne({ publicId: professionalId });
  if (!professional) {
    throw new Error("El profesional indicado no existe.");
  }
  
  if (professional.role !== roleType) {
    throw new Error(`El usuario indicado no es un ${roleType}.`);
  }

  // Update user profile with the new professional link
  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { [updateField]: professionalId } }
  );

  revalidatePath("/profile");
}

export async function logBiometrics(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Acceso Denegado: No autenticado" };
  }

  const payload = {
    weight: Number(formData.get("weight")),
    bodyFatPercentage: formData.get("bodyFatPercentage") ? Number(formData.get("bodyFatPercentage")) : undefined,
    waistCm: formData.get("waistCm") ? Number(formData.get("waistCm")) : undefined,
    hipCm: formData.get("hipCm") ? Number(formData.get("hipCm")) : undefined,
    chestCm: formData.get("chestCm") ? Number(formData.get("chestCm")) : undefined,
    armCm: formData.get("armCm") ? Number(formData.get("armCm")) : undefined,
    thighCm: formData.get("thighCm") ? Number(formData.get("thighCm")) : undefined,
    calfCm: formData.get("calfCm") ? Number(formData.get("calfCm")) : undefined,
  };

  const validatedFields = biometricsSchema.safeParse(payload);
  
  if (!validatedFields.success) {
    return { success: false, error: "Datos inválidos.", details: validatedFields.error.flatten().fieldErrors };
  }

  try {
    const db = await getDb();
    
    // Validar usuario
    const user = await db.collection("users").findOne({ publicId: session.sub });
    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Construir circunferencias (solo las que se proporcionaron)
    const circumferences: Record<string, number> = {};
    if (validatedFields.data.waistCm) circumferences.waistCm = validatedFields.data.waistCm;
    if (validatedFields.data.hipCm) circumferences.hipCm = validatedFields.data.hipCm;
    if (validatedFields.data.chestCm) circumferences.chestCm = validatedFields.data.chestCm;
    if (validatedFields.data.armCm) circumferences.armCm = validatedFields.data.armCm;
    if (validatedFields.data.thighCm) circumferences.thighCm = validatedFields.data.thighCm;
    if (validatedFields.data.calfCm) circumferences.calfCm = validatedFields.data.calfCm;

    // Calcular ratio cintura/cadera automáticamente
    let waistToHipRatio: number | undefined;
    if (circumferences.waistCm && circumferences.hipCm) {
      waistToHipRatio = Math.round((circumferences.waistCm / circumferences.hipCm) * 100) / 100;
    }

    // Insertar en body_measurements
    const newMeasurement = {
      publicId: `mes_${ulid()}`,
      userId: user._id,
      weight: validatedFields.data.weight,
      ...(validatedFields.data.bodyFatPercentage ? { bodyFatPercentage: validatedFields.data.bodyFatPercentage } : {}),
      ...(Object.keys(circumferences).length > 0 ? { circumferences } : {}),
      ...(waistToHipRatio ? { waistToHipRatio } : {}),
      date: new Date(),
      audit: {
        createdAt: new Date(),
      }
    };

    await db.collection("body_measurements").insertOne(newMeasurement);

    // Actualizar también en el perfil para tener la foto más reciente siempre a la mano
    const profileUpdate: Record<string, any> = {
      "physical.weightKg": validatedFields.data.weight,
      "audit.updatedAt": new Date(),
    };
    if (validatedFields.data.bodyFatPercentage) {
      profileUpdate["physical.bodyFatPercentage"] = validatedFields.data.bodyFatPercentage;
    }

    await db.collection("profiles").updateOne(
      { userId: user._id },
      { $set: profileUpdate }
    );

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("[logBiometrics Action] Error:", error);
    return { success: false, error: "Error interno al guardar los datos." };
  }
}
