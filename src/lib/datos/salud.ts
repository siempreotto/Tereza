import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export async function datosSalud(babyId: string) {
  const db = await supabaseServer();
  const [med, trat, vis, dud, cita] = await Promise.all([
    db.from("measurements").select("id, medido_en, peso_g, longitud_mm, perimetro_cefalico_mm, origen, notas").eq("baby_id", babyId).order("medido_en"),
    db.from("medications").select("id, nombre, indicacion_textual, prescrito_por, inicio, fin, activo").eq("baby_id", babyId).order("creado_en", { ascending: false }),
    db.from("visits").select("id, fecha, pediatra, motivo, notas, vacunas, adjuntos").eq("baby_id", babyId).order("fecha", { ascending: false }),
    db.from("questions").select("id, texto, creada_en, creada_por, source, resuelta_en_visita_id").eq("baby_id", babyId).order("creada_en", { ascending: false }),
    db.from("next_appointments").select("fecha, titulo, pediatra").eq("baby_id", babyId).maybeSingle(),
  ]);
  return {
    medidas: med.data ?? [],
    tratamientos: trat.data ?? [],
    visitas: (vis.data ?? []).map((v) => ({ ...v, vacunas: (v.vacunas as string[]) ?? [] })),
    dudas: dud.data ?? [],
    cita: cita.data,
  };
}
export type DatosSalud = Awaited<ReturnType<typeof datosSalud>>;

export async function administraciones(babyId: string, limite = 60) {
  const db = await supabaseServer();
  const { data } = await db.from("events").select("id, started_at, payload, logged_by, source").eq("baby_id", babyId).eq("tipo", "medicamento").is("eliminado_en", null).order("started_at", { ascending: false }).limit(limite);
  return (data ?? []).map((e) => ({ ...e, payload: e.payload as { medication_id: string; cantidad_textual: string; via?: string } }));
}
