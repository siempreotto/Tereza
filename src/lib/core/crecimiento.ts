// Percentiles de la OMS por edad corregida (tablas LMS oficiales, 0–24 meses). Es una comparación, no un diagnóstico.
import oms from "@/data/who/oms.json";

export type Indicador = "peso" | "longitud" | "perimetro";
type LMS = [number, number, number];
const T = oms.indicadores as Record<Indicador, Record<"M" | "F", LMS[]>>;
export const EDAD_MAX_DIAS = oms.edadMaxDias;

function lms(ind: Indicador, sexo: "M" | "F", dias: number): LMS | null {
  if (dias < 0 || dias > EDAD_MAX_DIAS) return null;
  const a = Math.floor(dias), b = Math.min(EDAD_MAX_DIAS, a + 1), f = dias - a;
  const x = T[ind][sexo][a], y = T[ind][sexo][b];
  return [x[0] + (y[0] - x[0]) * f, x[1] + (y[1] - x[1]) * f, x[2] + (y[2] - x[2]) * f];
}

const valorZ = ([L, M, S]: LMS, z: number) => (L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L));

/** Puntaje z de la OMS. Para peso y perímetro, por fuera de ±3 aplica el ajuste de la OMS (distancia SD23). */
export function puntajeZ(ind: Indicador, sexo: "M" | "F", dias: number, valor: number): number | null {
  const p = lms(ind, sexo, dias);
  if (!p || !(valor > 0)) return null;
  const [L, M, S] = p;
  const z = L === 0 ? Math.log(valor / M) / S : (Math.pow(valor / M, L) - 1) / (L * S);
  if (ind === "longitud" || Math.abs(z) <= 3) return z;
  if (z > 3) { const sd3 = valorZ(p, 3), sd23 = sd3 - valorZ(p, 2); return 3 + (valor - sd3) / sd23; }
  const sd3 = valorZ(p, -3), sd23 = valorZ(p, -2) - sd3; return -3 + (valor - sd3) / sd23;
}

// Función de distribución normal (Abramowitz-Stegun 26.2.17).
export function phi(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function percentil(ind: Indicador, sexo: "M" | "F", dias: number, valor: number): number | null {
  const z = puntajeZ(ind, sexo, dias, valor);
  return z == null ? null : Math.round(phi(z) * 1000) / 10;
}

export function textoPercentil(p: number | null): string {
  if (p == null) return "sin percentil (fuera de 0 a 24 meses)";
  if (p < 3) return "menor al percentil 3";
  if (p > 97) return "mayor al percentil 97";
  return `percentil ${Math.round(p)}`;
}

/** Valores de las curvas P3, P15, P50, P85 y P97 a una edad, en la unidad de la tabla (kg o cm). */
const Z_CURVAS = { p3: -1.881, p15: -1.036, p50: 0, p85: 1.036, p97: 1.881 } as const;
export function curvas(ind: Indicador, sexo: "M" | "F", dias: number): Record<keyof typeof Z_CURVAS, number> | null {
  const p = lms(ind, sexo, dias);
  if (!p) return null;
  return Object.fromEntries(Object.entries(Z_CURVAS).map(([k, z]) => [k, valorZ(p, z)])) as Record<keyof typeof Z_CURVAS, number>;
}

/** Edad en días para las curvas: corregida hasta los 24 meses si nació antes de las 37 semanas. */
export function edadDias(fechaNacimiento: string, medidoEn: number, semanasGestacion?: number | null): number {
  const nac = Date.UTC(+fechaNacimiento.slice(0, 4), +fechaNacimiento.slice(5, 7) - 1, +fechaNacimiento.slice(8, 10), 12);
  const real = (medidoEn - nac) / 86_400_000;
  if (semanasGestacion && semanasGestacion < 37) {
    const corregida = real - (40 - semanasGestacion) * 7;
    if (corregida < 731) return Math.max(0, corregida);
  }
  return Math.max(0, real);
}
