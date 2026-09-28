import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

// ──────────────────────────────────────────────────
// Middleware de autenticación y RBAC — HyperTrack
//
// Protege las rutas del dashboard, workout, coach y admin.
// Corre en Edge Runtime (usa crypto.subtle nativo).
// ──────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar sesión
  const session = await getSessionFromRequest(request);

  if (!session) {
    // Sin sesión válida → redirigir a /login preservando la URL original
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────────
  // Control de Acceso Basado en Roles (RBAC)
  // ──────────────────────────────────────────────────
  const userRole = session.role || "USER";

  // Rutas exclusivas para COACH y ADMIN
  if (pathname.startsWith("/coach")) {
    if (userRole !== "COACH" && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Rutas exclusivas estrictamente para ADMIN
  if (pathname.startsWith("/admin")) {
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Sesión válida y rol autorizado → continuar
  return NextResponse.next();
}

// ──────────────────────────────────────────────────
// Configuración del matcher
// Protege: /dashboard, /workout, /nutrition, /coach, /admin (con subrutas)
// Excluye automáticamente: archivos estáticos, _next, api
// ──────────────────────────────────────────────────

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workout/:path*",
    "/nutrition/:path*",
    "/coach/:path*",
    "/admin/:path*",
  ],
};
