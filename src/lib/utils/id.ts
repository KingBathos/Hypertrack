import { ulid } from "ulid";

/**
 * Genera un identificador público con prefijo y ULID.
 *
 * Formato: `{prefix}_{ULID}`
 * Ejemplos:
 *   - generatePublicId("usr") → "usr_01JXXXXXXXXXXXXXXXXXX"
 *   - generatePublicId("prf") → "prf_01JXXXXXXXXXXXXXXXXXX"
 *
 * El ULID es lexicográficamente ordenable por timestamp,
 * lo que permite ordenar por fecha de creación sin campo adicional.
 */
export function generatePublicId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}
