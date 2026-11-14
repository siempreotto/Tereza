"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { contexto } from "@/lib/auth/session";
import { Lado, Payloads, TIPOS, TIPOS_LIMITADO, type Evento, type Tipo } from "@/lib/core/eventos";
import type { Json } from "@/lib/db/types";
import type { Resultado } from "./hogar";

const COLS = "id, tipo, started_at, ended_at, payload, notas, logged_by, source, version, eliminado_en";
const iso = z.iso.datetime({ offset: true });

type Sesion = { c: Awaited<ReturnType<typeof contexto>> & { hogar: { id: string; nombre: string }; miembro: { id: string; nombre: string; rol: "admin" | "cuidador" | "limitado" } }; db: Awaited<ReturnType<typeof supabaseServer>> };

async function sesion(): Promise<{ error: string } | Sesion> {
  const c = await contexto();
  if (!c?.hogar || !c.miembro) return { error: "Tu sesión venció. Vuelve a entrar." };
  return { c: c as Sesion["c"], db: await supabaseServer() };
}

function validarPayload(tipo: Tipo, payload: unknown): { ok: true; payload: Json } | { ok: false; error: string } {
  const r = Payloads[tipo].safeParse(payload ?? {});
  if (!r.success) return { ok: false, error: "Revisa los datos del registro: " + (r.error.issues[0]?.message ?? "no son válidos") };
  return { ok: true, payload: r.data as Json };
}

function errorBase(e: { code?: string; message?: string } | null, accion: string): string {
  if (e?.code === "23505") return "Ya hay uno en curso. No lo dupliqué.";
  if (e?.code === "42501" || e?.message?.includes("row-level security")) return "Tu rol no permite " + accion + ".";
  if (e?.code === "23514") return "Esos datos no pasan la validación de la base.";
  return "No pudimos " + accion + ". Revisa tu conexión y vuelve a intentarlo.";
}

const Registrar = z.object({
  babyId: z.uuid(),
  tipo: z.enum(TIPOS),
  startedAt: iso,
  endedAt: iso.nullable().optional(),
  payload: z.unknown().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
  clientOpId: z.uuid().optional(),
});
export type RegistrarInput = z.input<typeof Registrar>;

/** Registra un evento (puntual, pasado o temporizador si endedAt es null en tipos timer). */
export async function registrarEvento(input: RegistrarInput): Promise<Resultado<{ evento: Evento; yaExistia: boolean }>> {
  const p = Registrar.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa los datos: " + (p.error.issues[0]?.message ?? "") };
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  const v = p.data;
  if (s.c.miembro.rol === "limitado" && !TIPOS_LIMITADO.includes(v.tipo)) return { ok: false, error: "Tu rol permite registrar sueño, tomas y pañales. Para lo demás, pregúntale a quien administra el hogar." };
  const pv = validarPayload(v.tipo, v.payload);
  if (!pv.ok) return pv;
  if (v.endedAt && v.endedAt < v.startedAt) return { ok: false, error: "La hora de fin no puede ser antes del inicio." };
  // Idempotencia: si la cola offline reenvía la misma operación, devuelve la existente.
  if (v.clientOpId) {
    const { data: previo } = await s.db.from("events").select(COLS).eq("client_op_id", v.clientOpId).maybeSingle();
    if (previo) return { ok: true, data: { evento: previo as Evento, yaExistia: true } };
  }
  const { data, error } = await s.db
    .from("events")
    .insert({ baby_id: v.babyId, household_id: s.c.hogar.id, tipo: v.tipo, started_at: v.startedAt, ended_at: v.endedAt ?? null, payload: pv.payload, notas: v.notas ?? null, logged_by: s.c.userId, source: "web", client_op_id: v.clientOpId ?? null })
    .select(COLS)
    .single();
  if (error || !data) {
    if (error?.code === "23505" && !v.clientOpId) {
      const { data: activo } = await s.db.from("events").select(COLS).eq("baby_id", v.babyId).eq("tipo", v.tipo).is("ended_at", null).is("eliminado_en", null).maybeSingle();
      if (activo) return { ok: true, data: { evento: activo as Evento, yaExistia: true } };
    }
    return { ok: false, error: errorBase(error, "guardar el registro") };
  }
  revalidatePath("/");
  return { ok: true, data: { evento: data as Evento, yaExistia: false } };
}

