// Plan del día de sueño y patrones aprendidos (en la zona del hogar).
// Es una estimación: combina lo que muestran los registros del bebé, la referencia por edad y, si el hogar
// lo eligió, su horario fijo. Nunca se presenta como indicación; el copy dice «estimación» y «referencia por edad».
import { ms, type Evento } from "./eventos";
import { edadMeses, esNoche, referenciaDia, type Hogar, type RefDia } from "./sueno";
import { DIA, enHora, fDuracion, fHora, HORA, inicioDia, MIN, partes, sumarDias } from "./tiempo";

export type Fuente = "registro" | "registros" | "edad" | "horario";

export type Bloque = {
  tipo: "despertar" | "siesta" | "dormir";
  /** Número de siesta (1, 2, …). */
  n?: number;
  estado: "hecho" | "en_curso" | "estimado";
  /** Hecho / en curso: horas reales. Estimado: franja de inicio (centro ± 15 min). */
  desde: number;
  hasta: number;
  /** Centro de la estimación o inicio real. */
  hora: number;
  /** Fin real (hecho) o estimado (siesta estimada o en curso). */
  fin?: number;
  duracionMin?: number;
  fuente: Fuente;
  /** Por qué esta hora, en una frase. */
  porQue: string;
};

export type Patrones = {
  diasConDatos: number;
  despertarMin: number | null;
  dormirMin: number | null;
  siestasPorDia: number | null;
  /** Días (de los últimos 7 con registros) con cada número de siestas. */
  conteoSiestas: Record<number, number>;
  porPosicion: { inicioMin: number | null; duracionMin: number | null; ventanaPreviaMin: number | null; dias: number }[];
  ventanaFinalMin: number | null;
  /** 48 medias horas desde la medianoche local: fracción de días con datos en que dormía en esa media hora. */
  franjas: number[];
};

export type PlanDia =
  | { estado: "sin_plan"; razon: string }
  | {
      estado: "ok";
      bloques: Bloque[];
      siguiente: Bloque | null;
      siestas: number;
      fuenteSiestas: Fuente;
      referencia: RefDia;
      patrones: Patrones;
      confianza: "alta" | "media" | "baja";
      avisos: string[];
      durmiendo: boolean;
      nota: string;
    };

const FRANJA = 15 * MIN;
const vivos = (evs: Evento[]) => evs.filter((e) => !e.eliminado_en && e.tipo === "sueno").sort((a, b) => ms(a.started_at) - ms(b.started_at));
const minDelDia = (t: number, tz: string) => { const p = partes(t, tz); return p.hora * 60 + p.minuto; };
const clamp = (v: number, [a, b]: [number, number]) => Math.max(a, Math.min(b, v));
const medio = ([a, b]: [number, number]) => Math.round((a + b) / 2);
const despertado = (e: Evento) => (e.payload as { fin_sueno?: string })?.fin_sueno === "despertado";

/** Mediana ponderada (los días recientes pesan más). */
export function medianaPonderada(xs: { v: number; peso: number }[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a.v - b.v);
  const total = s.reduce((t, x) => t + x.peso, 0);
  let acc = 0;
  for (const x of s) { acc += x.peso; if (acc >= total / 2) return x.v; }
  return s[s.length - 1].v;
}

type DiaSueno = { D: number; despertar: number | null; dormir: number | null; siestas: Evento[]; noche: Evento[] };

/** Desarma un día local en despertar de la mañana, siestas y hora de dormir. */
function desarmarDia(suenos: Evento[], D: number, ahora: number, h: Hogar): DiaSueno {
  const noche = esNoche(h);
  const D2 = sumarDias(D, 1, h.tz);
  const nocturnos = suenos.filter((e) => noche(ms(e.started_at)));
  // Despertar: fin del último sueño nocturno que termina entre la medianoche y el mediodía.
  const desp = nocturnos.filter((e) => e.ended_at && ms(e.ended_at) >= D && ms(e.ended_at) < D + 12 * HORA).sort((a, b) => ms(b.ended_at!) - ms(a.ended_at!))[0];
  const siestas = suenos.filter((e) => { const i = ms(e.started_at); return i >= D && i < D2 && !noche(i) && (e.ended_at ? ms(e.ended_at) : ahora) - i >= 10 * MIN; });
  const dormir = nocturnos.find((e) => { const i = ms(e.started_at); return i >= D + 15 * HORA && i < D2 + 3 * HORA; });
  return { D, despertar: desp ? ms(desp.ended_at!) : null, dormir: dormir ? ms(dormir.started_at) : null, siestas, noche: nocturnos };
}

