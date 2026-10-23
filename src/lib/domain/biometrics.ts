/**
 * src/lib/domain/biometrics.ts
 *
 * Módulo de dominio puro para análisis antropométrico y biométrico.
 */

import { BiologicalSex } from "./metabolic";

export type HealthRiskLevel = "LOW" | "MODERATE" | "HIGH";

/**
 * Calcula el Ratio Cintura-Cadera (Waist-to-Hip Ratio - WHR).
 * WHR = Cintura (cm) / Cadera (cm)
 */
export function calculateWHR(waistCm: number, hipCm: number): number {
  if (waistCm <= 0 || hipCm <= 0) {
    throw new Error("Las medidas de cintura y cadera deben ser números positivos mayores a cero.");
  }
  const ratio = waistCm / hipCm;
  return Math.round(ratio * 100) / 100;
}

/**
 * Estratificación del riesgo cardiovascular según las directrices de la OMS:
 * - Hombres:
 *   - Bajo: < 0.90
 *   - Moderado: 0.90 - 0.99
 *   - Alto: >= 1.00
 * - Mujeres:
 *   - Bajo: < 0.80
 *   - Moderado: 0.80 - 0.84
 *   - Alto: >= 0.85
 */
export function classifyWHRRisk(whr: number, sex: BiologicalSex): HealthRiskLevel {
  if (sex === "MALE") {
    if (whr < 0.90) return "LOW";
    if (whr < 1.00) return "MODERATE";
    return "HIGH";
  } else {
    if (whr < 0.80) return "LOW";
    if (whr < 0.85) return "MODERATE";
    return "HIGH";
  }
}
