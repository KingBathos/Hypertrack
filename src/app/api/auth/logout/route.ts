import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth/session";

// ──────────────────────────────────────────────────
// POST /api/auth/logout
// Destruye la cookie de sesión y redirige a /login
// ──────────────────────────────────────────────────

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Sesión cerrada correctamente." },
    { status: 200 }
  );

  // Destruir la cookie seteando maxAge=0
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
