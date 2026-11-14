// Fechas y horas en la zona del hogar (port de core.js sin depender de la hora del navegador).
export const MIN = 60_000;
export const HORA = 3_600_000;
export const DIA = 86_400_000;

export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const DIAS_CORTOS = ["D", "L", "M", "M", "J", "V", "S"] as const;
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const;

export type Partes = { anio: number; mes: number; dia: number; hora: number; minuto: number; segundo: number; diaSemana: number };

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" });
    cache.set(tz, f);
  }
  return f;
}
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Partes de un instante en la zona dada. */
export function partes(ms: number, tz: string): Partes {
  const p: Record<string, string> = {};
  for (const { type, value } of fmt(tz).formatToParts(new Date(ms))) p[type] = value;
  return { anio: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour % 24, minuto: +p.minute, segundo: +p.second, diaSemana: DOW[p.weekday] ?? 0 };
}

/** Instante (ms) de una hora local en la zona dada. Resuelve el desfase iterando (sirve con DST). */
export function desdeLocal(tz: string, anio: number, mes: number, dia: number, hora = 0, minuto = 0): number {
  let guess = Date.UTC(anio, mes - 1, dia, hora, minuto);
  for (let i = 0; i < 3; i++) {
    const p = partes(guess, tz);
    const local = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
    const delta = Date.UTC(anio, mes - 1, dia, hora, minuto) - local;
    if (delta === 0) break;
    guess += delta;
  }
  return guess;
}

/** Medianoche local del día que contiene `ms`. */
export function inicioDia(ms: number, tz: string): number {
  const p = partes(ms, tz);
  return desdeLocal(tz, p.anio, p.mes, p.dia);
}

export function sumarDias(ms: number, n: number, tz: string): number {
  const p = partes(ms, tz);
  return desdeLocal(tz, p.anio, p.mes, p.dia + n, p.hora, p.minuto);
}

/** Fecha local como "AAAA-MM-DD". */
export function fechaISO(ms: number, tz: string): string {
  const p = partes(ms, tz);
  return `${p.anio}-${String(p.mes).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

/** Instante de una hora "HH:MM" dentro del día local de `diaMs`. */
export function enHora(diaMs: number, hhmm: string, tz: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const p = partes(diaMs, tz);
  return desdeLocal(tz, p.anio, p.mes, p.dia, h, m);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2:05 p.m." */
export function fHora(ms: number, tz: string): string {
  const p = partes(ms, tz);
  const ap = p.hora < 12 ? "a.m." : "p.m.";
  return `${p.hora % 12 || 12}:${pad(p.minuto)} ${ap}`;
}

/** "1 h 12 min" / "45 min" / "2 h" */
export function fDuracion(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "hace 20 min" / "ahora" */
export function fHace(ms: number, ahora: number): string {
  const m = (ahora - ms) / MIN;
  return m < 1 ? "ahora" : `hace ${fDuracion(m)}`;
}

/** "01:12:45" */
export function fReloj(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "12:45" */
export function fMinSeg(seg: number): string {
  const s = Math.max(0, Math.floor(seg));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado 7 de noviembre" */
export function fFecha(ms: number, tz: string): string {
  const p = partes(ms, tz);
  return `${cap(DIAS[p.diaSemana])} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/** "Hoy" / "Ayer" / "Jue 5 nov" */
export function etiquetaDia(ms: number, ahora: number, tz: string): string {
  const a = inicioDia(ms, tz), b = inicioDia(ahora, tz);
  if (a === b) return "Hoy";
  if (a === sumarDias(b, -1, tz)) return "Ayer";
  const p = partes(ms, tz);
  return `${cap(DIAS[p.diaSemana]).slice(0, 3)} ${p.dia} ${MESES[p.mes - 1].slice(0, 3)}`;
}

/** ¿Un instante cae dentro de una ventana "HH:MM"–"HH:MM" local (puede cruzar medianoche)? */
export function enVentana(ms: number, desde: string, hasta: string, tz: string): boolean {
  const p = partes(ms, tz);
  const m = p.hora * 60 + p.minuto;
  const [dh, dm] = desde.split(":").map(Number), [hh, hm] = hasta.split(":").map(Number);
  const d = dh * 60 + dm, h = hh * 60 + hm;
  return d > h ? m >= d || m < h : m >= d && m < h;
}
