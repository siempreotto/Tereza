// Unidades: se guarda en métrico y se muestra en la unidad del hogar (port de U en core.js).
export const ML_POR_OZ = 29.5735;
export const G_POR_LB = 453.592;
export const G_POR_OZ_PESO = 28.3495;
export const MM_POR_IN = 25.4;

export type UnidadVolumen = "ml" | "oz";
export type UnidadPeso = "kg" | "lb";
export type UnidadLongitud = "cm" | "in";

const num = (v: number, d = 0) => String(Math.round(v * 10 ** d) / 10 ** d);

/** 118 ml → "4 oz" (a medias onzas) / "120 ml" */
export function fVolumen(ml: number, u: UnidadVolumen): string {
  return u === "oz" ? `${num(Math.round((ml / ML_POR_OZ) * 2) / 2, 1)} oz` : `${Math.round(ml)} ml`;
}
export function volumenEnUnidad(ml: number, u: UnidadVolumen): number {
  return u === "oz" ? Math.round((ml / ML_POR_OZ) * 2) / 2 : Math.round(ml / 5) * 5;
}
export function volumenAMl(v: number, u: UnidadVolumen): number {
  return Math.round(u === "oz" ? v * ML_POR_OZ : v);
}

/** Peso en libras y onzas (lo común en Guatemala): 7030 g → { lb: 15, oz: 8 } */
export function gramosALbOz(g: number): { lb: number; oz: number } {
  const ozTotal = Math.round(g / G_POR_OZ_PESO);
  return { lb: Math.floor(ozTotal / 16), oz: ozTotal % 16 };
}
export function lbOzAGramos(lb: number, oz: number): number {
  return Math.round(lb * G_POR_LB + oz * G_POR_OZ_PESO);
}
/** "15 lb 8 oz" o "7.03 kg" */
export function fPeso(g: number, u: UnidadPeso): string {
  if (u === "lb") {
    const { lb, oz } = gramosALbOz(g);
    return oz ? `${lb} lb ${oz} oz` : `${lb} lb`;
  }
  return `${num(g / 1000, 2)} kg`;
}
/** La otra unidad, para mostrar al lado. */
export function fPesoAlt(g: number, u: UnidadPeso): string {
  return fPeso(g, u === "lb" ? "kg" : "lb");
}

export function fLongitud(mm: number, u: UnidadLongitud): string {
  return u === "in" ? `${num(mm / MM_POR_IN, 1)} in` : `${num(mm / 10, 1)} cm`;
}
export function fLongitudAlt(mm: number, u: UnidadLongitud): string {
  return fLongitud(mm, u === "in" ? "cm" : "in");
}
export function longitudAMm(v: number, u: UnidadLongitud): number {
  return Math.round(u === "in" ? v * MM_POR_IN : v * 10);
}

export function fTemperatura(c: number): string {
  return `${num(c, 1)} °C`;
}
