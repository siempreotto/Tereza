"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { contexto } from "@/lib/auth/session";
import { edadDias, percentil, textoPercentil } from "@/lib/core/crecimiento";
import type { Resultado } from "./hogar";

async function salud() {
  const c = await contexto();
  if (!c?.hogar || !c.miembro) return { error: "Tu sesión venció. Vuelve a entrar." };
  if (c.miembro.rol === "limitado") return { error: "Tu rol no incluye salud. Pregúntale a quien administra el hogar." };
  return { c: c as typeof c & { hogar: NonNullable<typeof c.hogar> }, db: await supabaseServer() };
}
const iso = z.iso.datetime({ offset: true });
const fallo = (accion: string) => `No pudimos ${accion}. Revisa tu conexión y vuelve a intentarlo.`;

const Medida = z.object({
  babyId: z.uuid(),
  medidoEn: iso,
  pesoG: z.number().int().min(300).max(40000).nullable(),
  longitudMm: z.number().int().min(200).max(1300).nullable(),
  perimetroMm: z.number().int().min(200).max(600).nullable(),
  origen: z.enum(["casa", "consulta", "nacimiento"]),
  notas: z.string().trim().max(500).nullable().optional(),
}).refine((m) => m.pesoG || m.longitudMm || m.perimetroMm, "Escribe al menos una medida");

/** Guarda una medida y devuelve los percentiles OMS por edad corregida. */
export async function registrarMedida(input: z.input<typeof Medida>): Promise<Resultado<{ id: string; percentiles: { peso?: string; longitud?: string; perimetro?: string } }>> {
  const p = Medida.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa la medida" };
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const v = p.data;
  const bebe = s.c.bebes.find((b) => b.id === v.babyId);
  if (!bebe) return { ok: false, error: "No encontramos al bebé." };
  const { data, error } = await s.db.from("measurements").insert({
    baby_id: v.babyId, household_id: s.c.hogar.id, medido_en: v.medidoEn, peso_g: v.pesoG, longitud_mm: v.longitudMm,
    perimetro_cefalico_mm: v.perimetroMm, origen: v.origen, notas: v.notas ?? null, logged_by: s.c.userId,
  }).select("id").single();
  if (error || !data) return { ok: false, error: fallo("guardar la medida") };
  const dias = edadDias(bebe.fecha_nacimiento, new Date(v.medidoEn).getTime(), bebe.semanas_gestacion);
  const sexo = bebe.sexo as "M" | "F";
  const percentiles: { peso?: string; longitud?: string; perimetro?: string } = {};
  if (v.pesoG) percentiles.peso = textoPercentil(percentil("peso", sexo, dias, v.pesoG / 1000));
  if (v.longitudMm) percentiles.longitud = textoPercentil(percentil("longitud", sexo, dias, v.longitudMm / 10));
  if (v.perimetroMm) percentiles.perimetro = textoPercentil(percentil("perimetro", sexo, dias, v.perimetroMm / 10));
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: { id: data.id, percentiles } };
}

export async function eliminarMedida(id: string): Promise<Resultado> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { error } = await s.db.from("measurements").delete().eq("id", id);
  if (error) return { ok: false, error: fallo("eliminar la medida") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: undefined };
}

const Tratamiento = z.object({
  babyId: z.uuid(),
  nombre: z.string().trim().min(1, "Escribe el nombre como aparece en la caja").max(120),
  indicacion: z.string().trim().min(1, "Copia la indicación tal como la escribió el médico").max(500),
  prescritoPor: z.string().trim().max(120).nullable().optional(),
});

/** Crea un tratamiento con la indicación textual del médico. Tereza no interpreta ni calcula dosis. */
export async function crearTratamiento(input: z.input<typeof Tratamiento>): Promise<Resultado<{ id: string }>> {
  const p = Tratamiento.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa el tratamiento" };
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { data, error } = await s.db.from("medications").insert({ baby_id: p.data.babyId, household_id: s.c.hogar.id, nombre: p.data.nombre, indicacion_textual: p.data.indicacion, prescrito_por: p.data.prescritoPor || null }).select("id").single();
  if (error || !data) return { ok: false, error: fallo("guardar el tratamiento") };
  revalidatePath("/salud-bebe", "layout");
  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

export async function terminarTratamiento(id: string, activo = false): Promise<Resultado> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { error } = await s.db.from("medications").update({ activo, fin: activo ? null : new Date().toISOString().slice(0, 10) }).eq("id", id);
  if (error) return { ok: false, error: fallo("actualizar el tratamiento") };
  revalidatePath("/salud-bebe", "layout");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

const Duda = z.object({ babyId: z.uuid(), texto: z.string().trim().min(1, "Escribe la duda").max(1000) });
export async function agregarDuda(input: z.input<typeof Duda>): Promise<Resultado<{ id: string }>> {
  const p = Duda.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa la duda" };
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { data, error } = await s.db.from("questions").insert({ baby_id: p.data.babyId, household_id: s.c.hogar.id, texto: p.data.texto, creada_por: s.c.userId }).select("id").single();
  if (error || !data) return { ok: false, error: fallo("guardar la duda") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: { id: data.id } };
}

export async function resolverDuda(id: string, visitaId: string | null): Promise<Resultado> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { error } = await s.db.from("questions").update({ resuelta_en_visita_id: visitaId }).eq("id", id);
  if (error) return { ok: false, error: fallo("actualizar la duda") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: undefined };
}

