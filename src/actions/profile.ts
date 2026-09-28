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

    // Insertar en body_measurements
    const newMeasurement = {
      publicId: `mes_${ulid()}`,
      clientId: user._id,
      logDate: new Date(),
      metrics: {
        weightKg: validatedFields.data.weight,
        ...(validatedFields.data.bodyFatPercentage ? { bodyFatPercentage: validatedFields.data.bodyFatPercentage } : {})
      },
      audit: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await db.collection("body_measurements").insertOne(newMeasurement);

    // Actualizar también en el perfil para tener la foto más reciente siempre a la mano
    await db.collection("profiles").updateOne(
      { userId: user._id },
      { $set: { "physical.weightKg": validatedFields.data.weight, "audit.updatedAt": new Date() } }
    );

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { success: true };
  } catch (error) {
    console.error("[logBiometrics Action] Error:", error);
    return { success: false, error: "Error interno al guardar los datos." };
  }
}
