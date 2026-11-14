import { describe, expect, it } from "vitest";
import { curvas, edadDias, percentil, puntajeZ, textoPercentil } from "@/lib/core/crecimiento";

describe("percentiles OMS (tablas LMS oficiales)", () => {
  it("la mediana da z = 0 y percentil 50", () => {
    expect(puntajeZ("peso", "F", 0, 3.2322)).toBeCloseTo(0, 5);
    expect(percentil("peso", "F", 365, 8.9462)).toBeCloseTo(50, 0);
    expect(puntajeZ("longitud", "M", 0, 49.8842)).toBeCloseTo(0, 5);
  });
  it("P3 y P97 al nacer (niñas, peso) coinciden con la tabla publicada: 2.4 y 4.2 kg aprox.", () => {
    const c = curvas("peso", "F", 0)!;
    expect(c.p3).toBeCloseTo(2.4, 1);
    expect(c.p97).toBeCloseTo(4.2, 1);
    expect(c.p50).toBeCloseTo(3.2322, 3);
  });
  it("Lucía, 5 meses (153 días), 6.9 kg: alrededor del percentil 35 (niñas)", () => {
    const p = percentil("peso", "F", 153, 6.9)!;
    expect(p).toBeGreaterThan(20);
    expect(p).toBeLessThan(50);
  });
  it("ajuste de la OMS por fuera de ±3 en peso", () => {
    const z = puntajeZ("peso", "M", 180, 13)!;
    expect(z).toBeGreaterThan(3);
    expect(textoPercentil(percentil("peso", "M", 180, 13))).toBe("mayor al percentil 97");
  });
  it("fuera de 0–24 meses no hay percentil", () => {
    expect(percentil("peso", "F", 800, 11)).toBeNull();
    expect(textoPercentil(null)).toContain("fuera");
  });
  it("edad corregida para prematuros", () => {
    const t = Date.UTC(2026, 10, 9, 12);
    expect(Math.round(edadDias("2026-06-05", t))).toBe(157);
    expect(Math.round(edadDias("2026-06-05", t, 32))).toBe(101);
  });
});
