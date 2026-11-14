import "server-only";
import { ErrorMcp, type Ctx } from "./contexto";
import { interpretarHora } from "@/lib/core/horaNatural";
import { describir, Payloads, type Evento, type Tipo } from "@/lib/core/eventos";
import { esNoche } from "@/lib/core/sueno";
import { desdeLocal, inicioDia, sumarDias } from "@/lib/core/tiempo";
import { lbOzAGramos, longitudAMm, ML_POR_OZ, type UnidadVolumen } from "@/lib/core/unidades";
import type { Json } from "@/lib/db/types";

export type Respuesta = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };

/** Texto en español para la persona + datos estructurados para Claude. */
export function ok(texto: string, datos: Record<string, unknown> = {}): Respuesta {
  return { content: [{ type: "text", text: `${texto}\n\n${JSON.stringify(datos)}` }], structuredContent: datos };
}
export function fallo(codigo: string, texto: string): Respuesta {
  return { content: [{ type: "text", text: texto }], structuredContent: { codigo, error: texto }, isError: true };
}

export const COLS = "id, tipo, started_at, ended_at, payload, notas, logged_by, source, version, eliminado_en";

/** Hora natural o ISO → instante; con la nota si hubo que desambiguar. */
export function hora(ctx: Ctx, texto: string | undefined | null): { ms: number; nota: string | null } {
  const r = interpretarHora(texto, ctx.ahora, ctx.ajustes.tz);
  if ("error" in r) throw new ErrorMcp("VALIDACION", r.error);
  return r;
}

/** Fecha local "AAAA-MM-DD", «hoy», «ayer» o natural → medianoche local de ese día. */
export function dia(ctx: Ctx, texto: string | undefined | null, porDefecto: number): number {
  if (!texto) return porDefecto;
  const t = texto.trim().toLowerCase();
  if (t === "hoy") return inicioDia(ctx.ahora, ctx.ajustes.tz);
  if (t === "ayer") return sumarDias(inicioDia(ctx.ahora, ctx.ajustes.tz), -1, ctx.ajustes.tz);
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return desdeLocal(ctx.ajustes.tz, +m[1], +m[2], +m[3]);
  return inicioDia(hora(ctx, texto).ms, ctx.ajustes.tz);
}

export const opcionesDescripcion = (ctx: Ctx, nombresMed?: Record<string, string>) => ({
  tz: ctx.ajustes.tz, unidadVolumen: ctx.ajustes.unidadVolumen, ahora: ctx.ahora, esNoche: esNoche(ctx.ajustes),
  nombreMedicamento: (id: string) => nombresMed?.[id],
});

export function eventoOut(ctx: Ctx, e: Evento, nombres: Record<string, string> = {}, nombresMed?: Record<string, string>) {
  const d = describir(e, opcionesDescripcion(ctx, nombresMed));
  return {
    event_id: e.id, tipo: e.tipo, started_at: e.started_at, ended_at: e.ended_at, payload: e.payload, notas: e.notas,
    logged_by_nombre: nombres[e.logged_by ?? ""] ?? null, source: e.source, version: e.version,
    resumen_texto: `${d.titulo}: ${d.detalle}`, en_curso: d.enCurso,
  };
}

const vol = (v: unknown, unidad: UnidadVolumen): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ErrorMcp("VALIDACION", "El volumen tiene que ser un número.");
  return unidad === "oz" ? Math.round(n * ML_POR_OZ) : Math.round(n);
};

