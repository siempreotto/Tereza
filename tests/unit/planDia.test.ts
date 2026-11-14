import { describe, expect, it } from "vitest";
import type { Evento } from "@/lib/core/eventos";
import { aprenderPatrones, cuentaRegresiva, planDelDia } from "@/lib/core/planDia";
import { referenciaDia, type Hogar } from "@/lib/core/sueno";
import { desdeLocal } from "@/lib/core/tiempo";

const GT = "America/Guatemala";
const H: Hogar = { tz: GT, nocheDesde: "18:00", nocheHasta: "05:00", horaDormir: "19:00", ventanasModo: "auto", ventanasPropias: null };
const at = (d: number, h: number, m = 0) => desdeLocal(GT, 2026, 11, d, h, m);
let n = 0;
const ev = (ini: number, fin: number | null = null, payload: unknown = {}): Evento => ({
  id: `s${n++}`, tipo: "sueno", started_at: new Date(ini).toISOString(), ended_at: fin ? new Date(fin).toISOString() : null, payload, notas: null, logged_by: "u", source: "web", version: 1,
});
// María Teresa: 15 meses el 15 de noviembre de 2026.
const bebe = { fechaNacimiento: "2025-08-10", nombre: "María Teresa" };

// Un día de 1 siesta: noche 19:30→6:30, siesta 12:00–13:45.
const diaUnaSiesta = (d: number) => [ev(at(d - 1, 19, 30), at(d, 6, 30)), ev(at(d, 12, 0), at(d, 13, 45))];
// Un día de 2 siestas: noche 19:15→6:20, siestas 9:40–10:40 y 14:10–15:20.
const diaDosSiestas = (d: number) => [ev(at(d - 1, 19, 15), at(d, 6, 20)), ev(at(d, 9, 40), at(d, 10, 40)), ev(at(d, 14, 10), at(d, 15, 20))];

describe("referencia por edad", () => {
  it("a los 15 meses: 2 siestas, la primera 3 a 4 h después de despertar", () => {
    const r = referenciaDia(15.2)!;
    expect(r.siestas).toBe(2);
    expect(r.ventanas[0]).toEqual([180, 240]);
    expect(r.ventanas[1]).toEqual([210, 240]);
    expect(r.texto).toContain("Referencia por edad");
    expect(referenciaDia(15.2, 1)!.siestas).toBe(1);
  });
  it("antes de 8 semanas no hay referencia", () => expect(referenciaDia(1)).toBeNull());
});

describe("plan del día", () => {
  it("sin registros, con despertar a las 6:30: 2 siestas por edad, la primera entre 9:30 y 10:30", () => {
    const p = planDelDia([ev(at(14, 19, 0), at(15, 6, 30))], bebe, at(15, 7, 0), H);
    expect(p.estado).toBe("ok");
    if (p.estado !== "ok") return;
    expect(p.fuenteSiestas).toBe("edad");
    const s = p.bloques.filter((b) => b.tipo === "siesta");
    expect(s).toHaveLength(2);
    expect(s[0].hora).toBeGreaterThanOrEqual(at(15, 9, 30));
    expect(s[0].hora).toBeLessThanOrEqual(at(15, 10, 30));
    expect(p.bloques[0]).toMatchObject({ tipo: "despertar", estado: "hecho", hora: at(15, 6, 30) });
    expect(p.bloques.at(-1)!.tipo).toBe("dormir");
    expect(p.siguiente?.tipo).toBe("siesta");
    expect(cuentaRegresiva(p, at(15, 7, 0), GT)!.titulo).toMatch(/^Primera siesta en /);
  });

  it("sin despertar registrado lo estima y pide registrarlo", () => {
    const p = planDelDia([], bebe, at(15, 6, 0), H);
    if (p.estado !== "ok") throw new Error();
    expect(p.bloques[0]).toMatchObject({ tipo: "despertar", estado: "estimado" });
    expect(p.avisos.join(" ")).toContain("Registra a qué hora despertó");
  });

  it("con 7 días de una sola siesta, el plan pasa a 1 siesta y usa sus horas", () => {
    const hist = [8, 9, 10, 11, 12, 13, 14].flatMap(diaUnaSiesta);
    const p = planDelDia([...hist, ev(at(14, 19, 30), at(15, 6, 30))], bebe, at(15, 7, 0), H);
    if (p.estado !== "ok") throw new Error();
    expect(p.fuenteSiestas).toBe("registros");
    const s = p.bloques.filter((b) => b.tipo === "siesta");
    expect(s).toHaveLength(1);
    // Ventana aprendida 5 h 30 → 12:00
    expect(s[0].hora).toBe(at(15, 12, 0));
    expect(s[0].duracionMin).toBe(105);
    expect(p.confianza).toBe("alta");
  });

  it("aprende ventanas, duraciones y horarios de un patrón de 2 siestas", () => {
    const hist = [8, 9, 10, 11, 12, 13, 14].flatMap(diaDosSiestas);
    const pat = aprenderPatrones(hist, at(15, 7, 0), H);
    expect(pat.siestasPorDia).toBe(2);
    expect(pat.despertarMin).toBe(6 * 60 + 20);
    expect(pat.dormirMin).toBe(19 * 60 + 15);
    expect(pat.porPosicion[0]).toMatchObject({ ventanaPreviaMin: 200, duracionMin: 60 });
    expect(pat.porPosicion[1]).toMatchObject({ ventanaPreviaMin: 210, duracionMin: 70 });
    // Franjas: a las 3 a.m. siempre dormía; a las 8 a.m. nunca.
    expect(pat.franjas[6]).toBeGreaterThan(0.8);
    expect(pat.franjas[16]).toBe(0);
  });

  it("se recalcula cuando la siesta 1 termina tarde", () => {
    const hoy = [ev(at(14, 19, 0), at(15, 6, 30)), ev(at(15, 10, 0), at(15, 11, 30))];
    const p = planDelDia(hoy, bebe, at(15, 11, 35), H);
    if (p.estado !== "ok") throw new Error();
    const s2 = p.bloques.find((b) => b.tipo === "siesta" && b.n === 2)!;
    expect(s2.estado).toBe("estimado");
    // 11:30 + 3 h 45 (punto medio de 210–240 min)
    expect(s2.hora).toBe(at(15, 15, 15));
  });

  it("con horario fijo usa sus horas y las corre si el despertar se movió", () => {
    const fijo: Hogar = { ...H, planModo: "fijo", planFijo: { despertar: "06:30", siestas: [{ inicio: "12:30", duracion_min: 90 }], dormir: "19:30" } };
    const p = planDelDia([ev(at(14, 19, 0), at(15, 7, 0))], bebe, at(15, 7, 10), fijo);
    if (p.estado !== "ok") throw new Error();
    expect(p.fuenteSiestas).toBe("horario");
    const s = p.bloques.filter((b) => b.tipo === "siesta");
    expect(s).toHaveLength(1);
    expect(s[0].hora).toBe(at(15, 13, 0));
    expect(p.bloques.at(-1)!.hora).toBe(at(15, 20, 0));
  });

  it("nunca usa «debería» ni «científicamente»", () => {
    const hist = [8, 9, 10, 11, 12, 13, 14].flatMap(diaDosSiestas);
    const p = planDelDia([...hist, ev(at(14, 19, 15), at(15, 6, 20))], bebe, at(15, 7, 0), H);
    expect(JSON.stringify(p)).not.toMatch(/deber[ií]a|científic/i);
  });
});
