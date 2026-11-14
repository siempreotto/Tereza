import { describe, expect, it } from "vitest";
import { resumenPediatra } from "@/lib/core/resumenPediatra";
import { desdeLocal } from "@/lib/core/tiempo";
import type { Evento } from "@/lib/core/eventos";

const GT = "America/Guatemala";
const at = (d: number, h: number, m = 0) => desdeLocal(GT, 2026, 11, d, h, m);
const ev = (id: string, tipo: Evento["tipo"], ini: number, fin: number | null, payload: unknown, notas: string | null = null): Evento => ({ id, tipo, started_at: new Date(ini).toISOString(), ended_at: fin ? new Date(fin).toISOString() : null, payload, notas, logged_by: "u", source: "web", version: 1 });

describe("resumen para el pediatra", () => {
  it("junta crecimiento con percentil, medicamentos, síntomas y dudas, sin diagnosticar", () => {
    const r = resumenPediatra({
      bebe: { nombre: "Lucía", fecha_nacimiento: "2026-06-05", semanas_gestacion: 39, sexo: "F" },
      hogar: { tz: GT, nocheDesde: "18:00", nocheHasta: "05:00", horaDormir: "19:15", ventanasModo: "auto", ventanasPropias: null, unidadVolumen: "oz", unidadPeso: "lb", unidadLongitud: "in" },
      desde: at(1, 0), hasta: at(10, 0), ahora: at(9, 12),
      eventos: [
        ev("1", "sueno", at(8, 9), at(8, 10), {}),
        ev("2", "medicamento", at(8, 7), null, { medication_id: "m1", cantidad_textual: "1 gota" }),
        ev("3", "temperatura", at(8, 21), null, { valor_c: 38.2, metodo: "axilar" }, "irritable"),
        ev("4", "panal", at(8, 10), null, { mojado: true, sucio: false }),
      ],
      medidas: [{ medido_en: new Date(at(3, 10)).toISOString(), peso_g: 6900, longitud_mm: null, perimetro_cefalico_mm: null, origen: "casa" }],
      tratamientos: [{ id: "m1", nombre: "Vitamina D", indicacion_textual: "1 gota al día", activo: true }],
      dudas: [{ texto: "¿Sólidos?", resuelta_en_visita_id: null }, { texto: "vieja", resuelta_en_visita_id: "v" }],
      ultimaVisita: null,
    });
    expect(r.crecimiento[0].peso).toMatch(/^15 lb 3 oz · percentil \d+$/);
    expect(r.medicamentos.administrados).toEqual([{ nombre: "Vitamina D", veces: 1 }]);
    expect(r.sintomas[0].que).toBe("Temperatura 38.2 °C");
    expect(r.dudas).toEqual(["¿Sólidos?"]);
    expect(r.texto).toContain("no es un diagnóstico");
    expect(r.texto).not.toMatch(/diagnostica|deber[ií]a dormir/i);
  });
});
