import { NextResponse } from "next/server";
import argon2 from "argon2";
import { getDb } from "@/lib/db/mongodb";
import { registerApiSchema } from "@/lib/schemas/user.schema";
import { generatePublicId } from "@/lib/utils/id";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth/session";
import type { UserDocument, RegisterResponse, ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// POST /api/auth/register
// Estructura del documento alineada al $jsonSchema físico de `users`
// ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // 1. Parsear y validar body
    const body = await request.json();
    const parsed = registerApiSchema.safeParse(body);

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
          error: { code: "VALIDATION_ERROR", message: "Datos inválidos.", details: fieldErrors },
        },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;

    // 2. Conectar
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>("users");

    // 3. Unicidad por email normalizado (lowercase)
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await usersCollection.findOne(
      { "email.normalized": normalizedEmail },
      { projection: { _id: 1 } }
    );

    if (existing) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "EMAIL_ALREADY_EXISTS", message: "Este email ya está registrado." },
        },
        { status: 409 }
      );
    }

    // 4. Hash con argon2id (requerido por el $jsonSchema: algorithm: "argon2id")
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    // 5. Generar publicId
    const publicId = generatePublicId("usr");

    // 6. Construir documento según $jsonSchema físico
    const now = new Date();
    const userDocument: Omit<UserDocument, "_id"> = {
      publicId,
      role: "USER",

      email: {
        value: email.trim(),
        normalized: normalizedEmail,
        verified: false,
        verifiedAt: null,
      },

      authentication: {
        passwordHash,
        algorithm: "argon2id",
        failedAttempts: 0,
        lockedUntil: null,
      },

      account: {
        status: "PENDING_VERIFICATION",
        language: "es-PE",
        timezone: "America/Lima",
      },

      metadata: {
        schemaVersion: 1,
        source: "web",
      },

      audit: {
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      },
    };

    // 7. Insertar
    await usersCollection.insertOne(userDocument as UserDocument);

    // 8. Generar token de sesión y setear cookie (UX: pasar directamente al onboarding)
    const token = await createSessionToken(publicId, "USER");

    // 9. Respuesta (sin datos sensibles)
    const response = NextResponse.json<RegisterResponse>(
      {
        success: true,
        data: { publicId, email: email.trim() },
      },
      { status: 201 }
    );

    // Setear cookie HTTP-only de sesión
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno. Inténtalo más tarde." },
      },
      { status: 500 }
    );
  }
}
