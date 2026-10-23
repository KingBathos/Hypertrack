import { describe, it, expect } from "vitest";
import {
  calculateBMR,
  calculateTDEE,
  calculateMacroTargets,
} from "../../lib/domain/metabolic";

describe("Metabolic Domain Module (Mifflin-St Jeor & TDEE)", () => {
  it("debe calcular el BMR correctamente para un hombre", () => {
    // Hombre: 80kg, 180cm, 25 años
    // 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    const bmr = calculateBMR({
      weightKg: 80,
      heightCm: 180,
      ageYears: 25,
      sex: "MALE",
    });
    expect(bmr).toBe(1805);
  });

  it("debe calcular el BMR correctamente para una mujer", () => {
    // Mujer: 60kg, 165cm, 30 años
    // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320.3
    const bmr = calculateBMR({
      weightKg: 60,
      heightCm: 165,
      ageYears: 30,
      sex: "FEMALE",
    });
    expect(bmr).toBe(1320.3);
  });

  it("debe lanzar un error si las métricas corporales son inválidas o negativas", () => {
    expect(() =>
      calculateBMR({
        weightKg: -70,
        heightCm: 175,
        ageYears: 20,
        sex: "MALE",
      })
    ).toThrow();
  });

  it("debe calcular el TDEE multiplicando por el nivel de actividad física", () => {
    const bmr = 1800;
    const tdeeModerado = calculateTDEE(bmr, "MODERATELY_ACTIVE"); // 1800 * 1.55 = 2790
    expect(tdeeModerado).toBe(2790);

    const tdeeSedentario = calculateTDEE(bmr, "SEDENTARY"); // 1800 * 1.2 = 2160
    expect(tdeeSedentario).toBe(2160);
  });

  it("debe calcular la distribución de macronutrientes para pérdida de grasa", () => {
    const tdee = 2500;
    const peso = 75;
    const macros = calculateMacroTargets(tdee, peso, "FAT_LOSS");

    // Déficit 20% -> 2000 kcal
    expect(macros.targetCalories).toBe(2000);
    // Proteína: 75 * 2.0 = 150g -> 600 kcal
    expect(macros.proteinGrams).toBe(150);
    // Grasas: 25% de 2000 = 500 kcal / 9 = ~56g
    expect(macros.fatGrams).toBe(56);
    // Carbs: (2000 - 600 - 500) / 4 = 900 / 4 = 225g
    expect(macros.carbGrams).toBe(225);
  });
});
