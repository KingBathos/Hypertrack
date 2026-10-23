import { describe, it, expect } from "vitest";
import { registerFormSchema, registerApiSchema } from "../../lib/schemas/user.schema";

describe("User Zod Schema Validation (Security & Sanitization)", () => {
  it("debe aceptar credenciales válidas con mayúscula y número", () => {
    const validData = {
      email: "atleta@hypertrack.com",
      password: "Password123",
      confirmPassword: "Password123",
    };
    const result = registerFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("debe rechazar contraseñas de menos de 8 caracteres", () => {
    const invalidData = {
      email: "test@hypertrack.com",
      password: "Pass1",
      confirmPassword: "Pass1",
    };
    const result = registerFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("debe rechazar contraseñas sin mayúsculas", () => {
    const invalidData = {
      email: "test@hypertrack.com",
      password: "password123",
      confirmPassword: "password123",
    };
    const result = registerFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("debe rechazar si confirmPassword no coincide con password", () => {
    const invalidData = {
      email: "test@hypertrack.com",
      password: "Password123",
      confirmPassword: "DifferentPassword456",
    };
    const result = registerFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("debe rechazar emails malformados (inyecciones/sintaxis inválida)", () => {
    const invalidData = {
      email: "inyeccion-invalida",
      password: "Password123",
    };
    const result = registerApiSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
