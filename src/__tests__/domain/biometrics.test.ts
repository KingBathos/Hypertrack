import { describe, it, expect } from "vitest";
import { calculateWHR, classifyWHRRisk } from "../../lib/domain/biometrics";

describe("Biometrics Domain Module (WHR & Risk Classification)", () => {
  it("debe calcular el Ratio Cintura-Cadera correctamente", () => {
    // Cintura 80 cm, Cadera 100 cm -> 0.80
    expect(calculateWHR(80, 100)).toBe(0.8);
    // Cintura 95 cm, Cadera 90 cm -> 1.055... -> 1.06
    expect(calculateWHR(95, 90)).toBe(1.06);
  });

  it("debe arrojar error con dimensiones inválidas", () => {
    expect(() => calculateWHR(0, 90)).toThrow();
    expect(() => calculateWHR(80, -10)).toThrow();
  });

  it("debe clasificar el riesgo cardiovascular según la OMS para hombres", () => {
    expect(classifyWHRRisk(0.85, "MALE")).toBe("LOW");
    expect(classifyWHRRisk(0.95, "MALE")).toBe("MODERATE");
    expect(classifyWHRRisk(1.05, "MALE")).toBe("HIGH");
  });

  it("debe clasificar el riesgo cardiovascular según la OMS para mujeres", () => {
    expect(classifyWHRRisk(0.75, "FEMALE")).toBe("LOW");
    expect(classifyWHRRisk(0.82, "FEMALE")).toBe("MODERATE");
    expect(classifyWHRRisk(0.90, "FEMALE")).toBe("HIGH");
  });
});
