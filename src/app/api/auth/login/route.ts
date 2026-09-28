import { NextResponse } from "next/server";
import argon2 from "argon2";
import { getDb } from "@/lib/db/mongodb";
import { loginApiSchema } from "@/lib/schemas/user.schema";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth/session";
import type { UserDocument, LoginResponse, ApiErrorResponse } from "@/types/user";

// ──────────────────────────────────────────────────
// POST /api/auth/login
// Valida credenciales y genera una cookie de sesión segura
// ──────────────────────────────────────────────────

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function POST(request: Request) {
  try {
    // 1. Parsear y validar body
    const body = await request.json();
    const parsed = loginApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email y contraseña son requeridos." },
        },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;

    // 2. Conectar a MongoDB
    const db = await getDb();
    const usersCollection = db.collection<UserDocument>("users");

    // 3. Buscar usuario por email normalizado
    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersCollection.findOne(
      { "email.normalized": normalizedEmail },
      { projection: { publicId: 1, role: 1, authentication: 1, account: 1, _id: 1 } }
    );

    // Respuesta genérica — no revelar si el email existe o no
    const INVALID_CREDENTIALS: ApiErrorResponse = {
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos.",
      },
    };

    if (!user) {
      // Delay artificial para prevenir timing attacks
      await new Promise((r) => setTimeout(r, 300));
      return NextResponse.json<ApiErrorResponse>(INVALID_CREDENTIALS, { status: 401 });
    }

    // 4. Verificar cuenta no bloqueada
    if (user.account.status === "LOCKED" || user.account.status === "SUSPENDED") {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "ACCOUNT_LOCKED",
            message: "Tu cuenta está temporalmente bloqueada. Contacta soporte.",
          },
        },
        { status: 403 }
      );
    }

    // 5. Verificar contraseña con argon2id
    let passwordValid = false;
    try {
      passwordValid = await argon2.verify(user.authentication.passwordHash, password);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      // Incrementar failedAttempts
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $inc: { "authentication.failedAttempts": 1 },
          $set: { "audit.updatedAt": new Date() },
        }
      );
      return NextResponse.json<ApiErrorResponse>(INVALID_CREDENTIALS, { status: 401 });
    }

    // 6. Resetear failedAttempts y actualizar lastLoginAt
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "authentication.failedAttempts": 0,
          "audit.lastLoginAt": new Date(),
          "audit.updatedAt": new Date(),
        },
      }
    );

    // 7. Generar JWT y preparar respuesta
    const token = await createSessionToken(user.publicId, user.role || "USER");

    const response = NextResponse.json<LoginResponse>(
      { success: true, data: { publicId: user.publicId, role: user.role } },
      { status: 200 }
    );

    // 8. Setear cookie HTTP-only
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno. Inténtalo más tarde." },
      },
      { status: 500 }
    );
  }
}