const Corregir = z.object({
  eventId: z.uuid(),
  expectedVersion: z.number().int().positive(),
  startedAt: iso.optional(),
  endedAt: iso.nullable().optional(),
  payload: z.unknown().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
  eliminadoEn: iso.nullable().optional(),
});
export type CorregirInput = z.input<typeof Corregir>;

/** Edita horas, payload o notas con bloqueo optimista por versión. Devuelve CONFLICTO con la versión actual si cambió. */
export async function corregirEvento(input: CorregirInput): Promise<Resultado<{ evento: Evento }> | { ok: false; error: string; conflicto: Evento }> {
  const p = Corregir.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa los datos: " + (p.error.issues[0]?.message ?? "") };
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  const v = p.data;
  const { data: actual } = await s.db.from("events").select(COLS).eq("id", v.eventId).maybeSingle();
  if (!actual) return { ok: false, error: "No encontramos ese registro. Puede que lo hayan eliminado." };
  if (actual.version !== v.expectedVersion) return { ok: false, error: "Alguien más cambió este registro mientras lo editabas.", conflicto: actual as Evento };
  const cambios: { started_at?: string; ended_at?: string | null; notas?: string | null; eliminado_en?: string | null; payload?: Json } = {};
  if (v.startedAt !== undefined) cambios.started_at = v.startedAt;
  if (v.endedAt !== undefined) cambios.ended_at = v.endedAt;
  if (v.notas !== undefined) cambios.notas = v.notas;
  if (v.eliminadoEn !== undefined) cambios.eliminado_en = v.eliminadoEn;
  if (v.payload !== undefined) {
    const pv = validarPayload(actual.tipo, { ...(actual.payload as object), ...(v.payload as object) });
    if (!pv.ok) return pv;
    cambios.payload = pv.payload;
  }
  const ini = cambios.started_at ?? actual.started_at;
  const fin = cambios.ended_at === undefined ? actual.ended_at : cambios.ended_at;
  if (fin && fin < ini) return { ok: false, error: "La hora de fin no puede ser antes del inicio." };
  const { data, error } = await s.db.from("events").update(cambios).eq("id", v.eventId).eq("version", v.expectedVersion).select(COLS).maybeSingle();
  if (error) return { ok: false, error: errorBase(error, "guardar los cambios") };
  if (!data) {
    const { data: ahora } = await s.db.from("events").select(COLS).eq("id", v.eventId).single();
    return { ok: false, error: "Alguien más cambió este registro mientras lo editabas.", conflicto: ahora as Evento };
  }
  revalidatePath("/");
  return { ok: true, data: { evento: data as Evento } };
}

/** Cierra el temporizador activo de un tipo. Para toma de pecho, acumula el lado activo. */
export async function terminarTimer(input: { babyId: string; tipo: "sueno" | "toma_pecho" | "extraccion"; fin?: string; payload?: unknown }): Promise<Resultado<{ evento: Evento; duracionMin: number }>> {
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  const { data: activo } = await s.db.from("events").select(COLS).eq("baby_id", input.babyId).eq("tipo", input.tipo).is("ended_at", null).is("eliminado_en", null).maybeSingle();
  if (!activo) return { ok: false, error: "No hay ninguno en curso." };
  const fin = input.fin ?? new Date().toISOString();
  // La base no acepta registros de más de 24 h: un temporizador olvidado se corrige desde el detalle.
  if (new Date(fin).getTime() - new Date(activo.started_at).getTime() > 24 * 3_600_000) {
    return { ok: false, error: "Este registro lleva más de 24 horas abierto. Abre el detalle y corrige la hora de inicio o de fin." };
  }
  let payload = { ...(activo.payload as Record<string, unknown>), ...((input.payload as Record<string, unknown>) ?? {}) };
  if (input.tipo === "toma_pecho") payload = cerrarLado(payload, fin);
  const r = await corregirEvento({ eventId: activo.id, expectedVersion: activo.version, endedAt: fin, payload });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: { evento: r.data.evento, duracionMin: (new Date(fin).getTime() - new Date(activo.started_at).getTime()) / 60000 } };
}

