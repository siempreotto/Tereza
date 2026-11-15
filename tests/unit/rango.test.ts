import { describe, expect, it } from "vitest";
import { etiquetaCorta, horaEnDia, rangoSueno } from "@/lib/core/rango";
import { desdeLocal } from "@/lib/core/tiempo";

const GT = "America/Guatemala";
const at = (d: number, h: number, m = 0) => desdeLocal(GT, 2026, 11, d, h, m);
const ahora = at(14, 13, 43);

describe("hora elegida en el selector", () => {
  it("una hora de la mañana a la 1:43 p.m. es de hoy", () => expect(horaEnDia("10:50", ahora, GT)).toBe(at(14, 10, 50)));
  it("una hora de la noche a la 1:43 p.m. es de ayer", () => expect(horaEnDia("20:20", ahora, GT)).toBe(at(13, 20, 20)));
  it("no arrastra el día: pasar por un valor futuro no deja la hora en ayer", () => {
    // El selector manda «22:50» (futuro → ayer) y luego «10:50»: la segunda se calcula de nuevo sobre hoy.
    expect(horaEnDia("22:50", ahora, GT)).toBe(at(13, 22, 50));
    expect(horaEnDia("10:50", ahora, GT)).toBe(at(14, 10, 50));
  });
  it("respeta el día base al editar un registro viejo", () => expect(horaEnDia("09:00", ahora, GT, at(10, 15))).toBe(at(10, 9)));
});

describe("rango de un sueño pasado", () => {
  it("10:50 a 11:40 de hoy: 50 min", () => expect(rangoSueno(at(14, 10, 50), at(14, 11, 40), ahora)).toMatchObject({ minutos: 50, futuro: false }));
  it("cruza la medianoche hacia atrás si el fin quedaría en el futuro", () => {
    const r = rangoSueno(at(14, 20, 20) - 86_400_000, at(14, 6, 20), ahora);
    expect(r).toMatchObject({ inicio: at(13, 20, 20), fin: at(14, 6, 20), minutos: 600 });
  });
  it("nunca deja el fin en el futuro", () => {
    const r = rangoSueno(at(14, 12, 0), at(14, 11, 0), ahora);
    expect(r.futuro).toBe(false);
    expect(r.inicio).toBe(at(13, 12, 0));
  });
  it("etiquetas de día", () => {
    expect(etiquetaCorta(at(14, 8), ahora, GT)).toBe("hoy");
    expect(etiquetaCorta(at(13, 22), ahora, GT)).toBe("ayer");
  });
});
