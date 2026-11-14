import { describe, expect, it } from "vitest";
import type { Evento } from "@/lib/core/eventos";
import { edadMeses, predecir, referenciaSueno, suenoDelDia, ventanaVigilia, type Hogar } from "@/lib/core/sueno";
import { desdeLocal, MIN } from "@/lib/core/tiempo";

const GT = "America/Guatemala";
const H: Hogar = { tz: GT, nocheDesde: "18:00", nocheHasta: "05:00", horaDormir: "19:15", ventanasModo: "auto", ventanasPropias: null };
const at = (d: number, h: number, m = 0) => desdeLocal(GT, 2026, 11, d, h, m);
let n = 0;
const ev = (tipo: Evento["tipo"], ini: number, fin: number | null = null, payload: unknown = {}): Evento => ({
  id: `e${n++}`, tipo, started_at: new Date(ini).toISOString(), ended_at: fin ? new Date(fin).toISOString() : null, payload, notas: null, logged_by: "u", source: "web", version: 1,
});

// Un día como el del prototipo: noche 19:25→2:50, toma, 3:08→6:15, siestas 8:00-8:55, 11:05-12:30, 15:00-15:40.
function dia(d: number): Evento[] {
  return [
    ev("sueno", at(d - 1, 19, 25), at(d, 2, 50)),
    ev("sueno", at(d, 3, 8), at(d, 6, 15)),
    ev("sueno", at(d, 8, 0), at(d, 8, 55)),
    ev("sueno", at(d, 11, 5), at(d, 12, 30)),
    ev("sueno", at(d, 15, 0), at(d, 15, 40)),
  ];
}

describe("sueño del día", () => {
  it("corta a medianoche y separa noche de siestas", () => {
    const s = suenoDelDia(dia(7), at(7, 12), at(7, 23), H);
    // noche: 0:00→2:50 (170) + 3:08→6:15 (187) = 357; siestas: 55 + 85 + 40 = 180
    expect(Math.round(s.nocheMin)).toBe(357);
    expect(Math.round(s.siestasMin)).toBe(180);
    expect(s.siestas).toBe(3);
    expect(Math.round(s.totalMin)).toBe(537);
  });
  it("un sueño en curso cuenta hasta ahora", () => {
    const s = suenoDelDia([ev("sueno", at(7, 8, 0))], at(7, 12), at(7, 9, 0), H);
    expect(Math.round(s.siestasMin)).toBe(60);
  });
});

describe("edad y referencias", () => {
  it("edad corregida solo si nació antes de las 37 semanas y hasta los 24 meses", () => {
    expect(edadMeses("2026-06-05", at(9, 12))).toBeCloseTo(5.2, 1);
    expect(edadMeses("2026-06-05", at(9, 12), 39)).toBeCloseTo(5.2, 1);
    expect(edadMeses("2026-06-05", at(9, 12), 32)).toBeCloseTo(3.35, 1);
  });
  it("referencias AASM", () => {
    expect(referenciaSueno(2).minH).toBe(14);
    expect(referenciaSueno(5)).toMatchObject({ minH: 12, maxH: 16 });
    expect(referenciaSueno(14).maxH).toBe(14);
  });
  it("ventanas de vigilia", () => {
    expect(ventanaVigilia(1)).toBeNull();
    expect(ventanaVigilia(5.2)).toEqual([120, 180]);
    expect(ventanaVigilia(10)).toEqual([180, 240]);
  });
});

describe("predictor", () => {
  const bebe = { fechaNacimiento: "2026-06-05" };
  const historial = [1, 2, 3, 4, 5, 6, 7].flatMap(dia); // días 1..7; hoy es 8
  it("no estima antes de 8 semanas", () => {
    expect(predecir([], { fechaNacimiento: "2026-10-20" }, at(8, 9), H)).toMatchObject({ estado: "sin_prediccion" });
  });
  it("si está durmiendo no estima", () => {
    expect(predecir([...historial, ev("sueno", at(8, 8, 0))], bebe, at(8, 8, 30), H)).toEqual({ estado: "durmiendo" });
  });
  it("primera siesta: mediana ponderada de la vigilia tras despertar (6:15→8:00 = 105 min), alta confianza", () => {
    const hoy = [ev("sueno", at(7, 19, 25), at(8, 2, 50)), ev("sueno", at(8, 3, 8), at(8, 6, 15))];
    const p = predecir([...historial, ...hoy], bebe, at(8, 7, 0), H);
    expect(p.estado).toBe("ok");
    if (p.estado !== "ok") return;
    expect(p.tipo).toBe("siesta");
    expect(p.confianza).toBe("alta");
    expect(p.base).toContain("1 h 45 min");
    expect(p.rangoEdadMin).toEqual([120, 180]);
    // 105 min queda por debajo del rango por edad (120–180): se ajusta a 120 → centro 8:15, franja 8:00–8:30
    expect(p.ajustadoAlRango).toBe(true);
    expect(p.desde).toBe(at(8, 8, 0));
    expect(p.hasta).toBe(at(8, 8, 30));
  });
  it("tras la 3.ª siesta pasa a hora de dormir y combina con la hora habitual", () => {
    const hoy = [ev("sueno", at(7, 19, 25), at(8, 2, 50)), ev("sueno", at(8, 3, 8), at(8, 6, 15)), ...dia(8).slice(2)];
    const p = predecir([...historial, ...hoy], bebe, at(8, 16, 0), H);
    expect(p).toMatchObject({ estado: "ok", tipo: "dormir" });
  });
  it("sin historial usa el punto medio de la referencia con confianza baja", () => {
    const p = predecir([ev("sueno", at(8, 3, 0), at(8, 6, 0))], bebe, at(8, 7, 0), H);
    expect(p).toMatchObject({ estado: "ok", confianza: "baja" });
    if (p.estado === "ok") expect(p.desde).toBe(at(8, 6, 0) + 150 * MIN - 15 * MIN);
  });
  it("baja la confianza con siesta corta o fiebre", () => {
    const hoy = [ev("sueno", at(8, 3, 8), at(8, 6, 15)), ev("sueno", at(8, 8, 0), at(8, 8, 20)), ev("temperatura", at(8, 9, 0), null, { valor_c: 38.3 })];
    const p = predecir([...historial, ...hoy], bebe, at(8, 9, 30), H);
    expect(p).toMatchObject({ estado: "ok", confianza: "baja" });
    if (p.estado === "ok") expect(p.avisos).toHaveLength(2);
  });
  it("con ventanas propias las usa y lo dice", () => {
    const p = predecir([ev("sueno", at(8, 3, 0), at(8, 6, 0))], bebe, at(8, 7, 0), { ...H, ventanasModo: "propias", ventanasPropias: [135, 150, 165, 180] });
    expect(p).toMatchObject({ estado: "ok", usaVentanasPropias: true });
    if (p.estado === "ok") expect(p.desde).toBe(at(8, 6, 0) + 135 * MIN - 15 * MIN);
  });
});
