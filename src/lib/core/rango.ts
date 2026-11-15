// Horas elegidas en un selector «HH:MM» → instante, sin arrastrar el día entre cambios del selector.
import { DIA, enHora, inicioDia, MIN } from "./tiempo";

const TOLERANCIA = 5 * MIN;

/** «HH:MM» sobre el día de `base` (por defecto, hoy). Si queda en el futuro, es del día anterior. */
export function horaEnDia(hhmm: string, ahora: number, tz: string, base: number = ahora): number {
  let n = enHora(inicioDia(base, tz), hhmm, tz);
  if (n > ahora + TOLERANCIA) n -= DIA;
  return n;
}

/** Rango de un sueño que ya pasó: si el fin queda antes del inicio, cruza la medianoche sin terminar en el futuro. */
export function rangoSueno(inicio: number, fin: number, ahora: number): { inicio: number; fin: number; minutos: number; futuro: boolean } {
  let a = inicio, b = fin;
  if (b <= a) {
    if (b + DIA <= ahora + TOLERANCIA) b += DIA;
    else a -= DIA;
  }
  return { inicio: a, fin: b, minutos: Math.round((b - a) / MIN), futuro: b > ahora + TOLERANCIA };
}

/** «hoy», «ayer» o la fecha corta, para mostrar junto a una hora. */
export function etiquetaCorta(t: number, ahora: number, tz: string): string {
  const d = inicioDia(t, tz), h = inicioDia(ahora, tz);
  if (d === h) return "hoy";
  if (d === inicioDia(h - DIA / 2, tz)) return "ayer";
  if (d > h) return "mañana";
  return new Intl.DateTimeFormat("es", { timeZone: tz, day: "numeric", month: "short" }).format(new Date(t));
}