/** Patrones de los últimos 14 días con registros (sin contar hoy). */
export function aprenderPatrones(evs: Evento[], ahora: number, h: Hogar, dias = 14): Patrones {
  const tz = h.tz;
  const suenos = vivos(evs);
  const hoy = inicioDia(ahora, tz);
  const desps: { v: number; peso: number }[] = [], dorms: { v: number; peso: number }[] = [];
  const pos: { ini: { v: number; peso: number }[]; dur: { v: number; peso: number }[]; ven: { v: number; peso: number }[]; dias: number }[] = [];
  const fin: { v: number; peso: number }[] = [];
  const conteo: Record<number, number> = {};
  const franjas = new Array(48).fill(0);
  let conDatos = 0, conteoDias = 0;
  for (let k = 1; k <= dias; k++) {
    const D = sumarDias(hoy, -k, tz), D2 = sumarDias(D, 1, tz);
    const delDia = suenos.filter((e) => ms(e.started_at) < D2 && (e.ended_at ? ms(e.ended_at) : ahora) > D);
    if (!delDia.length) continue;
    conDatos++;
    const peso = dias + 1 - k;
    const d = desarmarDia(suenos, D, ahora, h);
    if (d.despertar != null) desps.push({ v: minDelDia(d.despertar, tz), peso });
    if (d.dormir != null) dorms.push({ v: minDelDia(d.dormir, tz) + (minDelDia(d.dormir, tz) < 12 * 60 ? 1440 : 0), peso });
    const cerradas = d.siestas.filter((e) => e.ended_at);
    // El número de siestas solo cuenta en días completos (con despertar y hora de dormir registrados).
    if (k <= 7 && d.despertar != null && d.dormir != null) { conteo[cerradas.length] = (conteo[cerradas.length] ?? 0) + 1; conteoDias++; }
    let previo = d.despertar;
    cerradas.forEach((e, i) => {
      pos[i] ??= { ini: [], dur: [], ven: [], dias: 0 };
      pos[i].dias++;
      pos[i].ini.push({ v: minDelDia(ms(e.started_at), tz), peso });
      if (!despertado(e)) pos[i].dur.push({ v: (ms(e.ended_at!) - ms(e.started_at)) / MIN, peso });
      if (previo != null) pos[i].ven.push({ v: (ms(e.started_at) - previo) / MIN, peso });
      previo = ms(e.ended_at!);
    });
    if (previo != null && d.dormir != null && previo !== d.despertar) fin.push({ v: (d.dormir - previo) / MIN, peso });
    // Franjas: media hora contada si durmió al menos 15 min en ella.
    for (let s = 0; s < 48; s++) {
      const a = D + s * 30 * MIN, b = a + 30 * MIN;
      const dormido = delDia.reduce((t, e) => t + Math.max(0, Math.min(b, e.ended_at ? ms(e.ended_at) : ahora) - Math.max(a, ms(e.started_at))), 0);
      if (dormido >= 15 * MIN) franjas[s]++;
    }
  }
  const moda = Object.entries(conteo).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))[0];
  const r = (x: number | null) => (x == null ? null : Math.round(x));
  return {
    diasConDatos: conDatos,
    despertarMin: r(medianaPonderada(desps)),
    dormirMin: r(medianaPonderada(dorms)),
    siestasPorDia: conteoDias >= 3 && moda ? Number(moda[0]) : null,
    conteoSiestas: conteo,
    porPosicion: pos.map((p) => ({ inicioMin: r(medianaPonderada(p.ini)), duracionMin: r(medianaPonderada(p.dur)), ventanaPreviaMin: r(medianaPonderada(p.ven)), dias: p.dias })),
    ventanaFinalMin: r(medianaPonderada(fin)),
    franjas: franjas.map((n) => (conDatos ? n / conDatos : 0)),
  };
}

