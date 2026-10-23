import { describe, it, expect } from "vitest";
import {
  calculateEpley1RM,
  calculateVolumeLoad,
  evaluateRPETarget,
} from "../../lib/domain/biomechanics";

describe("Biomechanics Domain Module (Epley 1RM & Volume)", () => {
  it("debe retornar el mismo peso si las repeticiones son exactamente 1", () => {
    expect(calculateEpley1RM(100, 1)).toBe(100);
  });

  it("debe calcular el 1RM estimado usando la fórmula de Epley para múltiples repeticiones", () => {
    // 100 kg x 10 reps = 100 * (1 + 10/30) = 100 * 1.3333... = 133.3 kg
    expect(calculateEpley1RM(100, 10)).toBe(133.3);
  });

  it("debe retornar 0 si los pesos o repeticiones son menores o iguales a 0", () => {
    expect(calculateEpley1RM(0, 10)).toBe(0);
    expect(calculateEpley1RM(100, 0)).toBe(0);
  });

  it("debe calcular el volumen de carga total acumulado en una sesión", () => {
    const sets = [
      { weight: 100, reps: 10 }, // 1000 kg
      { weight: 110, reps: 8 },  // 880 kg
      { weight: 120, reps: 6 },  // 720 kg
    ];
    // Total = 1000 + 880 + 720 = 2600 kg
    expect(calculateVolumeLoad(sets)).toBe(2600);
  });

  it("debe evaluar correctamente el esfuerzo percibido (RPE)", () => {
    expect(evaluateRPETarget(7).zone).toBe("SUBMAXIMAL");
    expect(evaluateRPETarget(8.5).zone).toBe("OPTIMAL");
    expect(evaluateRPETarget(10).zone).toBe("FAILURE");
  });
});
