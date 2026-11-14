import { describe, expect, it } from "vitest";
import { interpretarHora } from "@/lib/core/horaNatural";
import { desdeLocal } from "@/lib/core/tiempo";

const GT = "America/Guatemala";
const at = (d: number, h: number, m = 0) => desdeLocal(GT, 2026, 11, d, h, m);
const AHORA = at(14, 15, 40); // sábado 14, 3:40 p.m.
const ok = (t: string) => { const r = interpretarHora(t, AHORA, GT); if ("error" in r) throw new Error(r.error); return r; };

describe("horas en lenguaje natural", () => {
  it("vacío o «ahora» es ahora", () => { expect(ok("").ms).toBe(AHORA); expect(ok("ahora").ms).toBe(AHORA); });
  it("«a las 2» a las 3:40 p.m. → 2:00 p.m. de hoy, y lo avisa", () => {
    const r = ok("a las 2");
    expect(r.ms).toBe(at(14, 14, 0));
    expect(r.nota).toContain("las 2:00 p.m. de hoy");
  });
  it("«a las 5» a las 3:40 p.m. → 5:00 a.m. de hoy (la pasada más reciente)", () => {
    const r = ok("a las 5");
    expect(r.ms).toBe(at(14, 5, 0));
    expect(r.nota).toContain("las 5:00 a.m. de hoy");
  });
  it("«a las 2 y media», «2:30 pm», «14:30»", () => {
    expect(ok("a las 2 y media").ms).toBe(at(14, 14, 30));
    expect(ok("2:30 pm").ms).toBe(at(14, 14, 30));
    expect(ok("14:30").ms).toBe(at(14, 14, 30));
    expect(ok("14:30").nota).toBeNull();
  });
  it("«a las 8 de la noche» aún no pasa hoy → la de ayer, y lo avisa", () => {
    const r = ok("a las 8 de la noche");
    expect(r.ms).toBe(at(13, 20, 0));
    expect(r.nota).toContain("de ayer");
  });
  it("«hoy a las 8 de la noche» todavía no pasa → error claro", () => {
    expect("error" in interpretarHora("hoy a las 8 de la noche", AHORA, GT)).toBe(true);
  });
  it("«ayer a las 10 de la noche»", () => expect(ok("ayer a las 10 de la noche").ms).toBe(at(13, 22, 0)));
  it("«hace 20 minutos», «hace una hora», «hace media hora», «hace 1 hora y 30 minutos»", () => {
    expect(ok("hace 20 minutos").ms).toBe(AHORA - 20 * 60_000);
    expect(ok("hace una hora").ms).toBe(AHORA - 3_600_000);
    expect(ok("hace media hora").ms).toBe(AHORA - 30 * 60_000);
    expect(ok("hace 1 hora y 30 minutos").ms).toBe(AHORA - 90 * 60_000);
  });
  it("ISO con y sin zona", () => {
    expect(ok("2026-11-14T20:00:00Z").ms).toBe(Date.UTC(2026, 10, 14, 20));
    expect(ok("2026-11-14T14:00").ms).toBe(at(14, 14, 0));
  });
  it("texto que no es hora → error claro", () => expect("error" in interpretarHora("cuando pudo", AHORA, GT)).toBe(true));
});
