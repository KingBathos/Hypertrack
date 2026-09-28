import { NextResponse } from "next/server";
import argon2 from "argon2";
import { getDb } from "@/lib/db/mongodb";
import { registerProApiSchema } from "@/lib/schemas/user.schema";
import { generatePublicId } from "@/lib/utils/id";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth/session";
import type { UserDocument, RegisterResponse, ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// POST /api/auth/register-pro
// ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerProApiSchema.safeParse(body);

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

    const { email, password, role } = parsed.data;

    const db = await getDb();
    const usersCollection = db.collection<UserDocument>("users");

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

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const publicId = generatePublicId("usr");
    const now = new Date();

    const userDocument: Omit<UserDocument, "_id"> = {
      publicId,
      role: role as any,

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

    await usersCollection.insertOne(userDocument as UserDocument);

    const token = await createSessionToken(publicId, role as any);

    const response = NextResponse.json<RegisterResponse>(
      {
        success: true,
        data: { publicId, email: email.trim() },
      },
      { status: 201 }
    );

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/register-pro] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno. Inténtalo más tarde." },
      },
      { status: 500 }
    );
  }
}