function cerrarLado(p: Record<string, unknown>, ahoraIso: string): Record<string, unknown> {
  const lado = p.lado_activo as "izq" | "der" | null | undefined;
  if (lado && p.activo_desde) {
    const extra = Math.max(0, Math.round((new Date(ahoraIso).getTime() - new Date(String(p.activo_desde)).getTime()) / 1000));
    const k = lado === "izq" ? "segundos_izq" : "segundos_der";
    p[k] = Math.min(21600, Number(p[k] ?? 0) + extra);
    p.ultimo_lado = lado;
  }
  p.lado_activo = null;
  p.activo_desde = null;
  return p;
}

/** Cambia de lado o pausa/reanuda la toma de pecho en curso. `lado: null` = pausar; sin lado = reanudar con el último. */
export async function cambiarLado(input: { babyId: string; lado?: "izq" | "der" | null }): Promise<Resultado<{ evento: Evento; ladoActivo: "izq" | "der" | null }>> {
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  if (input.lado !== undefined && input.lado !== null && !Lado.safeParse(input.lado).success) return { ok: false, error: "Lado inválido." };
  const { data: activo } = await s.db.from("events").select(COLS).eq("baby_id", input.babyId).eq("tipo", "toma_pecho").is("ended_at", null).is("eliminado_en", null).maybeSingle();
  if (!activo) return { ok: false, error: "No hay una toma de pecho en curso." };
  const ahora = new Date().toISOString();
  const p = cerrarLado({ ...(activo.payload as Record<string, unknown>) }, ahora);
  const nuevo = input.lado === undefined ? ((p.ultimo_lado as "izq" | "der" | null) ?? (p.lado_inicial as "izq" | "der")) : input.lado;
  if (nuevo) { p.lado_activo = nuevo; p.activo_desde = ahora; }
  const r = await corregirEvento({ eventId: activo.id, expectedVersion: activo.version, payload: p });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, data: { evento: r.data.evento, ladoActivo: nuevo } };
}

/** Borrado lógico (deshacer con restaurarEvento). */
export async function eliminarEvento(eventId: string): Promise<Resultado<{ evento: Evento }>> {
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  const { data: actual } = await s.db.from("events").select(COLS).eq("id", eventId).maybeSingle();
  if (!actual) return { ok: false, error: "No encontramos ese registro." };
  const r = await corregirEvento({ eventId, expectedVersion: actual.version, eliminadoEn: new Date().toISOString() });
  return r.ok ? r : { ok: false, error: r.error };
}

export async function restaurarEvento(eventId: string): Promise<Resultado<{ evento: Evento }>> {
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  const { data: actual } = await s.db.from("events").select(COLS).eq("id", eventId).maybeSingle();
  if (!actual) return { ok: false, error: "No encontramos ese registro." };
  const r = await corregirEvento({ eventId, expectedVersion: actual.version, eliminadoEn: null });
  if (!r.ok) return { ok: false, error: r.error.startsWith("Ya hay") ? "Ya hay otro en curso; termínalo antes de restaurar este." : r.error };
  return r;
}

export async function cambiarModoNoche(modo: "auto" | "on" | "off"): Promise<Resultado> {
  const s = await sesion();
  if ("error" in s) return { ok: false, error: s.error };
  if (s.c.miembro.rol !== "admin") return { ok: false, error: "Solo quien administra el hogar cambia los ajustes." };
  const { error } = await s.db.from("household_settings").update({ noche_ui_modo: modo }).eq("household_id", s.c.hogar.id);
  if (error) return { ok: false, error: "No pudimos guardar el modo noche." };
  revalidatePath("/");
  return { ok: true, data: undefined };
}
