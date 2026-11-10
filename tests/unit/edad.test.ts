import { describe, expect, it } from "vitest";
import { edadTexto } from "@/lib/core/edad";

const hoy = new Date("2026-11-09T12:00:00");

describe("edadTexto", () => {
  it("días antes del primer mes", () => expect(edadTexto("2026-10-30", hoy)).toBe("10 días"));
  it("meses a término (Lucía: 157 días)", () => expect(edadTexto("2026-06-05", hoy)).toBe("5 meses"));
  it("singular", () => expect(edadTexto("2026-10-09", hoy)).toBe("1 mes"));
  it("a término no muestra edad corregida", () => expect(edadTexto("2026-06-05", hoy, 39)).toBe("5 meses"));
  it("prematuro de 32 semanas: 8 semanas de corrección", () => expect(edadTexto("2026-06-05", hoy, 32)).toBe("5 meses · corregida 3 meses"));
  it("después de 24 meses corregidos ya no corrige", () => expect(edadTexto("2023-01-01", hoy, 30)).toBe("3 años"));
});
