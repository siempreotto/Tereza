import { describe, expect, it } from "vitest";
import { enVentana, etiquetaDia, fDuracion, fFecha, fHace, fHora, fReloj, inicioDia, partes, sumarDias, enHora, desdeLocal } from "@/lib/core/tiempo";

const GT = "America/Guatemala";
// Sábado 7 de noviembre de 2026, 2:05 p.m. en Guatemala = 20:05 UTC
const T = Date.UTC(2026, 10, 7, 20, 5);

describe("tiempo en la zona del hogar", () => {
  it("partes y hora 12 h", () => {
    expect(partes(T, GT)).toMatchObject({ anio: 2026, mes: 11, dia: 7, hora: 14, minuto: 5, diaSemana: 6 });
    expect(fHora(T, GT)).toBe("2:05 p.m.");
    expect(fHora(Date.UTC(2026, 10, 8, 6, 0), GT)).toBe("12:00 a.m.");
    expect(fHora(Date.UTC(2026, 10, 7, 18, 0), GT)).toBe("12:00 p.m.");
  });
  it("fecha larga «Sábado 7 de noviembre»", () => expect(fFecha(T, GT)).toBe("Sábado 7 de noviembre"));
  it("inicio de día y sumar días en la zona", () => {
    expect(inicioDia(T, GT)).toBe(Date.UTC(2026, 10, 7, 6, 0));
    expect(sumarDias(inicioDia(T, GT), 1, GT)).toBe(Date.UTC(2026, 10, 8, 6, 0));
    expect(enHora(inicioDia(T, GT), "19:15", GT)).toBe(Date.UTC(2026, 10, 8, 1, 15));
  });
  it("respeta el DST en otras zonas", () => {
    // México centro ya no tiene DST; Santiago sí (UTC-3 en noviembre)
    expect(fHora(desdeLocal("America/Santiago", 2026, 11, 7, 9, 0), "America/Santiago")).toBe("9:00 a.m.");
    expect(partes(desdeLocal("America/Santiago", 2026, 11, 7, 9, 0), "UTC").hora).toBe(12);
  });
  it("duraciones y «hace»", () => {
    expect(fDuracion(45)).toBe("45 min");
    expect(fDuracion(120)).toBe("2 h");
    expect(fDuracion(72)).toBe("1 h 12 min");
    expect(fHace(T - 20 * 60_000, T)).toBe("hace 20 min");
    expect(fHace(T, T)).toBe("ahora");
    expect(fReloj(4365)).toBe("01:12:45");
  });
  it("etiqueta Hoy / Ayer / fecha corta", () => {
    expect(etiquetaDia(T, T, GT)).toBe("Hoy");
    expect(etiquetaDia(T - 86_400_000, T, GT)).toBe("Ayer");
    expect(etiquetaDia(T - 3 * 86_400_000, T, GT)).toBe("Mié 4 nov");
  });
  it("ventana que cruza medianoche", () => {
    expect(enVentana(Date.UTC(2026, 10, 8, 1, 30), "18:00", "05:00", GT)).toBe(true); // 7:30 p.m.
    expect(enVentana(Date.UTC(2026, 10, 8, 9, 0), "18:00", "05:00", GT)).toBe(true); // 3:00 a.m.
    expect(enVentana(T, "18:00", "05:00", GT)).toBe(false); // 2:05 p.m.
  });
});
