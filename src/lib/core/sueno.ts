// Sueño por día, referencia por edad, ventanas de vigilia y predictor (port de core.js, en la zona del hogar).
import { DIA, enHora, enVentana, fDuracion, HORA, inicioDia, MIN, sumarDias } from "./tiempo";
import { ms, type Evento } from "./eventos";

export type Hogar = { tz: string; nocheDesde: string; nocheHasta: string; horaDormir: string; ventanasModo: "auto" | "propias"; ventanasPropias: number[] | null };

export const esNoche = (h: Pick<Hogar, "tz" | "nocheDesde" | "nocheHasta">) => (inicio: number) => enVentana(inicio, h.nocheDesde, h.nocheHasta, h.tz);

/** Referencias de sueño en 24 h (AASM/AAP; NSF orientativa antes de 4 meses). */
export function referenciaSueno(meses: number): { minH: number; maxH: number; texto: string } {
  if (meses < 4) return { minH: 14, maxH: 17, texto: "Referencia orientativa por edad: 14 a 17 h" };
  if (meses < 12) return { minH: 12, maxH: 16, texto: "Referencia por edad: 12 a 16 h" };
  return { minH: 11, maxH: 14, texto: "Referencia por edad: 11 a 14 h" };
}

/** Ventana de vigilia típica por edad corregida (heurística editable), en minutos. null antes de 8 semanas. */
export function ventanaVigilia(meses: number): [number, number] | null {
  if (meses < 1.85) return null;
  if (meses < 3) return [60, 90];
  if (meses < 4) return [75, 120];
  if (meses < 5) return [90, 150];
  if (meses < 7) return [120, 180];
  if (meses < 9) return [150, 210];
  if (meses < 13) return [180, 240];
  return [240, 360];
}

/** Edad en meses (decimal), corregida hasta 24 meses si nació antes de las 37 semanas. */
export function edadMeses(fechaNacimiento: string, ahora: number, semanasGestacion?: number | null): number {
  const nacimiento = Date.UTC(+fechaNacimiento.slice(0, 4), +fechaNacimiento.slice(5, 7) - 1, +fechaNacimiento.slice(8, 10), 12);
  const real = (ahora - nacimiento) / (DIA * 30.4375);
  if (semanasGestacion && semanasGestacion < 37) {
    const corregida = real - ((40 - semanasGestacion) * 7) / 30.4375;
    if (corregida < 24) return Math.max(0, corregida);
  }
  return Math.max(0, real);
}

const solape = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
const vivos = (evs: Evento[]) => evs.filter((e) => !e.eliminado_en);

export type SuenoDia = { totalMin: number; nocheMin: number; siestasMin: number; siestas: number };

/** Sueño dentro del día local [D, D+1), cortado a medianoche. */
export function suenoDelDia(evs: Evento[], diaMs: number, ahora: number, h: Hogar): SuenoDia {
  const D = inicioDia(diaMs, h.tz), D2 = sumarDias(D, 1, h.tz);
  const noche = esNoche(h);
  let total = 0, n = 0, s = 0, siestas = 0;
  for (const e of vivos(evs)) {
    if (e.tipo !== "sueno") continue;
    const ini = ms(e.started_at), fin = e.ended_at ? ms(e.ended_at) : ahora;
    const o = solape(ini, fin, D, D2);
    if (!o) continue;
    total += o;
    if (noche(ini)) n += o;
    else { s += o; if (ini >= D && ini < D2) siestas++; }
  }
  return { totalMin: total / MIN, nocheMin: n / MIN, siestasMin: s / MIN, siestas };
}

export type Prediccion =
  | { estado: "durmiendo" }
  | { estado: "sin_prediccion"; razon: string }
  | {
      estado: "ok";
      tipo: "siesta" | "dormir";
      desde: number;
      hasta: number;
      confianza: "alta" | "media" | "baja";
      base: string;
      rangoEdadMin: [number, number];
      ajustadoAlRango: boolean;
      ultimoDespertar: number;
      avisos: string[];
      usaVentanasPropias: boolean;
    };

