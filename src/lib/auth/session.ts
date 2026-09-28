/**
 * session.ts — Gestión de sesión JWT nativa (sin dependencias externas)
 *
 * Usa `crypto.subtle` (Web Crypto API) disponible en Node.js 18+ y Edge Runtime.
 * Algoritmo: HMAC-SHA256 (HS256)
 *
 * Cookie: `ht_session` — HTTP-only, Secure en producción, SameSite=Lax, 7 días
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────

const COOKIE_NAME = "ht_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días en segundos

// ──────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────

export interface SessionPayload {
  sub: string;      // publicId del usuario (ej: "usr_01JXXX...")
  role?: string;    // Rol del usuario (ej: "USER", "COACH", "NUTRITIONIST", "ADMIN")
  iat: number;      // issued at (timestamp UNIX)
  exp: number;      // expiration (timestamp UNIX)
}

// ──────────────────────────────────────────────────
// Helpers internos — Encoders
// ──────────────────────────────────────────────────

function base64UrlEncode(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ──────────────────────────────────────────────────
// Obtener la clave secreta como CryptoKey
// ──────────────────────────────────────────────────

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET no está definido en las variables de entorno. " +
      "Agrega AUTH_SECRET en tu .env.local"
    );
  }

  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,        // no exportable
    ["sign", "verify"]
  );
}

// ──────────────────────────────────────────────────
// signJwt — Genera un token JWT HS256 firmado
// ──────────────────────────────────────────────────

export async function signJwt(publicId: string, role: string = "USER"): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionPayload = {
    sub: publicId,
    role,
    iat: now,
    exp: now + COOKIE_MAX_AGE,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

// ──────────────────────────────────────────────────
// verifyJwt — Verifica y decodifica un token JWT
// ──────────────────────────────────────────────────

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await getSigningKey();
    const signatureBytes = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      new TextEncoder().encode(signingInput)
    );

    if (!isValid) return null;

    const payload: SessionPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    // Verificar expiración
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────
// getSession — Lee la sesión desde las cookies del servidor
// Para usar en Server Components y Route Handlers (Node Runtime)
// ──────────────────────────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

// ──────────────────────────────────────────────────
// getSessionFromRequest — Lee la sesión desde NextRequest
// Para usar en middleware (Edge Runtime)
// ──────────────────────────────────────────────────

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

// ──────────────────────────────────────────────────
// setSessionCookie — Setea la cookie de sesión en una NextResponse
// ──────────────────────────────────────────────────

export async function setSessionCookie(
  response: NextResponse,
  publicId: string,
  role: string = "USER"
): Promise<NextResponse> {
  const token = await signJwt(publicId, role);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

// ──────────────────────────────────────────────────
// setSessionCookieOnHeaders — Para Route Handlers que retornan NextResponse
// ──────────────────────────────────────────────────

export async function createSessionToken(publicId: string, role: string = "USER"): Promise<string> {
  return signJwt(publicId, role);
}

export { COOKIE_NAME };