const hhmmAMin = (t: string) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };

/** Plan de hoy: despertar, siestas y hora de dormir, cada uno real o estimado con su fuente. */
export function planDelDia(evs: Evento[], bebe: { fechaNacimiento: string; semanasGestacion?: number | null; nombre?: string }, ahora: number, h: Hogar): PlanDia {
  const tz = h.tz;
  const meses = edadMeses(bebe.fechaNacimiento, ahora, bebe.semanasGestacion);
  const refBase = referenciaDia(meses);
  if (!refBase) return { estado: "sin_plan", razon: "Antes de las 8 semanas solo registramos; no armamos un plan del día." };
  const pat = aprenderPatrones(evs, ahora, h);
  const fijo = h.planModo === "fijo" && h.planFijo ? h.planFijo : null;
  const propias = !fijo && h.ventanasModo === "propias" && h.ventanasPropias?.length ? h.ventanasPropias : null;
  let n: number, fuenteSiestas: Fuente;
  if (fijo) { n = fijo.siestas.length; fuenteSiestas = "horario"; }
  else if (pat.siestasPorDia != null) { n = clamp(pat.siestasPorDia, refBase.rango); fuenteSiestas = "registros"; }
  else { n = refBase.siestas; fuenteSiestas = "edad"; }
  const ref = referenciaDia(meses, n) ?? refBase;
  if (!fijo) n = Math.min(n, ref.ventanas.length - 1);
  const D = inicioDia(ahora, tz);
  const suenos = vivos(evs);
  const hoy = desarmarDia(suenos, D, ahora, h);
  const noche = esNoche(h);
  const nombre = bebe.nombre ?? "el bebé";
  const nocturnoEnCurso = suenos.find((e) => !e.ended_at && noche(ms(e.started_at)));
  const bloques: Bloque[] = [];
  const conPat = pat.diasConDatos >= 3;

  // 1. Despertar
  let cursor: number;
  if (hoy.despertar != null) {
    cursor = hoy.despertar;
    bloques.push({ tipo: "despertar", estado: "hecho", desde: cursor, hasta: cursor, hora: cursor, fuente: "registro", porQue: "Hora registrada." });
  } else {
    let t: number, fuente: Fuente, porQue: string;
    if (fijo) { t = enHora(D, fijo.despertar, tz); fuente = "horario"; porQue = "Tu horario fijo."; }
    else if (conPat && pat.despertarMin != null) { t = D + pat.despertarMin * MIN; fuente = "registros"; porQue = `Su hora habitual de despertar en los últimos ${pat.diasConDatos} días.`; }
    else { t = enHora(D, h.horaDormir, tz) - 12 * HORA + 30 * MIN; fuente = "edad"; porQue = "Sin registros todavía: unas 11 h y media después de su hora de dormir."; }
    cursor = t;
    bloques.push({ tipo: "despertar", estado: nocturnoEnCurso ? "en_curso" : "estimado", desde: t - FRANJA, hasta: t + FRANJA, hora: t, fuente, porQue });
  }
  const desplazamiento = fijo && hoy.despertar != null ? hoy.despertar - enHora(D, fijo.despertar, tz) : 0;

  // 2. Siestas: las reales de hoy en orden, y las que faltan estimadas desde el último despertar.
  const reales = hoy.siestas;
  const dormirReal = hoy.dormir != null ? suenos.find((e) => ms(e.started_at) === hoy.dormir) ?? null : null;
  const objetivoDormir = (() => {
    if (fijo) return enHora(D, fijo.dormir, tz) + desplazamiento;
    if (conPat && pat.dormirMin != null) return D + pat.dormirMin * MIN;
    return enHora(D, h.horaDormir, tz);
  })();
  const total = Math.max(n, reales.length);
  for (let i = 0; i < total; i++) {
    const e = reales[i];
    const nn = i + 1;
    if (e) {
      const ini = ms(e.started_at);
      if (e.ended_at) {
        const fin = ms(e.ended_at);
        bloques.push({ tipo: "siesta", n: nn, estado: "hecho", desde: ini, hasta: fin, hora: ini, fin, duracionMin: Math.round((fin - ini) / MIN), fuente: "registro", porQue: "Registrada." });
        cursor = fin;
      } else {
        const dur = duracionEstimada(i);
        const fin = Math.max(ahora, ini + dur * MIN);
        bloques.push({ tipo: "siesta", n: nn, estado: "en_curso", desde: ini, hasta: fin, hora: ini, fin, duracionMin: dur, fuente: "registro", porQue: `En curso; suele durar unos ${fDuracion(dur)}.` });
        cursor = fin;
      }
      continue;
    }
    if (dormirReal) break; // ya se fue a dormir
    let centro: number, fuente: Fuente, porQue: string;
    const vRef = ref.ventanas[Math.min(i, ref.ventanas.length - 1)];
    if (fijo && fijo.siestas[i]) {
      centro = Math.max(enHora(D, fijo.siestas[i].inicio, tz) + desplazamiento, cursor + 30 * MIN);
      fuente = "horario"; porQue = "Tu horario fijo.";
    } else if (propias) {
      const w = propias[Math.min(i, propias.length - 1)];
      centro = cursor + w * MIN; fuente = "horario"; porQue = `Tus ventanas de vigilia: ${fDuracion(w)} despierta.`;
    } else {
      const aprendida = conPat ? pat.porPosicion[i]?.ventanaPreviaMin ?? null : null;
      if (aprendida != null && (pat.porPosicion[i]?.dias ?? 0) >= 3) {
        const w = clamp(aprendida, vRef);
        centro = cursor + w * MIN; fuente = "registros";
        porQue = `En sus últimos días estuvo despierta unos ${fDuracion(aprendida)} antes de esta siesta${w !== aprendida ? `; lo ajustamos a la referencia por edad (${fDuracion(vRef[0])} a ${fDuracion(vRef[1])})` : ""}.`;
      } else {
        const w = medio(vRef);
        centro = cursor + w * MIN; fuente = "edad";
        porQue = `Referencia por edad: ${fDuracion(vRef[0])} a ${fDuracion(vRef[1])} despierta antes de esta siesta.`;
      }
    }
    const dur = fijo?.siestas[i]?.duracion_min ?? duracionEstimada(i);
    // Si la siesta ya no cabe antes de dormir, no se estima (día con una siesta menos).
    const vFinal = ref.ventanas[ref.ventanas.length - 1];
    if (!fijo && centro + dur * MIN + Math.min(vFinal[0], 180) * MIN > objetivoDormir + 60 * MIN) break;
    bloques.push({ tipo: "siesta", n: nn, estado: "estimado", desde: centro - FRANJA, hasta: centro + FRANJA, hora: centro, fin: centro + dur * MIN, duracionMin: dur, fuente, porQue });
    cursor = centro + dur * MIN;
  }

  // 3. Dormir
  if (dormirReal) {
    const ini = ms(dormirReal.started_at);
    bloques.push({ tipo: "dormir", estado: dormirReal.ended_at ? "hecho" : "en_curso", desde: ini, hasta: ini, hora: ini, fuente: "registro", porQue: "Hora registrada." });
  } else {
    const vFinal = ref.ventanas[ref.ventanas.length - 1];
    let centro: number, fuente: Fuente, porQue: string;
    if (fijo) { centro = Math.max(objetivoDormir, cursor + 60 * MIN); fuente = "horario"; porQue = "Tu horario fijo."; }
    else {
      const w = conPat && pat.ventanaFinalMin != null ? clamp(pat.ventanaFinalMin, vFinal) : medio(vFinal);
      const porVentana = cursor + w * MIN;
      centro = Math.round((porVentana + objetivoDormir) / 2);
      centro = Math.max(centro, cursor + vFinal[0] * MIN - 30 * MIN);
      fuente = conPat && pat.dormirMin != null ? "registros" : "edad";
      porQue = fuente === "registros"
        ? `Combina su hora habitual de dormir (${fHora(objetivoDormir, tz)}) con unas ${fDuracion(w)} despierta desde la última siesta.`
        : `Combina la hora de dormir del hogar (${fHora(objetivoDormir, tz)}) con la referencia por edad: ${fDuracion(vFinal[0])} a ${fDuracion(vFinal[1])} despierta desde la última siesta.`;
    }
    bloques.push({ tipo: "dormir", estado: "estimado", desde: centro - FRANJA, hasta: centro + FRANJA, hora: centro, fuente, porQue });
  }

  // Siguiente: el primer bloque pendiente (en curso o estimado, que no terminó).
  const siguiente = bloques.find((b) => b.estado === "en_curso" || (b.estado === "estimado" && b.tipo !== "despertar")) ?? null;
  const avisos: string[] = [];
  const ultimaSiesta = reales.filter((e) => e.ended_at).at(-1);
  if (ultimaSiesta && ms(ultimaSiesta.ended_at!) - ms(ultimaSiesta.started_at) < 30 * MIN) avisos.push("La última siesta fue corta (menos de 30 min); el resto del día puede moverse.");
  const enfermo = evs.some((e) => !e.eliminado_en && ((e.tipo === "temperatura" && Number((e.payload as { valor_c?: number })?.valor_c) >= 38) || e.tipo === "sintoma") && ahora - ms(e.started_at) < DIA);
  if (enfermo) avisos.push("Hoy hay fiebre o síntomas registrados; el día puede ser distinto.");
  if (hoy.despertar == null && !nocturnoEnCurso) avisos.push(`Registra a qué hora despertó ${nombre} para afinar el plan.`);
  if (fuenteSiestas === "registros" && pat.siestasPorDia != null && pat.siestasPorDia < refBase.siestas) avisos.push(`En sus últimos días hizo ${pat.siestasPorDia} siesta${pat.siestasPorDia === 1 ? "" : "s"}: el plan sigue lo que muestran sus registros.`);
  let confianza: "alta" | "media" | "baja" = fijo ? "media" : pat.diasConDatos >= 5 ? "alta" : conPat ? "media" : "baja";
  if (enfermo || (ultimaSiesta && avisos[0]?.startsWith("La última"))) confianza = "baja";
  return {
    estado: "ok", bloques, siguiente, siestas: n, fuenteSiestas, referencia: ref, patrones: pat, confianza, avisos,
    durmiendo: suenos.some((e) => !e.ended_at),
    nota: `Estimación basada en la edad de ${nombre} y en sus últimos registros.`,
  };

  function duracionEstimada(i: number): number {
    const aprendida = conPat ? pat.porPosicion[i]?.duracionMin ?? null : null;
    return aprendida != null && (pat.porPosicion[i]?.dias ?? 0) >= 3 ? Math.round(clamp(aprendida, [20, 240])) : medio(ref.siestaMin);
  }
}