/** Convierte los «detalles» que manda Claude (en la unidad del hogar o la indicada) al payload métrico validado. */
export function normalizarPayload(ctx: Ctx, tipo: Tipo, d: Record<string, unknown> = {}): Json {
  const u = (d.unidad === "ml" || d.unidad === "oz" ? d.unidad : ctx.ajustes.unidadVolumen) as UnidadVolumen;
  let p: Record<string, unknown>;
  switch (tipo) {
    case "sueno": p = { lugar: d.lugar, como_se_durmio: d.como_se_durmio === "sola" ? "solo" : d.como_se_durmio, calidad: d.calidad }; break;
    case "toma_pecho": p = { lado_inicial: d.lado_inicial ?? d.lado ?? "izq", segundos_izq: d.minutos_izq != null ? Math.round(Number(d.minutos_izq) * 60) : d.segundos_izq, segundos_der: d.minutos_der != null ? Math.round(Number(d.minutos_der) * 60) : d.segundos_der }; break;
    case "toma_biberon": p = { contenido: d.contenido ?? "materna", volumen_ml: vol(d.volumen ?? d.volumen_ml, d.volumen_ml != null && d.volumen == null ? "ml" : u), sobrante_ml: vol(d.sobrante ?? d.sobrante_ml, d.sobrante_ml != null && d.sobrante == null ? "ml" : u) }; break;
    case "toma_solidos": p = { alimentos: Array.isArray(d.alimentos) ? d.alimentos : String(d.alimentos ?? "").split(",").map((x) => x.trim()).filter(Boolean), cantidad: d.cantidad, reaccion: d.reaccion }; break;
    case "extraccion": p = { volumen_ml_izq: vol(d.volumen_izq ?? d.volumen_ml_izq, d.volumen_ml_izq != null && d.volumen_izq == null ? "ml" : u), volumen_ml_der: vol(d.volumen_der ?? d.volumen_ml_der, d.volumen_ml_der != null && d.volumen_der == null ? "ml" : u) }; break;
    case "panal": p = { mojado: Boolean(d.mojado), sucio: Boolean(d.sucio), color: d.color, consistencia: d.consistencia }; break;
    case "temperatura": p = { valor_c: Number(d.valor_c ?? d.valor), metodo: d.metodo === "oído" ? "oido" : d.metodo }; break;
    case "sintoma": p = { descripcion: d.descripcion, severidad: d.severidad }; break;
    case "nota": p = { texto: d.texto }; break;
    case "medicamento": p = { medication_id: d.medication_id, cantidad_textual: d.cantidad_textual, via: d.via }; break;
  }
  const limpio = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  if (tipo === "panal" && !limpio.mojado && !limpio.sucio) throw new ErrorMcp("VALIDACION", "Dime si el pañal estaba mojado, sucio o ambos.");
  const r = Payloads[tipo].safeParse(limpio);
  if (!r.success) throw new ErrorMcp("VALIDACION", `Faltan o no son válidos algunos datos del registro (${r.error.issues.map((i) => i.path.join(".") || i.message).join(", ")}).`);
  return r.data as Json;
}

export async function nombresMiembros(ctx: Ctx): Promise<Record<string, string>> {
  const { data } = await ctx.db.from("members").select("user_id, nombre_visible").eq("household_id", ctx.hogarId);
  return Object.fromEntries((data ?? []).map((m) => [m.user_id, m.nombre_visible]));
}
export async function nombresMedicamentos(ctx: Ctx, babyId: string): Promise<Record<string, string>> {
  if (ctx.rol === "limitado") return {};
  const { data } = await ctx.db.from("medications").select("id, nombre").eq("baby_id", babyId);
  return Object.fromEntries((data ?? []).map((m) => [m.id, m.nombre]));
}

/** Eventos recientes para estado y predicción (RLS decide qué ve cada rol). */
export async function eventosDesde(ctx: Ctx, babyId: string, desde: number, hasta?: number): Promise<Evento[]> {
  let q = ctx.db.from("events").select(COLS).eq("baby_id", babyId).is("eliminado_en", null).gte("started_at", new Date(desde).toISOString());
  if (hasta) q = q.lt("started_at", new Date(hasta).toISOString());
  const { data, error } = await q.order("started_at", { ascending: false }).limit(3000);
  if (error) throw new ErrorMcp("ERROR", "No pudimos leer los registros.");
  return (data ?? []) as Evento[];
}

export function errorDeBase(e: { code?: string; message?: string } | null, accion: string): ErrorMcp {
  if (e?.code === "23505") return new ErrorMcp("CONFLICTO", "Ya hay uno en curso de ese tipo. No lo dupliqué.");
  if (e?.code === "42501" || e?.message?.includes("row-level security")) return new ErrorMcp("PERMISO", `Tu rol no permite ${accion}.`);
  if (e?.code === "23514") return new ErrorMcp("VALIDACION", "Esos datos no pasan la validación (revisa horas y valores).");
  return new ErrorMcp("ERROR", `No pudimos ${accion}. Vuelve a intentarlo.`);
}

export { lbOzAGramos, longitudAMm };
