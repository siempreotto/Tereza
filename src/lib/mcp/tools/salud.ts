import "server-only";
import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { bebeDe, ErrorMcp, soloSalud, type Ctx } from "../contexto";
import { COLS, dia, errorDeBase, eventoOut, eventosDesde, hora, normalizarPayload, ok, type Respuesta } from "../util";
import { edadDias, percentil, textoPercentil } from "@/lib/core/crecimiento";
import { ms, type Evento } from "@/lib/core/eventos";
import { resumenPediatra } from "@/lib/core/resumenPediatra";
import { fFecha, fHora, inicioDia, sumarDias } from "@/lib/core/tiempo";
import { fLongitud, fPeso, lbOzAGramos, longitudAMm } from "@/lib/core/unidades";

type ConCtx = <A>(nombre: string, fn: (ctx: Ctx, args: A) => Promise<Respuesta>) => (args: A, extra: unknown) => Promise<Respuesta>;
const babyId = z.string().optional().describe("ID o nombre del bebé. Si el hogar tiene un solo bebé, se infiere.");

const SOLO_REGISTRA = "Solo registra. Nunca sugiere, calcula ni valida dosis, intervalos o combinaciones. Ante una pregunta de dosis, remite al pediatra o farmacéutico y a la etiqueta del producto.";

