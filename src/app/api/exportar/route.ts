import { contexto } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ajustesDelHogar } from "@/lib/datos/hoy";
import { describir, type Evento } from "@/lib/core/eventos";
import { esNoche } from "@/lib/core/sueno";
import { fechaISO, fHora } from "@/lib/core/tiempo";

export const dynamic = "force-dynamic";

const celda = (v: unknown) => {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Exporta los datos del hogar que la persona puede ver (RLS decide). Sin datos de salud en la URL ni en logs.
export async function GET(req: Request) {
  const c = await contexto();
  if (!c?.hogar || !c.miembro) return Response.json({ error: "Entra a Tereza para exportar." }, { status: 401 });
  const formato = new URL(req.url).searchParams.get("formato") === "json" ? "json" : "csv";
  const db = await supabaseServer();
  const ids = c.bebes.map((b) => b.id);
  const a = await ajustesDelHogar(c.hogar.id);
  const salud = c.miembro.rol !== "limitado";
  const [ev, med, trat, vis, dud, mem] = await Promise.all([
    db.from("events").select("id, baby_id, tipo, started_at, ended_at, payload, notas, logged_by, source, version, eliminado_en").in("baby_id", ids).is("eliminado_en", null).order("started_at").limit(50000),
    salud ? db.from("measurements").select("baby_id, medido_en, peso_g, longitud_mm, perimetro_cefalico_mm, origen, notas").in("baby_id", ids).order("medido_en") : Promise.resolve({ data: [] }),
    salud ? db.from("medications").select("id, baby_id, nombre, indicacion_textual, prescrito_por, inicio, fin, activo").in("baby_id", ids) : Promise.resolve({ data: [] }),
    salud ? db.from("visits").select("baby_id, fecha, pediatra, motivo, notas, vacunas").in("baby_id", ids).order("fecha") : Promise.resolve({ data: [] }),
    salud ? db.from("questions").select("baby_id, texto, creada_en, resuelta_en_visita_id").in("baby_id", ids) : Promise.resolve({ data: [] }),
    db.from("members").select("user_id, nombre_visible").eq("household_id", c.hogar.id),
  ]);
  const nombres = Object.fromEntries((mem.data ?? []).map((m) => [m.user_id, m.nombre_visible]));
  const bebe = Object.fromEntries(c.bebes.map((b) => [b.id, b.nombre]));
  const meds = Object.fromEntries((trat.data ?? []).map((t) => [t.id, t.nombre]));
  const eventos = (ev.data ?? []) as (Evento & { baby_id: string })[];
  const fecha = fechaISO(Date.now(), a.tz);
  const cab = (nombre: string, tipo: string) => ({ "content-type": tipo, "content-disposition": `attachment; filename="${nombre}"`, "cache-control": "no-store" });
  if (formato === "json") {
    const cuerpo = { exportado_en: new Date().toISOString(), hogar: c.hogar.nombre, zona_horaria: a.tz, bebes: c.bebes, eventos: eventos.map((e) => ({ ...e, registrado_por: nombres[e.logged_by ?? ""] ?? null })), medidas: med.data, tratamientos: trat.data, visitas: vis.data, dudas: dud.data };
    return new Response(JSON.stringify(cuerpo, null, 2), { headers: cab(`tereza-${fecha}.json`, "application/json; charset=utf-8") });
  }
  const opts = { tz: a.tz, unidadVolumen: a.unidadVolumen, ahora: Date.now(), esNoche: esNoche(a), nombreMedicamento: (id: string) => meds[id] };
  const filas = [["bebe", "tipo", "fecha", "inicio", "fin", "resumen", "detalle", "notas", "registrado_por", "origen", "inicio_iso", "fin_iso", "datos"]];
  for (const e of eventos) {
    const d = describir(e, opts);
    filas.push([bebe[e.baby_id] ?? "", e.tipo, fechaISO(new Date(e.started_at).getTime(), a.tz), fHora(new Date(e.started_at).getTime(), a.tz), e.ended_at ? fHora(new Date(e.ended_at).getTime(), a.tz) : "", d.titulo, d.detalle, e.notas ?? "", nombres[e.logged_by ?? ""] ?? "", e.source === "mcp" ? "asistente" : "app", e.started_at, e.ended_at ?? "", JSON.stringify(e.payload)]);
  }
  const csv = "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  return new Response(csv, { headers: cab(`tereza-registros-${fecha}.csv`, "text/csv; charset=utf-8") });
}
