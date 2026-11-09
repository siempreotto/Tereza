import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/db/types";

// Si una migración cambia los enums y no se regeneran los tipos, esto avisa.
describe("tipos de la base", () => {
  it("tiene los 10 tipos de evento del brief", () => {
    expect(Constants.public.Enums.tipo_evento).toEqual([
      "sueno", "toma_pecho", "toma_biberon", "toma_solidos", "extraccion",
      "panal", "medicamento", "temperatura", "sintoma", "nota",
    ]);
  });
  it("tiene los tres roles", () => {
    expect(Constants.public.Enums.rol_miembro).toEqual(["admin", "cuidador", "limitado"]);
  });
});