export async function eliminarDuda(id: string): Promise<Resultado> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { error } = await s.db.from("questions").delete().eq("id", id);
  if (error) return { ok: false, error: fallo("eliminar la duda") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: undefined };
}

const Visita = z.object({
  babyId: z.uuid(),
  fecha: iso,
  motivo: z.string().trim().min(1, "Escribe el motivo").max(160),
  pediatra: z.string().trim().max(120).nullable().optional(),
  notas: z.string().trim().max(4000).nullable().optional(),
  vacunas: z.array(z.string().trim().min(1).max(120)).max(20),
  dudasResueltas: z.array(z.uuid()).max(50),
});

export async function crearVisita(input: z.input<typeof Visita>): Promise<Resultado<{ id: string; hogarId: string }>> {
  const p = Visita.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa la visita" };
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const v = p.data;
  const { data, error } = await s.db.from("visits").insert({ baby_id: v.babyId, household_id: s.c.hogar.id, fecha: v.fecha, motivo: v.motivo, pediatra: v.pediatra || null, notas: v.notas || null, vacunas: v.vacunas }).select("id").single();
  if (error || !data) return { ok: false, error: fallo("guardar la visita") };
  if (v.dudasResueltas.length) await s.db.from("questions").update({ resuelta_en_visita_id: data.id }).in("id", v.dudasResueltas);
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: { id: data.id, hogarId: s.c.hogar.id } };
}

/** Registra en la visita la ruta de un adjunto ya subido a Storage (el navegador lo sube con su sesión; RLS revisa la carpeta). */
export async function agregarAdjunto(visitaId: string, ruta: string): Promise<Resultado> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  if (!ruta.startsWith(`${s.c.hogar.id}/${visitaId}/`)) return { ok: false, error: "La ruta del adjunto no corresponde a esta visita." };
  const { data: v } = await s.db.from("visits").select("adjuntos").eq("id", visitaId).single();
  if (!v) return { ok: false, error: "No encontramos la visita." };
  const { error } = await s.db.from("visits").update({ adjuntos: [...v.adjuntos, ruta] }).eq("id", visitaId);
  if (error) return { ok: false, error: fallo("guardar el adjunto") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: undefined };
}

/** Enlace temporal (5 minutos) para ver un adjunto. Nunca URLs públicas. */
export async function enlaceAdjunto(ruta: string): Promise<Resultado<{ url: string }>> {
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const { data, error } = await s.db.storage.from("visitas").createSignedUrl(ruta, 300);
  if (error || !data) return { ok: false, error: "No pudimos abrir el adjunto." };
  return { ok: true, data: { url: data.signedUrl } };
}

const Cita = z.object({ babyId: z.uuid(), fecha: iso.nullable(), titulo: z.string().trim().max(160).nullable().optional(), pediatra: z.string().trim().max(120).nullable().optional() });
export async function fijarCita(input: z.input<typeof Cita>): Promise<Resultado> {
  const p = Cita.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa la fecha de la cita" };
  const s = await salud();
  if ("error" in s) return { ok: false, error: s.error! };
  const v = p.data;
  const { error } = v.fecha
    ? await s.db.from("next_appointments").upsert({ baby_id: v.babyId, household_id: s.c.hogar.id, fecha: v.fecha, titulo: v.titulo || null, pediatra: v.pediatra || null, editado_en: new Date().toISOString() })
    : await s.db.from("next_appointments").delete().eq("baby_id", v.babyId);
  if (error) return { ok: false, error: fallo("guardar la cita") };
  revalidatePath("/salud-bebe", "layout");
  return { ok: true, data: undefined };
}