/** Nombre del bloque para mostrar: «Despertó», «Siesta 1», «Hora de dormir». */
export function nombreBloque(b: Bloque, totalSiestas: number): string {
  if (b.tipo === "despertar") return b.estado === "hecho" ? "Despertó" : "Despertar";
  if (b.tipo === "dormir") return "Hora de dormir";
  return totalSiestas === 1 ? "Siesta" : `Siesta ${b.n}`;
}

/** Texto para la cuenta regresiva: «Primera siesta en 1 h 43 min · cerca de las 9:52 a.m.». */
export function cuentaRegresiva(plan: Extract<PlanDia, { estado: "ok" }>, ahora: number, tz: string): { titulo: string; detalle: string } | null {
  const b = plan.siguiente;
  if (!b) return null;
  const nombre = b.tipo === "dormir" ? "Hora de dormir" : b.n === 1 ? "Primera siesta" : b.n === 2 ? "Segunda siesta" : b.n === 3 ? "Tercera siesta" : `Siesta ${b.n}`;
  if (b.estado === "en_curso") return { titulo: b.tipo === "siesta" ? `${nombre} en curso` : "Durmiendo", detalle: b.fin ? `Suele despertar cerca de las ${fHora(b.fin, tz)}` : "" };
  const faltan = Math.round((b.hora - ahora) / MIN);
  if (faltan >= 0) return { titulo: `${nombre} en ${fDuracion(faltan)}`, detalle: `cerca de las ${fHora(b.hora, tz)}` };
  return { titulo: `${nombre}: se estimaba hace ${fDuracion(-faltan)}`, detalle: `cerca de las ${fHora(b.hora, tz)}` };
}

export const minutosAHora = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
export { hhmmAMin };
