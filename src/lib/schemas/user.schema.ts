import { z } from "zod";

// ──────────────────────────────────────────────────
// Schemas Zod — Colección `users`
// Espeja el $jsonSchema físico de MongoDB
// ──────────────────────────────────────────────────

/**
 * Schema del formulario de registro (lo que recibe el cliente).
 */
export const registerFormSchema = z.object({
  email: z
    .string({ error: "El email es obligatorio" })
    .min(1, "El email es obligatorio")
    .email("Introduce un email válido")
    .max(254, "Email demasiado largo"),

  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(8, "Mínimo 8 caracteres")
    .max(128, "Máximo 128 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),

  confirmPassword: z
    .string({ error: "Confirma tu contraseña" })
    .min(1, "Confirma tu contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerFormSchema>;

/**
 * Schema para el endpoint API (sin confirmPassword).
 */
export const registerApiSchema = z.object({
  email: z.string().min(1).email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export type RegisterApiInput = z.infer<typeof registerApiSchema>;

/**
 * Schema del formulario de login (lo que recibe el cliente).
 */
export const loginFormSchema = z.object({
  email: z
    .string({ error: "El email es obligatorio" })
    .min(1, "El email es obligatorio")
    .email("Introduce un email válido"),

  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, "La contraseña es obligatoria"),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

/**
 * Schema para el endpoint API de login.
 */
export const loginApiSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export type LoginApiInput = z.infer<typeof loginApiSchema>;

/**
 * Schema del formulario de registro para Profesionales (Coach/Nutricionista).
 */
export const registerProFormSchema = registerFormSchema.and(
  z.object({
    role: z.enum(["COACH", "NUTRITIONIST"], {
      error: "Debes seleccionar un rol válido",
    }),
  })
);

export type RegisterProFormData = z.infer<typeof registerProFormSchema>;

/**
 * Schema para el endpoint API de registro pro.
 */
export const registerProApiSchema = registerApiSchema.and(
  z.object({
    role: z.enum(["COACH", "NUTRITIONIST"]),
  })
);

export type RegisterProApiInput = z.infer<typeof registerProApiSchema>;
