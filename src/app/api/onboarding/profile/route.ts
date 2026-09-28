import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { profileApiSchema } from "@/lib/schemas/profile.schema";
import { generatePublicId } from "@/lib/utils/id";
import type { ProfileDocument, ProfileResponse } from "@/types/profile";
import type { UserDocument } from "@/types/user";
import type { ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// POST /api/onboarding/profile
// Estructura del documento alineada al $jsonSchema físico de `profiles`
// ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Parsear y validar
    const body = await request.json();
    const parsed = profileApiSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field].push(issue.message);
      }
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Datos del perfil inválidos.", details: fieldErrors },
        },
        { status: 422 }
      );
    }

    const {
      userId: userPublicId, // publicId del usuario (usr_ULID)
      firstName,
      lastName,
      sex,
      birthDate,
      phone,
      heightCm,
      weightKg,
      primaryGoal,
      measurementSystem,
      activityLevel,
      trainingExperience,
      trainingFrequencyDays,
      sleepHoursAvg,
    } = parsed.data;

    // 2. Conectar
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>("users");
    const profilesCollection = db.collection<ProfileDocument>("profiles");

    // 3. Buscar usuario por publicId → obtener su ObjectId (_id)
    const userDoc = await usersCollection.findOne(
      { publicId: userPublicId },
      { projection: { _id: 1 } }
    );

    if (!userDoc) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "No se encontró el usuario." },
        },
        { status: 404 }
      );
    }

    // 4. Verificar que no exista perfil activo para este usuario
    const existingProfile = await profilesCollection.findOne(
      { userId: userDoc._id },
      { projection: { _id: 1 } }
    );

    if (existingProfile) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "PROFILE_ALREADY_EXISTS", message: "Ya existe un perfil para este usuario." },
        },
        { status: 409 }
      );
    }

    // 5. Generar publicId del perfil
    const publicId = generatePublicId("prf");
    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    // 6. Construir documento según $jsonSchema físico de `profiles`
    const now = new Date();
    const profileDocument: Omit<ProfileDocument, "_id"> = {
      userId: userDoc._id,       // ObjectId — referencia a users._id
      publicId,

      identity: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName,              // Auto-generado
      },

      contact: {
        phone,
        country: "PE",           // Perú por defecto (número +51)
      },

      demographics: {
        birthDate: new Date(birthDate),
        sex,
      },

      physical: {
        heightCm,                // int validado por Zod
        weightKg: weightKg || 0,
      },

      goals: {
        primaryGoal,
      },

      lifestyle: {
        activityLevel,
        trainingExperience,
        trainingFrequencyDays,
        sleepHoursAvg,
      },

      preferences: {
        measurementSystem,
      },

      // Campos requeridos por el schema — vacíos en el onboarding inicial
      medical: {
        injuries: [],
        allergies: [],
      },

      metadata: {
        schemaVersion: 2,
      },

      audit: {
        createdAt: now,
        updatedAt: now,
      },
    };

    // 7. Insertar
    await profilesCollection.insertOne(profileDocument as ProfileDocument);

    // 8. Respuesta
    return NextResponse.json<ProfileResponse>(
      {
        success: true,
        data: {
          publicId,
          userId: userPublicId,
          displayName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/onboarding/profile] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno. Inténtalo más tarde." },
      },
      { status: 500 }
    );
  }
}
