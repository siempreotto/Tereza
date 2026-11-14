import { describe, expect, it } from "vitest";
import { fLongitud, fPeso, fPesoAlt, fVolumen, gramosALbOz, lbOzAGramos, volumenAMl, volumenEnUnidad } from "@/lib/core/unidades";

describe("unidades", () => {
  it("volumen a medias onzas", () => {
    expect(fVolumen(118, "oz")).toBe("4 oz");
    expect(fVolumen(133, "oz")).toBe("4.5 oz");
    expect(fVolumen(118, "ml")).toBe("118 ml");
    expect(volumenAMl(4, "oz")).toBe(118);
    expect(volumenEnUnidad(118, "oz")).toBe(4);
    expect(volumenEnUnidad(118, "ml")).toBe(120);
  });
  it("peso en libras y onzas (15 lb 8 oz, no 15.8)", () => {
    expect(gramosALbOz(7030)).toEqual({ lb: 15, oz: 8 });
    expect(fPeso(7030, "lb")).toBe("15 lb 8 oz");
    expect(fPeso(6804, "lb")).toBe("15 lb");
    expect(fPeso(7030, "kg")).toBe("7.03 kg");
    expect(fPesoAlt(7030, "lb")).toBe("7.03 kg");
    expect(lbOzAGramos(15, 8)).toBe(7031);
  });
  it("longitud", () => {
    expect(fLongitud(620, "cm")).toBe("62 cm");
    expect(fLongitud(620, "in")).toBe("24.4 in");
  });
});
