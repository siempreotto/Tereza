// Tipos de evento, payloads (los del brief, en snake_case) y su descripción en texto.
import { z } from "zod";
import { fDuracion, fHora, MIN } from "./tiempo";
import { fTemperatura, fVolumen, type UnidadVolumen } from "./unidades";

export const TIPOS = ["sueno", "toma_pecho", "toma_biberon", "toma_solidos", "extraccion", "panal", "medicamento", "temperatura", "sintoma", "nota"] as const;
export type Tipo = (typeof TIPOS)[number];
export const TIPOS_LIMITADO: Tipo[] = ["sueno", "toma_pecho", "toma_biberon", "toma_solidos", "extraccion", "panal"];
export const TIPOS_TOMA: Tipo[] = ["toma_pecho", "toma_biberon", "toma_solidos"];
export const TIPOS_TIMER: Tipo[] = ["sueno", "toma_pecho", "extraccion"];

export const Lado = z.enum(["izq", "der"]);
export type LadoPecho = z.infer<typeof Lado>;

// Mismas reglas que payload_valido() en Postgres (pg_jsonschema): Zod valida antes, la base valida siempre.
export const Payloads = {
  sueno: z.object({
    lugar: z.enum(["cuna", "brazos", "carriola", "auto", "otro"]).optional(),
    como_se_durmio: z.enum(["solo", "arrullo", "pecho", "biberon"]).optional(),
    calidad: z.enum(["buena", "regular", "mala"]).optional(),
    animo_despertar: z.enum(["mal", "neutral", "bien"]).optional(),
    fin_sueno: z.enum(["natural", "despertado"]).optional(),
  }).strict(),
  toma_pecho: z.object({
    lado_inicial: Lado,
    segundos_izq: z.number().int().min(0).max(21600).optional(),
    segundos_der: z.number().int().min(0).max(21600).optional(),
    lado_activo: Lado.nullable().optional(),
    ultimo_lado: Lado.nullable().optional(),
    activo_desde: z.string().max(40).nullable().optional(),
  }).strict(),
  toma_biberon: z.object({
    contenido: z.enum(["materna", "formula", "mixta"]),
    volumen_ml: z.number().min(0).max(1000),
    sobrante_ml: z.number().min(0).max(1000).optional(),
  }).strict(),
  toma_solidos: z.object({
    alimentos: z.array(z.string().min(1).max(80)).min(1).max(20),
    cantidad: z.string().max(120).optional(),
    reaccion: z.string().max(280).optional(),
  }).strict(),
  extraccion: z.object({
    volumen_ml_izq: z.number().min(0).max(1000).optional(),
    volumen_ml_der: z.number().min(0).max(1000).optional(),
  }).strict(),
  panal: z.object({
    mojado: z.boolean(),
    sucio: z.boolean(),
    color: z.enum(["amarillo", "verde", "cafe", "negro", "rojo", "blanco", "otro"]).nullable().optional(),
    consistencia: z.enum(["liquida", "pastosa", "firme"]).nullable().optional(),
  }).strict(),
  medicamento: z.object({
    medication_id: z.uuid(),
    cantidad_textual: z.string().min(1).max(120),
    via: z.enum(["oral", "topica", "inhalada", "nasal", "otra"]).optional(),
  }).strict(),
  temperatura: z.object({
    valor_c: z.number().min(30).max(45),
    metodo: z.enum(["axilar", "rectal", "frente", "oido"]).optional(),
  }).strict(),
  sintoma: z.object({
    descripcion: z.string().min(1).max(500),
    severidad: z.enum(["leve", "moderado", "fuerte"]).nullable().optional(),
  }).strict(),
  nota: z.object({ texto: z.string().min(1).max(2000) }).strict(),
} as const;

export type Payload<T extends Tipo> = z.infer<(typeof Payloads)[T]>;

export type Evento = {
  id: string;
  tipo: Tipo;
  started_at: string;
  ended_at: string | null;
  payload: unknown;
  notas: string | null;
  logged_by: string | null;
  source: "web" | "mcp";
  version: number;
  eliminado_en?: string | null;
};

export const ms = (iso: string) => new Date(iso).getTime();

export const LUGAR: Record<string, string> = { cuna: "cuna", brazos: "brazos", carriola: "carriola", auto: "auto", otro: "otro lugar" };
export const COMO: Record<string, string> = { solo: "se durmió solo", arrullo: "con arrullo", pecho: "con pecho", biberon: "con biberón" };
export const CONTENIDO: Record<string, string> = { materna: "leche materna", formula: "fórmula", mixta: "mixta" };

export type Categoria = "sleep" | "feed" | "diaper" | "meds" | "temp" | "note";

