// Horas en lenguaje natural, en la zona del hogar. «A las 2» ambiguo → la ocurrencia pasada más reciente, y se avisa.
import { DIA, desdeLocal, fHora, MIN, partes, HORA } from "./tiempo";

export type HoraInterpretada = { ms: number; nota: string | null };

const NUM: Record<string, number> = { una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, media: 30, cuarto: 15, veinte: 20, treinta: 30, cuarenta: 40, quince: 15 };
const n = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUM[s] ?? NaN);

/** Interpreta ISO, «14:00», «2:30 pm», «a las 2», «a las 2 y media», «hace 20 minutos», «hace 1 hora», «ayer a las 10», «ahora». */
export function interpretarHora(texto: string | undefined | null, ahora: number, tz: string): HoraInterpretada | { error: string } {
  if (!texto || !texto.trim() || /^ahora( mismo)?$/i.test(texto.trim())) return { ms: ahora, nota: null };
  const t = texto.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  // ISO completo con zona: se respeta tal cual.
  if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}/.test(t) && /(z|[+-]\d{2}:?\d{2})$/.test(t)) {
    const v = Date.parse(texto);
    return Number.isNaN(v) ? { error: "No entendí la fecha." } : { ms: v, nota: null };
  }
  // ISO sin zona → hora local del hogar.
  const isoLocal = t.match(/^(\d{4})-(\d{2})-(\d{2})[t ](\d{2}):(\d{2})/);
  if (isoLocal) return { ms: desdeLocal(tz, +isoLocal[1], +isoLocal[2], +isoLocal[3], +isoLocal[4], +isoLocal[5]), nota: null };
  // «hace 20 minutos», «hace una hora», «hace 1 h 30 min», «hace media hora»
  const hace = t.match(/^hace (?:(\w+) (?:horas?|h))?(?: y)? ?(?:(\w+) (?:minutos?|min))?$/) ?? t.match(/^hace (media) hora$/);
  if (hace && (hace[1] || hace[2])) {
    if (hace[1] === "media") return { ms: ahora - 30 * MIN, nota: null };
    const h = hace[1] ? n(hace[1]) : 0, m = hace[2] ? n(hace[2]) : 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return { error: "No entendí cuánto tiempo hace." };
    return { ms: ahora - h * HORA - m * MIN, nota: null };
  }
  // «[ayer|hoy|anoche] [a las] 2[:30| y media| y cuarto] [am|pm|de la tarde|de la manana|de la noche|de la madrugada]» o «14:00»
  const re = /^(ayer |hoy |anoche |esta manana |esta tarde |esta noche )?(?:a la |a las )?(\w+)(?::(\d{2})| y (media|cuarto|\w+))?(?: ?(am|a\.m\.|a m|pm|p\.m\.|p m|de la manana|de la tarde|de la noche|de la madrugada|del mediodia))?$/;
  const m = t.match(re);
  if (!m) return { error: "No entendí la hora. Usa algo como «a las 2:30 p.m.», «14:30» o «hace 20 minutos»." };
  const [, dia, hs, mins, extra, suf] = m;
  let h = n(hs);
  const min = mins ? Number(mins) : extra ? (extra === "media" ? 30 : extra === "cuarto" ? 15 : n(extra)) : 0;
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return { error: "No entendí la hora." };
  const p = partes(ahora, tz);
  const baseDia = (offset: number) => ({ y: p.anio, mo: p.mes, d: p.dia + offset });
  let offset = dia?.startsWith("ayer") ? -1 : 0;
  const pm = suf && /(pm|p\.m\.|p m|tarde|noche)/.test(suf);
  const am = suf && /(am|a\.m\.|a m|manana|madrugada)/.test(suf);
  const tardeOnoche = dia && /(tarde|noche|anoche)/.test(dia);
  if (pm || tardeOnoche) { if (h < 12) h += 12; }
  else if (am && h === 12) h = 0;
  if (dia?.startsWith("anoche") && h < 18 && h >= 12) offset = -1;
  if (dia?.startsWith("anoche") && h >= 18) offset = -1;
  const explicito = h > 12 || h === 0 || pm || am || Boolean(dia && !/^hoy/.test(dia) && !/^esta/.test(dia)) || Boolean(tardeOnoche);
  const candidato = (hh: number, off: number) => { const b = baseDia(off); return desdeLocal(tz, b.y, b.mo, b.d, hh, min); };
  if (explicito) {
    let v = candidato(h, offset);
    let movida = false;
    if (!dia && v > ahora + 5 * MIN) { v -= DIA; movida = true; } // «a las 8 de la noche» a las 3 p.m. → la de ayer
    if (v > ahora + 5 * MIN) return { error: "Esa hora todavía no pasa. Si fue ayer, di «ayer a las…»." };
    return { ms: v, nota: movida ? `Tomé las ${fHora(v, tz)} de ayer, porque hoy todavía no son esa hora. Si fue otro día, dímelo y lo corrijo.` : null };
  }
  // Ambiguo (1–12 sin a.m./p.m.): la ocurrencia pasada más reciente entre a.m. y p.m. de hoy o ayer.
  const opciones = [candidato(h % 12, offset), candidato((h % 12) + 12, offset), candidato(h % 12, offset - 1), candidato((h % 12) + 12, offset - 1)].filter((v) => v <= ahora + 5 * MIN);
  const v = Math.max(...opciones);
  const cuando = partes(v, tz).dia !== p.dia ? "de ayer" : "de hoy";
  return { ms: v, nota: `Tomé «${texto.trim()}» como las ${fHora(v, tz)} ${cuando}. Si fue otra hora, dímelo y lo corrijo.` };
}
