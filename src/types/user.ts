import type { ObjectId } from "mongodb";

// ──────────────────────────────────────────────────
// Tipos de dominio — Colección `users`
// Alineado exactamente con el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

/**
 * Documento completo en MongoDB. NUNCA se expone directamente al cliente.
 */
export interface UserDocument {
  _id: ObjectId;
  publicId: string; // "^usr_[0-9A-HJKMNP-TV-Z]{26}$"
  role: "USER" | "COACH" | "NUTRITIONIST" | "ADMIN";
  coachId?: string;        // publicId del coach vinculado
  nutritionistId?: string; // publicId del nutricionista vinculado

  email: {
    value: string;      // Email original con su capitalización
    normalized: string; // Lowercase para búsquedas únicas
    verified: boolean;
    verifiedAt?: Date | null;
  };

  authentication: {
    passwordHash: string;
    algorithm: "argon2id"; // Único valor permitido en el schema físico
    lastPasswordChange?: Date;
    failedAttempts: number; // bsonType: int, minimum: 0
    lockedUntil: Date | null;
  };

  account: {
    status: "PENDING_VERIFICATION" | "ACTIVE" | "LOCKED" | "SUSPENDED" | "DELETED";
    language: string;  // pattern: ^[a-z]{2}-[A-Z]{2}$ (ej: "es-PE")
    timezone: string;  // ej: "America/Lima"
  };

  metadata: {
    schemaVersion: number; // bsonType: int, minimum: 1
    source: "web" | "mobile" | "api";
  };

  audit: {
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | null;
  };
}

/**
 * Respuesta pública del registro (sin datos sensibles).
 */
export interface RegisterResponse {
  success: true;
  data: {
    publicId: string;
    email: string; // Solo el value del email
  };
}

/**
 * Respuesta de error estándar de la API.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Respuesta pública del login exitoso.
 */
export interface LoginResponse {
  success: true;
  data: {
    publicId: string;
    role?: string;
  };
}

/**
 * Payload decodificado del JWT de sesión.
 */
export interface SessionPayload {
  sub: string;   // publicId del usuario
  role: string;  // rol del usuario (USER, COACH, ADMIN)
  iat: number;   // issued at
  exp: number;   // expiration
}