/** Predictor de próxima siesta u hora de dormir: heurística transparente (brief §9). */
export function predecir(evs: Evento[], bebe: { fechaNacimiento: string; semanasGestacion?: number | null }, ahora: number, h: Hogar): Prediccion {
  const ev = vivos(evs);
  const meses = edadMeses(bebe.fechaNacimiento, ahora, bebe.semanasGestacion);
  const rango = ventanaVigilia(meses);
  if (!rango) return { estado: "sin_prediccion", razon: "Antes de las 8 semanas solo registramos; no estimamos." };
  const suenos = ev.filter((e) => e.tipo === "sueno").sort((a, b) => ms(a.started_at) - ms(b.started_at));
  if (suenos.some((s) => !s.ended_at)) return { estado: "durmiendo" };
  const ultimo = suenos.filter((s) => s.ended_at).at(-1);
  if (!ultimo?.ended_at) return { estado: "sin_prediccion", razon: "Faltan registros de sueño para estimar." };
  const noche = esNoche(h);
  const hoy = inicioDia(ahora, h.tz);
  const siestasHoy = suenos.filter((s) => ms(s.started_at) >= hoy && !noche(ms(s.started_at))).length;
  const pos = Math.min(siestasHoy, 3); // 0..2 siesta, 3 noche
  const horaDormir = enHora(hoy, h.horaDormir, h.tz);
  let ventana: number, base: string, conf: Prediccion extends { confianza: infer C } ? C : "alta" | "media" | "baja" = "media";
  const propias = h.ventanasModo === "propias" && h.ventanasPropias?.length;
  if (propias) {
    ventana = h.ventanasPropias![Math.min(pos, h.ventanasPropias!.length - 1)];
    base = "Usa las ventanas de vigilia que configuraste.";
  } else {
    const muestras: { w: number; peso: number }[] = [];
    for (let k = 1; k <= 7; k++) {
      const D = sumarDias(hoy, -k, h.tz), D2 = sumarDias(D, 1, h.tz);
      const siestas = suenos.filter((s) => { const i = ms(s.started_at); return i >= D && i < D2 && !noche(i) && s.ended_at && ms(s.ended_at) - i >= 30 * MIN; });
      const despertar = suenos.filter((s) => s.ended_at && ms(s.ended_at) >= D && ms(s.ended_at) < D + 9 * HORA && noche(ms(s.started_at))).at(-1);
      const cadena = [despertar, ...siestas];
      const objetivo = pos < 3 ? siestas[pos] : suenos.find((s) => { const i = ms(s.started_at); return noche(i) && i >= D + 17 * HORA && i < D2; });
      const previo = pos < 3 ? cadena[pos] : siestas.at(-1);
      if (objetivo && previo?.ended_at) muestras.push({ w: (ms(objetivo.started_at) - ms(previo.ended_at)) / MIN, peso: 8 - k });
    }
    if (!muestras.length) {
      ventana = (rango[0] + rango[1]) / 2;
      base = "Sin suficientes registros: usamos el punto medio de la referencia por edad.";
      conf = "baja";
    } else {
      muestras.sort((a, b) => a.w - b.w);
      const totalPeso = muestras.reduce((s, x) => s + x.peso, 0);
      let acc = 0; ventana = muestras[0].w;
      for (const m of muestras) { acc += m.peso; if (acc >= totalPeso / 2) { ventana = m.w; break; } }
      const dispersion = muestras[muestras.length - 1].w - muestras[0].w;
      conf = muestras.length >= 5 && dispersion < 45 ? "alta" : muestras.length >= 3 ? "media" : "baja";
      base = `Mediana ponderada de sus últimos ${muestras.length} días, antes de ${pos < 3 ? `la ${pos + 1}.ª siesta` : "la hora de dormir"}: ${fDuracion(ventana)}.`;
    }
  }
  const acotada = Math.max(rango[0], Math.min(rango[1], ventana));
  const fin = ms(ultimo.ended_at);
  let centro = fin + acotada * MIN;
  let tipo: "siesta" | "dormir" = pos < 3 ? "siesta" : "dormir";
  if (pos >= 3 || centro > horaDormir - 30 * MIN) { tipo = "dormir"; centro = Math.round((centro + horaDormir) / 2); }
  const avisos: string[] = [];
  const ultimaCorta = fin - ms(ultimo.started_at) < 30 * MIN && !noche(ms(ultimo.started_at));
  if (ultimaCorta) { avisos.push("La última siesta fue corta (menos de 30 min), así que confiamos menos."); if (conf !== "baja") conf = conf === "alta" ? "media" : "baja"; }
  const enfermo = ev.some((e) => ((e.tipo === "temperatura" && Number((e.payload as { valor_c?: number })?.valor_c) >= 38) || e.tipo === "sintoma") && ahora - ms(e.started_at) < DIA);
  if (enfermo) { avisos.push("Hoy hay fiebre o síntomas registrados; el día puede ser atípico."); conf = "baja"; }
  if (propias) avisos.push("Usa tus ventanas de vigilia, no la referencia por edad.");
  return { estado: "ok", tipo, desde: centro - 15 * MIN, hasta: centro + 15 * MIN, confianza: conf, base, rangoEdadMin: rango, ajustadoAlRango: acotada !== ventana, ultimoDespertar: fin, avisos, usaVentanasPropias: !!propias };
}