/** Segundos por lado de una toma de pecho, contando el lado activo hasta `ahora`. */
export function segundosPecho(p: Payload<"toma_pecho">, enCurso: boolean, ahora: number): { izq: number; der: number; total: number } {
  let izq = p.segundos_izq ?? 0, der = p.segundos_der ?? 0;
  if (enCurso && p.lado_activo && p.activo_desde) {
    const extra = Math.max(0, (ahora - ms(p.activo_desde)) / 1000);
    if (p.lado_activo === "izq") izq += extra; else der += extra;
  }
  return { izq, der, total: izq + der };
}

export type Descripcion = { cat: Categoria; titulo: string; detalle: string; enCurso: boolean };

/** Título y detalle de un evento para listas, avisos y respuestas del MCP. */
export function describir(e: Evento, opts: { tz: string; unidadVolumen: UnidadVolumen; ahora: number; esNoche?: (ms: number) => boolean; nombreMedicamento?: (id: string) => string | undefined }): Descripcion {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const enCurso = !e.ended_at;
  switch (e.tipo) {
    case "sueno": {
      const fin = e.ended_at ? ms(e.ended_at) : opts.ahora;
      const noche = opts.esNoche ? opts.esNoche(ms(e.started_at)) : false;
      return { cat: "sleep", titulo: noche ? "Noche" : "Siesta", detalle: (enCurso ? "En curso" : fDuracion((fin - ms(e.started_at)) / MIN)) + (p.lugar ? ` · ${LUGAR[String(p.lugar)]}` : ""), enCurso };
    }
    case "toma_pecho": {
      const s = segundosPecho(p as Payload<"toma_pecho">, enCurso, opts.ahora);
      return { cat: "feed", titulo: "Toma de pecho", detalle: `Izq. ${Math.round(s.izq / 60)} min · Der. ${Math.round(s.der / 60)} min`, enCurso };
    }
    case "toma_biberon":
      return { cat: "feed", titulo: "Biberón", detalle: `${fVolumen(Number(p.volumen_ml ?? 0), opts.unidadVolumen)} de ${CONTENIDO[String(p.contenido)] ?? "leche"}${Number(p.sobrante_ml) ? ` · sobró ${fVolumen(Number(p.sobrante_ml), opts.unidadVolumen)}` : ""}`, enCurso: false };
    case "toma_solidos":
      return { cat: "feed", titulo: "Sólidos", detalle: `${(p.alimentos as string[] | undefined)?.join(", ") || "Sin detalle"}${p.cantidad ? ` · ${p.cantidad}` : ""}`, enCurso: false };
    case "extraccion":
      return { cat: "feed", titulo: "Extracción", detalle: `Izq. ${fVolumen(Number(p.volumen_ml_izq ?? 0), opts.unidadVolumen)} · Der. ${fVolumen(Number(p.volumen_ml_der ?? 0), opts.unidadVolumen)}`, enCurso };
    case "panal":
      return { cat: "diaper", titulo: "Pañal", detalle: p.mojado && p.sucio ? "Mojado y sucio" : p.sucio ? "Sucio" : "Mojado", enCurso: false };
    case "medicamento":
      return { cat: "meds", titulo: opts.nombreMedicamento?.(String(p.medication_id)) ?? "Medicamento", detalle: `${p.cantidad_textual ?? ""}${p.via ? ` · ${VIA[String(p.via)] ?? p.via}` : ""}`, enCurso: false };
    case "temperatura":
      return { cat: "temp", titulo: "Temperatura", detalle: `${fTemperatura(Number(p.valor_c))}${p.metodo ? ` · ${METODO[String(p.metodo)] ?? p.metodo}` : ""}`, enCurso: false };
    case "sintoma":
      return { cat: "temp", titulo: "Síntoma", detalle: String(p.descripcion ?? ""), enCurso: false };
    case "nota":
      return { cat: "note", titulo: "Nota", detalle: String(p.texto ?? ""), enCurso: false };
  }
}

export const VIA: Record<string, string> = { oral: "oral", topica: "tópica", inhalada: "inhalada", nasal: "nasal", otra: "otra vía" };
export const METODO: Record<string, string> = { axilar: "axilar", rectal: "rectal", frente: "frente", oido: "oído" };

/** «Guardé: biberón de 4 oz de leche materna, 2:00 p.m.» */
export function textoGuardado(e: Evento, opts: Parameters<typeof describir>[1]): string {
  const d = describir(e, opts);
  const detalle = d.detalle && e.tipo !== "sueno" ? `, ${d.detalle.toLowerCase()}` : "";
  return `Guardé: ${d.titulo.toLowerCase()}${detalle}, ${fHora(ms(e.started_at), opts.tz)}`;
}