async function buscarTratamiento(ctx: Ctx, bebe: string, id?: string, nombre?: string) {
  if (id) {
    const { data } = await ctx.db.from("medications").select("id, nombre, indicacion_textual, activo").eq("id", id).eq("baby_id", bebe).maybeSingle();
    return data;
  }
  if (!nombre) return null;
  const { data } = await ctx.db.from("medications").select("id, nombre, indicacion_textual, activo").eq("baby_id", bebe).ilike("nombre", nombre.trim()).order("activo", { ascending: false }).order("creado_en", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

export function registrarHerramientasSalud(server: McpServer, conCtx: ConCtx) {
  server.registerTool("registrar_medida", {
    title: "Registrar peso, longitud o perímetro cefálico",
    description: "Guarda una medida y devuelve el percentil OMS (con edad corregida si nació antes de las 37 semanas). Peso en {kg} o {lb, oz}; longitud y perímetro en {valor, unidad: cm|in}.",
    inputSchema: z.object({
      baby_id: babyId,
      medido_en: z.string().optional().describe("Fecha AAAA-MM-DD u hora natural; si falta, ahora"),
      peso: z.object({ kg: z.number().optional(), lb: z.number().optional(), oz: z.number().optional() }).optional(),
      longitud: z.object({ valor: z.number(), unidad: z.enum(["cm", "in"]) }).optional(),
      perimetro: z.object({ valor: z.number(), unidad: z.enum(["cm", "in"]) }).optional(),
      origen: z.enum(["casa", "consulta", "nacimiento"]).optional(),
      notas: z.string().max(500).optional(),
    }),
  }, conCtx("registrar_medida", async (ctx, a: { baby_id?: string; medido_en?: string; peso?: { kg?: number; lb?: number; oz?: number }; longitud?: { valor: number; unidad: "cm" | "in" }; perimetro?: { valor: number; unidad: "cm" | "in" }; origen?: "casa" | "consulta" | "nacimiento"; notas?: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    const cuando = a.medido_en && /^\d{4}-\d{2}-\d{2}$/.test(a.medido_en) ? dia(ctx, a.medido_en, ctx.ahora) + 12 * 3_600_000 : hora(ctx, a.medido_en).ms;
    const pesoG = a.peso ? (a.peso.kg != null ? Math.round(a.peso.kg * 1000) : a.peso.lb != null || a.peso.oz != null ? lbOzAGramos(a.peso.lb ?? 0, a.peso.oz ?? 0) : null) : null;
    const longMm = a.longitud ? longitudAMm(a.longitud.valor, a.longitud.unidad) : null;
    const perMm = a.perimetro ? longitudAMm(a.perimetro.valor, a.perimetro.unidad) : null;
    if (!pesoG && !longMm && !perMm) throw new ErrorMcp("VALIDACION", "Dime al menos una medida: peso, longitud o perímetro cefálico.");
    if (pesoG && (pesoG < 300 || pesoG > 40000)) throw new ErrorMcp("VALIDACION", "Ese peso no parece correcto. Revísalo.");
    if (longMm && (longMm < 200 || longMm > 1300)) throw new ErrorMcp("VALIDACION", "Esa longitud no parece correcta. Revísala.");
    if (perMm && (perMm < 200 || perMm > 600)) throw new ErrorMcp("VALIDACION", "Ese perímetro no parece correcto. Revísalo.");
    const { data, error } = await ctx.db.from("measurements").insert({
      baby_id: b.id, household_id: ctx.hogarId, medido_en: new Date(cuando).toISOString(), peso_g: pesoG, longitud_mm: longMm,
      perimetro_cefalico_mm: perMm, origen: a.origen ?? "casa", notas: a.notas ?? null, logged_by: ctx.userId, source: "mcp",
    }).select("id").single();
    if (error || !data) throw errorDeBase(error, "guardar la medida");
    const dias = edadDias(b.fecha_nacimiento, cuando, b.semanas_gestacion);
    const sexo = b.sexo as "M" | "F";
    const pct = {
      peso: pesoG ? percentil("peso", sexo, dias, pesoG / 1000) : null,
      longitud: longMm ? percentil("longitud", sexo, dias, longMm / 10) : null,
      perimetro: perMm ? percentil("perimetro", sexo, dias, perMm / 10) : null,
    };
    const corregida = b.semanas_gestacion != null && b.semanas_gestacion < 37 && dias < 730;
    const u = ctx.ajustes;
    const partesTxt = [
      pesoG ? `peso ${fPeso(pesoG, u.unidadPeso)} (${textoPercentil(pct.peso)})` : null,
      longMm ? `longitud ${fLongitud(longMm, u.unidadLongitud)} (${textoPercentil(pct.longitud)})` : null,
      perMm ? `perímetro cefálico ${fLongitud(perMm, u.unidadLongitud)} (${textoPercentil(pct.perimetro)})` : null,
    ].filter(Boolean);
    return ok(`Guardé la medida de ${b.nombre}: ${partesTxt.join("; ")}. Percentiles OMS${corregida ? " por edad corregida" : ""}.`, {
      medida_id: data.id, percentiles: { peso: pct.peso != null ? Math.round(pct.peso) : undefined, longitud: pct.longitud != null ? Math.round(pct.longitud) : undefined, perimetro: pct.perimetro != null ? Math.round(pct.perimetro) : undefined },
      edad_corregida_usada: corregida,
    });
  }));

  server.registerTool("registrar_medicamento", {
    title: "Registrar un medicamento administrado",
    description: `Registra que se dio un medicamento, tal como lo cuenta la persona (cantidad_textual, p. ej. «2.5 ml»). Usa un tratamiento existente por medication_id o nombre; si no existe y das indicacion_textual, crea el tratamiento. ${SOLO_REGISTRA}`,
    inputSchema: z.object({
      baby_id: babyId,
      medication_id: z.string().uuid().optional(),
      nombre: z.string().max(120).optional(),
      cantidad_textual: z.string().min(1).max(120).describe("Lo que se dio, en palabras de la persona"),
      via: z.enum(["oral", "topica", "inhalada", "nasal", "otra"]).optional(),
      hora: z.string().optional(),
      indicacion_textual: z.string().max(500).optional().describe("Solo si hay que crear el tratamiento: la indicación tal como la dio el médico"),
      prescrito_por: z.string().max(120).optional(),
      notas: z.string().max(1000).optional(),
    }),
  }, conCtx("registrar_medicamento", async (ctx, a: { baby_id?: string; medication_id?: string; nombre?: string; cantidad_textual: string; via?: string; hora?: string; indicacion_textual?: string; prescrito_por?: string; notas?: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    let t = await buscarTratamiento(ctx, b.id, a.medication_id, a.nombre);
    let creado = false;
    if (!t) {
      if (!a.nombre || !a.indicacion_textual) {
        const { data: activos } = await ctx.db.from("medications").select("nombre").eq("baby_id", b.id).eq("activo", true);
        throw new ErrorMcp("NO_ENCONTRADO", `No encontré ese medicamento entre los tratamientos de ${b.nombre}${activos?.length ? ` (activos: ${activos.map((x) => x.nombre).join(", ")})` : ""}. Para crearlo dime el nombre y la indicación tal como la dio el médico.`);
      }
      const { data, error } = await ctx.db.from("medications").insert({ baby_id: b.id, household_id: ctx.hogarId, nombre: a.nombre.trim(), indicacion_textual: a.indicacion_textual.trim(), prescrito_por: a.prescrito_por ?? null }).select("id, nombre, indicacion_textual, activo").single();
      if (error || !data) throw errorDeBase(error, "crear el tratamiento");
      t = data; creado = true;
    }
    const h = hora(ctx, a.hora);
    const payload = normalizarPayload(ctx, "medicamento", { medication_id: t.id, cantidad_textual: a.cantidad_textual, via: a.via });
    const { data, error } = await ctx.db.from("events").insert({ baby_id: b.id, household_id: ctx.hogarId, tipo: "medicamento", started_at: new Date(h.ms).toISOString(), payload, notas: a.notas ?? null, logged_by: ctx.userId, source: "mcp" }).select(COLS).single();
    if (error || !data) throw errorDeBase(error, "registrar el medicamento");
    return ok(`Guardé: ${t.nombre}, ${a.cantidad_textual}, a las ${fHora(h.ms, ctx.ajustes.tz)}.${creado ? ` Creé el tratamiento con la indicación «${t.indicacion_textual}».` : ""} (event_id ${data.id})${h.nota ? `\n${h.nota}` : ""}\nTereza solo registra; para dudas de dosis, consulta al pediatra o al farmacéutico y la etiqueta.`, {
      evento: eventoOut(ctx, data as Evento, {}, { [t.id]: t.nombre }), tratamiento_creado: creado, medication_id: t.id,
    });
  }));

  server.registerTool("gestionar_tratamiento", {
    title: "Crear o terminar un tratamiento",
    description: `Crea un tratamiento (nombre + indicación textual del médico) o lo marca como terminado. ${SOLO_REGISTRA}`,
    inputSchema: z.object({
      baby_id: babyId,
      accion: z.enum(["crear", "terminar", "reactivar"]),
      medication_id: z.string().uuid().optional(),
      nombre: z.string().max(120).optional(),
      indicacion_textual: z.string().max(500).optional(),
      prescrito_por: z.string().max(120).optional(),
    }),
  }, conCtx("gestionar_tratamiento", async (ctx, a: { baby_id?: string; accion: "crear" | "terminar" | "reactivar"; medication_id?: string; nombre?: string; indicacion_textual?: string; prescrito_por?: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    if (a.accion === "crear") {
      if (!a.nombre || !a.indicacion_textual) throw new ErrorMcp("VALIDACION", "Para crear el tratamiento necesito el nombre y la indicación tal como la dio el médico.");
      const { data, error } = await ctx.db.from("medications").insert({ baby_id: b.id, household_id: ctx.hogarId, nombre: a.nombre.trim(), indicacion_textual: a.indicacion_textual.trim(), prescrito_por: a.prescrito_por ?? null }).select("id, nombre, indicacion_textual, prescrito_por, inicio, fin, activo").single();
      if (error || !data) throw errorDeBase(error, "crear el tratamiento");
      return ok(`Creé el tratamiento ${data.nombre}: «${data.indicacion_textual}». Tereza solo lo registra; no calcula ni valida dosis.`, { tratamiento: data });
    }
    const t = await buscarTratamiento(ctx, b.id, a.medication_id, a.nombre);
    if (!t) throw new ErrorMcp("NO_ENCONTRADO", "No encontré ese tratamiento.");
    const activo = a.accion === "reactivar";
    const { data, error } = await ctx.db.from("medications").update({ activo, fin: activo ? null : new Date(ctx.ahora).toISOString().slice(0, 10) }).eq("id", t.id).select("id, nombre, indicacion_textual, prescrito_por, inicio, fin, activo").single();
    if (error || !data) throw errorDeBase(error, "cambiar el tratamiento");
    return ok(activo ? `Reactivé ${data.nombre}.` : `Marqué ${data.nombre} como terminado. Si fue un error, puedo reactivarlo.`, { tratamiento: data });
  }));

  server.registerTool("agregar_duda_pediatra", {
    title: "Anotar una duda para el pediatra",
    description: "Guarda una pregunta para la próxima consulta.",
    inputSchema: z.object({ baby_id: babyId, texto: z.string().min(1).max(1000) }),
  }, conCtx("agregar_duda_pediatra", async (ctx, a: { baby_id?: string; texto: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    const { data, error } = await ctx.db.from("questions").insert({ baby_id: b.id, household_id: ctx.hogarId, texto: a.texto.trim(), creada_por: ctx.userId, source: "mcp" }).select("id, texto, creada_en, resuelta_en_visita_id").single();
    if (error || !data) throw errorDeBase(error, "guardar la duda");
    const { count } = await ctx.db.from("questions").select("id", { count: "exact", head: true }).eq("baby_id", b.id).is("resuelta_en_visita_id", null);
    return ok(`Anoté la duda para el pediatra. Hay ${count ?? 1} pendiente${count === 1 ? "" : "s"}.`, { duda: { question_id: data.id, ...data } });
  }));

  server.registerTool("ver_dudas", {
    title: "Ver dudas para el pediatra",
    description: "Lista las dudas pendientes (y opcionalmente las resueltas).",
    inputSchema: z.object({ baby_id: babyId, incluir_resueltas: z.boolean().optional() }),
    annotations: { readOnlyHint: true },
  }, conCtx("ver_dudas", async (ctx, a: { baby_id?: string; incluir_resueltas?: boolean }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    let q = ctx.db.from("questions").select("id, texto, creada_en, resuelta_en_visita_id").eq("baby_id", b.id);
    if (!a.incluir_resueltas) q = q.is("resuelta_en_visita_id", null);
    const { data } = await q.order("creada_en");
    const dudas = (data ?? []).map((d) => ({ question_id: d.id, texto: d.texto, creada_en: d.creada_en, resuelta: !!d.resuelta_en_visita_id }));
    return ok(dudas.length ? dudas.map((d, i) => `${i + 1}. ${d.texto}${d.resuelta ? " (resuelta)" : ""}`).join("\n") : "No hay dudas pendientes.", { dudas });
  }));

  server.registerTool("resolver_duda", {
    title: "Marcar una duda como resuelta",
    description: "Marca una duda como resuelta, ligada a una visita (si no se indica, la más reciente).",
    inputSchema: z.object({ question_id: z.string().uuid(), visita_id: z.string().uuid().optional() }),
  }, conCtx("resolver_duda", async (ctx, a: { question_id: string; visita_id?: string }) => {
    soloSalud(ctx);
    const { data: q } = await ctx.db.from("questions").select("id, baby_id, texto").eq("id", a.question_id).maybeSingle();
    if (!q) throw new ErrorMcp("NO_ENCONTRADO", "No encontré esa duda.");
    let visita = a.visita_id;
    if (!visita) {
      const { data: v } = await ctx.db.from("visits").select("id").eq("baby_id", q.baby_id).order("fecha", { ascending: false }).limit(1);
      visita = v?.[0]?.id;
    }
    if (!visita) throw new ErrorMcp("VALIDACION", "Para resolverla hace falta una visita registrada. Agrega la visita desde la app (Salud › Pediatra).");
    const { error } = await ctx.db.from("questions").update({ resuelta_en_visita_id: visita }).eq("id", q.id);
    if (error) throw errorDeBase(error, "resolver la duda");
    return ok(`Marqué como resuelta: «${q.texto}».`, { duda: { question_id: q.id, texto: q.texto, resuelta_en_visita_id: visita } });
  }));

  server.registerTool("ver_proxima_cita", {
    title: "Ver la próxima cita",
    description: "Fecha, título y pediatra de la próxima cita, si hay.",
    inputSchema: z.object({ baby_id: babyId }),
    annotations: { readOnlyHint: true },
  }, conCtx("ver_proxima_cita", async (ctx, a: { baby_id?: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    const { data } = await ctx.db.from("next_appointments").select("fecha, titulo, pediatra").eq("baby_id", b.id).maybeSingle();
    if (!data) return ok(`No hay próxima cita registrada para ${b.nombre}.`, { cita: null });
    return ok(`Próxima cita: ${fFecha(ms(data.fecha), ctx.ajustes.tz)}, ${fHora(ms(data.fecha), ctx.ajustes.tz)}${data.titulo ? ` · ${data.titulo}` : ""}${data.pediatra ? ` · ${data.pediatra}` : ""}.`, { cita: data });
  }));

  server.registerTool("fijar_proxima_cita", {
    title: "Fijar o quitar la próxima cita",
    description: "Guarda la próxima cita (fecha y hora, título, pediatra). Con quitar=true la borra.",
    inputSchema: z.object({
      baby_id: babyId,
      fecha: z.string().optional().describe("Fecha y hora en ISO o «AAAA-MM-DD HH:MM» (hora del hogar)"),
      titulo: z.string().max(120).optional(), pediatra: z.string().max(120).optional(), quitar: z.boolean().optional(),
    }),
  }, conCtx("fijar_proxima_cita", async (ctx, a: { baby_id?: string; fecha?: string; titulo?: string; pediatra?: string; quitar?: boolean }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    const { data: antes } = await ctx.db.from("next_appointments").select("fecha, titulo, pediatra").eq("baby_id", b.id).maybeSingle();
    if (a.quitar) {
      const { error } = await ctx.db.from("next_appointments").delete().eq("baby_id", b.id);
      if (error) throw errorDeBase(error, "quitar la cita");
      return ok("Quité la próxima cita.", { cita: null, anterior: antes });
    }
    if (!a.fecha) throw new ErrorMcp("VALIDACION", "Dime la fecha y la hora de la cita.");
    let t: number;
    const m = a.fecha.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
    if (m) { const { desdeLocal } = await import("@/lib/core/tiempo"); t = desdeLocal(ctx.ajustes.tz, +m[1], +m[2], +m[3], m[4] ? +m[4] : 9, m[5] ? +m[5] : 0); }
    else { t = Date.parse(a.fecha); if (Number.isNaN(t)) throw new ErrorMcp("VALIDACION", "No entendí la fecha. Usa AAAA-MM-DD HH:MM."); }
    const fila = { baby_id: b.id, household_id: ctx.hogarId, fecha: new Date(t).toISOString(), titulo: a.titulo ?? null, pediatra: a.pediatra ?? null, editado_en: new Date(ctx.ahora).toISOString() };
    const { error } = await ctx.db.from("next_appointments").upsert(fila);
    if (error) throw errorDeBase(error, "guardar la cita");
    return ok(`Guardé la próxima cita: ${fFecha(t, ctx.ajustes.tz)}, ${fHora(t, ctx.ajustes.tz)}${a.titulo ? ` · ${a.titulo}` : ""}.`, { cita: { fecha: fila.fecha, titulo: fila.titulo, pediatra: fila.pediatra }, anterior: antes });
  }));

  server.registerTool("resumen_pediatra", {
    title: "Resumen para el pediatra",
    description: "Resumen desde la última visita (o desde la fecha indicada): crecimiento con percentiles, sueño, tomas, pañales, medicamentos administrados, temperaturas, síntomas y dudas pendientes. No es un diagnóstico.",
    inputSchema: z.object({ baby_id: babyId, desde: z.string().optional().describe("AAAA-MM-DD; por defecto, la última visita o 30 días") }),
    annotations: { readOnlyHint: true },
  }, conCtx("resumen_pediatra", async (ctx, a: { baby_id?: string; desde?: string }) => {
    soloSalud(ctx);
    const b = bebeDe(ctx, a.baby_id);
    const tz = ctx.ajustes.tz;
    const [med, trat, vis, dud] = await Promise.all([
      ctx.db.from("measurements").select("medido_en, peso_g, longitud_mm, perimetro_cefalico_mm, origen").eq("baby_id", b.id).order("medido_en"),
      ctx.db.from("medications").select("id, nombre, indicacion_textual, activo").eq("baby_id", b.id),
      ctx.db.from("visits").select("fecha, motivo").eq("baby_id", b.id).order("fecha", { ascending: false }).limit(1),
      ctx.db.from("questions").select("texto, resuelta_en_visita_id").eq("baby_id", b.id),
    ]);
    const ultima = vis.data?.[0] ?? null;
    const hoy = inicioDia(ctx.ahora, tz);
    const desde = a.desde ? dia(ctx, a.desde, hoy) : ultima ? inicioDia(ms(ultima.fecha), tz) : sumarDias(hoy, -30, tz);
    const hasta = sumarDias(hoy, 1, tz);
    const eventos = await eventosDesde(ctx, b.id, sumarDias(desde, -1, tz), hasta);
    const r = resumenPediatra({ bebe: b, hogar: ctx.ajustes, desde, hasta, ahora: ctx.ahora, eventos, medidas: med.data ?? [], tratamientos: trat.data ?? [], dudas: dud.data ?? [], ultimaVisita: a.desde ? null : ultima });
    return ok(r.texto, r);
  }));
}
