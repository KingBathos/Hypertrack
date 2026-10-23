import { describe, it, expect } from "vitest";
import { analyzeTrainingLoad } from "../../lib/domain/trainingLoad";

describe("Training Load Domain Module (Telemetry for Nutritionists)", () => {
  it("debe clasificar como ENTRENAMIENTO FUERTE cuando hay alta frecuencia y volumen", () => {
    const heavySessions = [
      {
        startedAt: new Date(),
        durationMinutes: 75,
        exercises: [
          { sets: [{ weight: 100, reps: 10, rpe: 8.5 }, { weight: 120, reps: 8, rpe: 9 }] },
          { sets: [{ weight: 80, reps: 12, rpe: 8 }, { weight: 80, reps: 10, rpe: 8.5 }] },
        ],
      },
      {
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        durationMinutes: 60,
        exercises: [{ sets: [{ weight: 140, reps: 5, rpe: 9 }, { weight: 140, reps: 5, rpe: 9 }] }],
      },
      {
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        durationMinutes: 70,
        exercises: [{ sets: [{ weight: 90, reps: 10, rpe: 8 }] }],
      },
      {
        startedAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        durationMinutes: 65,
        exercises: [{ sets: [{ weight: 100, reps: 8, rpe: 8.5 }] }],
      },
    ];

    const analysis = analyzeTrainingLoad(heavySessions, 80);
    expect(analysis.intensityLevel).toBe("HEAVY");
    expect(analysis.sessionsLast7Days).toBe(4);
    expect(analysis.nutritionalPrescription.suggestedProteinPerKg).toBeGreaterThanOrEqual(2.0);
    expect(analysis.nutritionalPrescription.carbStrategy).toContain("ALTA DEMANDA");
  });

  it("debe clasificar como ENTRENAMIENTO SUAVE / DESCARGA con pocas sesiones de bajo volumen", () => {
    const lightSessions = [
      {
        startedAt: new Date(),
        durationMinutes: 30,
        exercises: [{ sets: [{ weight: 20, reps: 10, rpe: 6 }] }],
      },
    ];

    const analysis = analyzeTrainingLoad(lightSessions, 70);
    expect(analysis.intensityLevel).toBe("LIGHT");
    expect(analysis.sessionsLast7Days).toBe(1);
    expect(analysis.nutritionalPrescription.carbStrategy).toContain("MODERADA-BAJA");
  });

  it("debe retornar valores por defecto seguros si no hay sesiones registradas", () => {
    const analysis = analyzeTrainingLoad([], 75);
    expect(analysis.sessionsLast7Days).toBe(0);
    expect(analysis.intensityLevel).toBe("LIGHT");
  });
});
