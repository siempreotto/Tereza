import "server-only";
import * as z from "zod";
import { bebeDe, ErrorMcp, type Ctx } from "../contexto";
import { COLS, errorDeBase, eventoOut, eventosDesde, hora, nombresMedicamentos, nombresMiembros, normalizarPayload, ok, opcionesDescripcion, type Respuesta } from "../util";
import { describir, ms, segundosPecho, textoGuardado, TIPOS, TIPOS_LIMITADO, TIPOS_TOMA, type Evento, type Payload, type Tipo } from "@/lib/core/eventos";
import { alarmaPocosPanales, alarmaTemperatura } from "@/lib/core/alarmas";
import { edadMeses, esNoche } from "@/lib/core/sueno";
import { planDelDia } from "@/lib/core/planDia";
import { edadTexto } from "@/lib/core/edad";
import { enHora, fDuracion, fHace, fHora, inicioDia, MIN, sumarDias } from "@/lib/core/tiempo";
import { planOut } from "./consultas";

export const babyId = z.string().optional().describe("ID o nombre del bebé. Si el hogar tiene un solo bebé, se infiere.");
const horaTexto = (que: string) => z.string().optional().describe(`${que}. Acepta ISO, «14:30», «a las 2», «hace 20 minutos» o «ayer a las 10». Si falta, es ahora.`);

const TIMER = ["sueno", "toma_pecho", "extraccion"] as const;
const NOMBRE_TIMER: Record<string, string> = { sueno: "un sueño", toma_pecho: "una toma de pecho", extraccion: "una extracción" };

function puedeTipo(ctx: Ctx, tipo: Tipo) {
  if (ctx.rol === "limitado" && !TIPOS_LIMITADO.includes(tipo)) throw new ErrorMcp("PERMISO", "Tu rol (limitado) permite registrar sueño, tomas y pañales. Para lo demás, pídele a un cuidador o a quien administra el hogar.");
}

async function activo(ctx: Ctx, bebe: string, tipo: string): Promise<Evento | null> {
  const { data } = await ctx.db.from("events").select(COLS).eq("baby_id", bebe).eq("tipo", tipo as Tipo).is("ended_at", null).is("eliminado_en", null).maybeSingle();
  return (data as Evento) ?? null;
}

async function actualizar(ctx: Ctx, e: Evento, cambios: { started_at?: string; ended_at?: string | null; payload?: unknown; notas?: string | null; eliminado_en?: string | null }, version = e.version): Promise<Evento> {
  const { data, error } = await ctx.db.from("events").update(cambios as never).eq("id", e.id).eq("version", version).select(COLS).maybeSingle();
  if (error) throw errorDeBase(error, "cambiar ese registro");
  if (!data) {
    const { data: actual } = await ctx.db.from("events").select(COLS).eq("id", e.id).maybeSingle();
    throw new ErrorMcp("CONFLICTO", `Alguien cambió este registro mientras tanto (ahora va en la versión ${actual?.version ?? "?"}). Revisa el registro actual y repite el cambio si sigue haciendo falta.`);
  }
  return data as Evento;
}

function alarmaDe(ctx: Ctx, e: Evento, bebe: { fecha_nacimiento: string; semanas_gestacion: number | null }, recientes: Evento[]) {
  if (!ctx.ajustes.alarmasActivas || e.tipo !== "temperatura") return null;
  return alarmaTemperatura(Number((e.payload as { valor_c: number }).valor_c), edadMeses(bebe.fecha_nacimiento, ctx.ahora, bebe.semanas_gestacion), recientes, ctx.ahora, e.id);
}

const textoAlarma = (a: { titulo: string; texto: string } | null) => (a ? `\n\nAtención: ${a.titulo}. ${a.texto} (Umbrales pendientes de validar con un pediatra.)` : "");

function desdeLocalHoy(ctx: Ctx, hh: number, mm: number): number {
  return enHora(inicioDia(ctx.ahora, ctx.ajustes.tz), `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`, ctx.ajustes.tz);
}

export function registrarHerramientasRegistro(server: import("@modelcontextprotocol/server").McpServer, conCtx: <A>(nombre: string, fn: (ctx: Ctx, args: A) => Promise<Respuesta>) => (args: A, extra: unknown) => Promise<Respuesta>) {
  server.registerTool("listar_bebes", {
    title: "Listar bebés del hogar",
    description: "Bebés activos del hogar con su edad (y edad corregida si nació antes de las 37 semanas). Úsalo cuando haya más de uno.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  }, conCtx("listar_bebes", async (ctx) => {
    const bebes = ctx.bebes.map((b) => ({ baby_id: b.id, nombre: b.nombre, edad_texto: edadTexto(b.fecha_nacimiento, new Date(ctx.ahora), b.semanas_gestacion) }));
    return ok(bebes.length ? bebes.map((b) => `${b.nombre}: ${b.edad_texto}`).join("\n") : "Todavía no hay bebés en el hogar.", { hogar: ctx.hogarNombre, bebes });
  }));

  server.registerTool("estado_actual", {
    title: "Estado actual del bebé",
    description: "Si duerme o está despierto y desde cuándo; última toma, último pañal, último medicamento, temporizadores activos y la próxima estimación de sueño.",
    inputSchema: z.object({ baby_id: babyId }),
    annotations: { readOnlyHint: true },
  }, conCtx("estado_actual", async (ctx, { baby_id }: { baby_id?: string }) => {
    const b = bebeDe(ctx, baby_id);
    const tz = ctx.ajustes.tz;
    const evs = await eventosDesde(ctx, b.id, sumarDias(inicioDia(ctx.ahora, tz), -16, tz));
    const [nombres, meds] = await Promise.all([nombresMiembros(ctx), nombresMedicamentos(ctx, b.id)]);
    const desc = (e: Evento | undefined) => (e ? eventoOut(ctx, e, nombres, meds) : null);
    const sueno = evs.find((e) => e.tipo === "sueno" && !e.ended_at);
    const ultimoSueno = evs.filter((e) => e.tipo === "sueno" && e.ended_at).sort((x, y) => ms(y.ended_at!) - ms(x.ended_at!))[0];
    const toma = evs.find((e) => TIPOS_TOMA.includes(e.tipo));
    const panal = evs.find((e) => e.tipo === "panal");
    const med = ctx.rol === "limitado" ? undefined : evs.find((e) => e.tipo === "medicamento");
    const timers = evs.filter((e) => !e.ended_at && (TIMER as readonly string[]).includes(e.tipo));
    const plan = ctx.rol === "limitado" ? null : planOut(ctx, b.nombre, planDelDia(evs, { fechaNacimiento: b.fecha_nacimiento, semanasGestacion: b.semanas_gestacion, nombre: b.nombre }, ctx.ahora, ctx.ajustes));
    const sig = plan && "siguiente" in plan ? plan.siguiente : null;
    const estado = sueno ? "duerme" : "despierto";
    const desde = sueno ? sueno.started_at : ultimoSueno?.ended_at ?? null;
    const o = opcionesDescripcion(ctx, meds);
    const lineas = [
      sueno ? `${b.nombre} duerme desde las ${fHora(ms(sueno.started_at), tz)} (${fDuracion((ctx.ahora - ms(sueno.started_at)) / MIN)}).` : ultimoSueno ? `${b.nombre} está despierta desde las ${fHora(ms(ultimoSueno.ended_at!), tz)} (${fHace(ms(ultimoSueno.ended_at!), ctx.ahora)}).` : `${b.nombre}: no hay sueños registrados recientes.`,
      toma ? `Última toma: ${describir(toma, o).titulo.toLowerCase()} a las ${fHora(ms(toma.started_at), tz)} (${fHace(ms(toma.started_at), ctx.ahora)}).` : "Sin tomas registradas recientes.",
      panal ? `Último pañal: ${describir(panal, o).detalle.toLowerCase()} a las ${fHora(ms(panal.started_at), tz)}.` : "Sin pañales registrados recientes.",
      med ? `Último medicamento: ${describir(med, o).titulo} a las ${fHora(ms(med.started_at), tz)}.` : null,
      timers.length ? `En curso: ${timers.map((t) => describir(t, o).titulo.toLowerCase()).join(", ")}.` : null,
      sig && sig.estado === "estimado" ? `${sig.nombre} estimada ${sig.hora_texto}${plan && "confianza" in plan ? ` (confianza ${plan.confianza})` : ""}.` : null,
    ].filter(Boolean);
    const alarma = ctx.ajustes.alarmasActivas && ctx.rol !== "limitado" ? alarmaPocosPanales(evs, inicioDia(ctx.ahora, tz), ctx.ahora, tz) : null;
    return ok(lineas.join("\n") + textoAlarma(alarma), {
      baby_id: b.id, estado, desde, ultima_toma: desc(toma), ultimo_panal: desc(panal), ...(ctx.rol === "limitado" ? {} : { ultimo_medicamento: desc(med) }),
      timers_activos: timers.map((t) => desc(t)), siguiente_del_plan: sig, alarma,
    });
  }));

  server.registerTool("iniciar_timer", {
    title: "Iniciar temporizador",
    description: "Inicia un sueño, una toma de pecho (con lado) o una extracción. Si ya hay uno activo del mismo tipo, devuelve el existente y no lo duplica.",
    inputSchema: z.object({
      baby_id: babyId,
      tipo: z.enum(TIMER).describe("sueno, toma_pecho o extraccion"),
      inicio: horaTexto("Cuándo empezó"),
      lado: z.enum(["izq", "der"]).optional().describe("Para toma_pecho: lado con el que empieza"),
      lugar: z.enum(["cuna", "brazos", "carriola", "auto", "otro"]).optional(),
      como_se_durmio: z.enum(["solo", "arrullo", "pecho", "biberon"]).optional(),
    }),
  }, conCtx("iniciar_timer", async (ctx, a: { baby_id?: string; tipo: (typeof TIMER)[number]; inicio?: string; lado?: "izq" | "der"; lugar?: string; como_se_durmio?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    puedeTipo(ctx, a.tipo);
    const ya = await activo(ctx, b.id, a.tipo);
    const tz = ctx.ajustes.tz;
    if (ya) return ok(`Ya hay ${NOMBRE_TIMER[a.tipo]} en curso desde las ${fHora(ms(ya.started_at), tz)}. No lo dupliqué. (event_id ${ya.id})`, { evento: eventoOut(ctx, ya), ya_existia: true });
    const h = hora(ctx, a.inicio);
    const ini = new Date(h.ms).toISOString();
    const payload = a.tipo === "sueno" ? normalizarPayload(ctx, "sueno", { lugar: a.lugar, como_se_durmio: a.como_se_durmio })
      : a.tipo === "toma_pecho" ? { lado_inicial: a.lado ?? "izq", segundos_izq: 0, segundos_der: 0, lado_activo: a.lado ?? "izq", activo_desde: ini }
      : {};
    const { data, error } = await ctx.db.from("events").insert({ baby_id: b.id, household_id: ctx.hogarId, tipo: a.tipo, started_at: ini, payload, logged_by: ctx.userId, source: "mcp" }).select(COLS).single();
    if (error || !data) throw errorDeBase(error, "iniciar el temporizador");
    const que = a.tipo === "sueno" ? "el sueño" : a.tipo === "toma_pecho" ? `la toma de pecho con el ${a.lado === "der" ? "derecho" : "izquierdo"}` : "la extracción";
    return ok(`Guardé: empezó ${que} a las ${fHora(h.ms, tz)}. (event_id ${data.id})${h.nota ? `\n${h.nota}` : ""}`, { evento: eventoOut(ctx, data as Evento), ya_existia: false, interpretacion_hora: h.nota });
  }));

  server.registerTool("registrar_despertar", {
    title: "Registrar que despertó",
    description: "Guarda la hora en que el bebé despertó (de la noche o de una siesta), con ánimo y si despertó solo o lo despertaron. Si hay un sueño en curso, lo cierra; si no, guarda el sueño desde «se_durmio» (por defecto, la hora de dormir del hogar de anoche). Con despertar_nocturno=true y volvio_a_dormir, parte la noche en dos.",
    inputSchema: z.object({
      baby_id: babyId,
      hora: horaTexto("Cuándo despertó"),
      se_durmio: z.string().optional().describe("Solo si no hay un sueño en curso: cuándo se durmió"),
      animo: z.enum(["mal", "neutral", "bien"]).optional(),
      como_termino: z.enum(["natural", "despertado"]).optional().describe("natural = despertó solo; despertado = lo despertaron"),
      despertar_nocturno: z.boolean().optional(),
      volvio_a_dormir: z.string().optional().describe("Para un despertar nocturno: cuándo se volvió a dormir"),
      notas: z.string().max(500).optional(),
    }),
  }, conCtx("registrar_despertar", async (ctx, a: { baby_id?: string; hora?: string; se_durmio?: string; animo?: "mal" | "neutral" | "bien"; como_termino?: "natural" | "despertado"; despertar_nocturno?: boolean; volvio_a_dormir?: string; notas?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    const tz = ctx.ajustes.tz;
    const h = hora(ctx, a.hora);
    const extra = { ...(a.animo ? { animo_despertar: a.animo } : {}), ...(a.como_termino ? { fin_sueno: a.como_termino } : {}) };
    const e = await activo(ctx, b.id, "sueno");
    let ev: Evento;
    if (e) {
      if (h.ms < ms(e.started_at)) throw new ErrorMcp("VALIDACION", `Esa hora es antes de que se durmiera (${fHora(ms(e.started_at), tz)}).`);
      if (h.ms - ms(e.started_at) > 24 * 3_600_000) throw new ErrorMcp("VALIDACION", "Ese sueño llevaría más de 24 horas. Corrige la hora de inicio con corregir_evento.");
      const notas = a.notas ? [e.notas, a.notas].filter(Boolean).join(" · ").slice(0, 1000) : e.notas;
      ev = await actualizar(ctx, e, { ended_at: new Date(h.ms).toISOString(), payload: { ...(e.payload as object), ...extra }, notas });
    } else {
      if (a.despertar_nocturno) throw new ErrorMcp("NO_ENCONTRADO", "No hay un sueño en curso para partir. Registra primero la hora de dormir (iniciar_timer con tipo sueno).");
      let ini = a.se_durmio ? hora(ctx, a.se_durmio).ms : (() => { const [hh, mm] = ctx.ajustes.horaDormir.split(":").map(Number); return desdeLocalHoy(ctx, hh, mm) - 86_400_000; })();
      if (ini >= h.ms) ini -= 86_400_000;
      if (h.ms - ini > 24 * 3_600_000) throw new ErrorMcp("VALIDACION", "Ese sueño duraría más de 24 horas. Revisa las horas.");
      const { data, error } = await ctx.db.from("events").insert({ baby_id: b.id, household_id: ctx.hogarId, tipo: "sueno", started_at: new Date(ini).toISOString(), ended_at: new Date(h.ms).toISOString(), payload: { lugar: "cuna", ...extra }, notas: a.notas ?? null, logged_by: ctx.userId, source: "mcp" }).select(COLS).single();
      if (error || !data) throw errorDeBase(error, "guardar el despertar");
      ev = data as Evento;
    }
    let nuevo: Evento | null = null;
    if (a.despertar_nocturno && a.volvio_a_dormir) {
      const v = Math.max(hora(ctx, a.volvio_a_dormir).ms, h.ms + 60_000);
      const { data, error } = await ctx.db.from("events").insert({ baby_id: b.id, household_id: ctx.hogarId, tipo: "sueno", started_at: new Date(v).toISOString(), payload: { lugar: (ev.payload as { lugar?: string }).lugar ?? "cuna" }, logged_by: ctx.userId, source: "mcp" }).select(COLS).single();
      if (error || !data) throw errorDeBase(error, "guardar que se volvió a dormir");
      nuevo = data as Evento;
    }
    const dur = (ms(ev.ended_at!) - ms(ev.started_at)) / MIN;
    const tipoTxt = a.despertar_nocturno ? "Despertar nocturno" : esNoche(ctx.ajustes)(ms(ev.started_at)) ? "Despertó de la noche" : "Despertó de la siesta";
    const plan = ctx.rol === "limitado" ? null : planOut(ctx, b.nombre, planDelDia(await eventosDesde(ctx, b.id, sumarDias(inicioDia(ctx.ahora, tz), -16, tz)), { fechaNacimiento: b.fecha_nacimiento, semanasGestacion: b.semanas_gestacion, nombre: b.nombre }, ctx.ahora, ctx.ajustes));
    const sig = plan && "siguiente" in plan ? plan.siguiente : null;
    return ok(`Guardé: ${tipoTxt.toLowerCase()} a las ${fHora(h.ms, tz)}; durmió ${fDuracion(dur)} (desde las ${fHora(ms(ev.started_at), tz)}).${nuevo ? ` Se volvió a dormir a las ${fHora(ms(nuevo.started_at), tz)}.` : ""}${h.nota ? `\n${h.nota}` : ""}${sig && sig.estado === "estimado" ? `\nSiguiente en el plan: ${sig.nombre}, ${sig.hora_texto}.` : ""}`, {
      evento: eventoOut(ctx, ev), volvio_a_dormir: nuevo ? eventoOut(ctx, nuevo) : null, siguiente_del_plan: sig,
    });
  }));

  const lado = async (ctx: Ctx, a: { baby_id?: string; lado?: "izq" | "der" | null }, pausar: boolean | null) => {
    const b = bebeDe(ctx, a.baby_id);
    const e = await activo(ctx, b.id, "toma_pecho");
    if (!e) throw new ErrorMcp("NO_ENCONTRADO", "No hay una toma de pecho en curso. Inicia una con iniciar_timer.");
    const ahora = new Date(ctx.ahora).toISOString();
    const p = { ...(e.payload as Payload<"toma_pecho">) };
    const s = segundosPecho(p, true, ctx.ahora);
    p.segundos_izq = Math.round(s.izq); p.segundos_der = Math.round(s.der);
    if (p.lado_activo) p.ultimo_lado = p.lado_activo;
    let nuevo: "izq" | "der" | null;
    if (pausar === true) nuevo = null;
    else if (pausar === false) nuevo = p.ultimo_lado ?? p.lado_inicial;
    else nuevo = a.lado ?? (p.lado_activo === "izq" ? "der" : "izq");
    p.lado_activo = nuevo; p.activo_desde = nuevo ? ahora : null;
    const ev = await actualizar(ctx, e, { payload: p });
    const t = `Izq. ${Math.round(s.izq / 60)} min · der. ${Math.round(s.der / 60)} min`;
    return ok(nuevo ? `Listo: ahora va con el ${nuevo === "izq" ? "izquierdo" : "derecho"}. ${t}.` : `Pausé la toma. ${t}.`, { evento: eventoOut(ctx, ev), lado_activo: nuevo, pausada: !nuevo });
  };

  server.registerTool("cambiar_lado", {
    title: "Cambiar de lado en la toma de pecho",
    description: "Cambia el lado de la toma de pecho en curso (o al lado indicado), acumulando el tiempo del lado anterior.",
    inputSchema: z.object({ baby_id: babyId, lado: z.enum(["izq", "der"]).optional().describe("Si falta, cambia al otro lado") }),
  }, conCtx("cambiar_lado", (ctx, a: { baby_id?: string; lado?: "izq" | "der" }) => lado(ctx, a, null)));

  server.registerTool("pausar_toma", {
    title: "Pausar o reanudar la toma de pecho",
    description: "Pausa la toma de pecho en curso (o la reanuda con el último lado si reanudar es true).",
    inputSchema: z.object({ baby_id: babyId, reanudar: z.boolean().optional() }),
  }, conCtx("pausar_toma", (ctx, a: { baby_id?: string; reanudar?: boolean }) => lado(ctx, a, a.reanudar ? false : true)));

  server.registerTool("terminar_timer", {
    title: "Terminar temporizador",
    description: "Cierra el temporizador activo (sueño, toma de pecho o extracción) y completa sus datos. Para extracción, manda los volúmenes en la unidad del hogar (o indica unidad).",
    inputSchema: z.object({
      baby_id: babyId,
      tipo: z.enum(TIMER),
      fin: horaTexto("Cuándo terminó"),
      lugar: z.enum(["cuna", "brazos", "carriola", "auto", "otro"]).optional(),
      como_se_durmio: z.enum(["solo", "arrullo", "pecho", "biberon"]).optional(),
      volumen_izq: z.number().optional(), volumen_der: z.number().optional(), unidad: z.enum(["ml", "oz"]).optional(),
    }),
  }, conCtx("terminar_timer", async (ctx, a: { baby_id?: string; tipo: (typeof TIMER)[number]; fin?: string; lugar?: string; como_se_durmio?: string; volumen_izq?: number; volumen_der?: number; unidad?: "ml" | "oz" }) => {
    const b = bebeDe(ctx, a.baby_id);
    puedeTipo(ctx, a.tipo);
    const e = await activo(ctx, b.id, a.tipo);
    if (!e) throw new ErrorMcp("NO_ENCONTRADO", `No hay ${NOMBRE_TIMER[a.tipo]} en curso.`);
    const h = hora(ctx, a.fin);
    if (h.ms < ms(e.started_at)) throw new ErrorMcp("VALIDACION", `El fin no puede ser antes del inicio (${fHora(ms(e.started_at), ctx.ajustes.tz)}).`);
    if (h.ms - ms(e.started_at) > 24 * 3_600_000) throw new ErrorMcp("VALIDACION", "Ese registro llevaría más de 24 horas abierto. Corrige la hora de inicio con corregir_evento.");
    let payload: Record<string, unknown> = { ...(e.payload as object) };
    if (a.tipo === "sueno") payload = { ...payload, ...(normalizarPayload(ctx, "sueno", { lugar: a.lugar ?? payload.lugar, como_se_durmio: a.como_se_durmio ?? payload.como_se_durmio }) as object) };
    if (a.tipo === "toma_pecho") {
      const s = segundosPecho(payload as Payload<"toma_pecho">, true, h.ms);
      payload = { ...payload, segundos_izq: Math.round(s.izq), segundos_der: Math.round(s.der), ultimo_lado: payload.lado_activo ?? payload.ultimo_lado ?? null, lado_activo: null, activo_desde: null };
    }
    if (a.tipo === "extraccion") payload = normalizarPayload(ctx, "extraccion", { volumen_izq: a.volumen_izq, volumen_der: a.volumen_der, unidad: a.unidad }) as Record<string, unknown>;
    const ev = await actualizar(ctx, e, { ended_at: new Date(h.ms).toISOString(), payload });
    const dur = (h.ms - ms(e.started_at)) / MIN;
    const d = describir(ev, opcionesDescripcion(ctx));
    const t = a.tipo === "sueno" ? `Guardé: ${d.titulo.toLowerCase()} de ${fDuracion(dur)}, de ${fHora(ms(e.started_at), ctx.ajustes.tz)} a ${fHora(h.ms, ctx.ajustes.tz)}.` : `Guardé: ${d.titulo.toLowerCase()}, ${d.detalle.toLowerCase()} (${fDuracion(dur)}).`;
    return ok(`${t} (event_id ${ev.id})${h.nota ? `\n${h.nota}` : ""}`, { evento: eventoOut(ctx, ev), duracion_min: Math.round(dur) });
  }));

  server.registerTool("registrar_evento", {
    title: "Registrar un evento",
    description: [
      "Registra algo que ya pasó o puntual: sueno (con inicio y fin), toma_pecho (minutos_izq, minutos_der, lado_inicial), toma_biberon (contenido: materna|formula|mixta, volumen, sobrante),",
      "toma_solidos (alimentos, cantidad, reaccion), extraccion (volumen_izq, volumen_der), panal (mojado, sucio, color, consistencia), temperatura (valor_c, metodo: axilar|rectal|frente|oido),",
      "sintoma (descripcion, severidad: leve|moderado|fuerte) o nota (texto). Los volúmenes van en la unidad del hogar salvo que pongas unidad (ml|oz).",
      "Para medicamentos usa registrar_medicamento. Si una hora como «a las 2» es ambigua se toma la ocurrencia pasada más reciente y se avisa.",
    ].join(" "),
    inputSchema: z.object({
      baby_id: babyId,
      tipo: z.enum(TIPOS.filter((t) => t !== "medicamento") as [Exclude<Tipo, "medicamento">, ...Exclude<Tipo, "medicamento">[]]),
      hora: horaTexto("Cuándo pasó (o cuándo empezó, si tiene duración)"),
      fin: z.string().optional().describe("Para sueño o toma con duración: cuándo terminó"),
      detalles: z.record(z.string(), z.unknown()).optional().describe("Campos del tipo, p. ej. {\"contenido\":\"formula\",\"volumen\":4,\"sobrante\":0.5}"),
      notas: z.string().max(1000).optional(),
    }),
  }, conCtx("registrar_evento", async (ctx, a: { baby_id?: string; tipo: Exclude<Tipo, "medicamento">; hora?: string; fin?: string; detalles?: Record<string, unknown>; notas?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    puedeTipo(ctx, a.tipo);
    const h = hora(ctx, a.hora);
    const f = a.fin ? hora(ctx, a.fin) : null;
    const fin = f?.ms ?? null;
    if (fin != null && fin < h.ms) throw new ErrorMcp("VALIDACION", "La hora de fin quedó antes del inicio. Revisa las horas.");
    const payload = normalizarPayload(ctx, a.tipo, a.detalles);
    let fin2 = fin;
    if (a.tipo === "toma_pecho" && fin2 == null) {
      const p = payload as { segundos_izq?: number; segundos_der?: number };
      fin2 = h.ms + ((p.segundos_izq ?? 0) + (p.segundos_der ?? 0)) * 1000;
    }
    if (a.tipo === "sueno" && fin2 == null) throw new ErrorMcp("VALIDACION", "Para un sueño que ya pasó necesito la hora en que despertó (fin). Si sigue dormido, usa iniciar_timer.");
    const { data, error } = await ctx.db.from("events").insert({ baby_id: b.id, household_id: ctx.hogarId, tipo: a.tipo, started_at: new Date(h.ms).toISOString(), ended_at: fin2 != null ? new Date(fin2).toISOString() : null, payload, notas: a.notas ?? null, logged_by: ctx.userId, source: "mcp" }).select(COLS).single();
    if (error || !data) throw errorDeBase(error, "guardar el registro");
    const ev = data as Evento;
    const recientes = a.tipo === "temperatura" ? await eventosDesde(ctx, b.id, ctx.ahora - 86_400_000) : [];
    const alarma = alarmaDe(ctx, ev, b, recientes);
    const notas = [h.nota, f?.nota].filter(Boolean).join("\n");
    return ok(`${textoGuardado(ev, opcionesDescripcion(ctx))}. (event_id ${ev.id})${notas ? `\n${notas}` : ""}${textoAlarma(alarma)}`, { evento: eventoOut(ctx, ev), interpretacion_hora: notas || null, alarma });
  }));

  server.registerTool("corregir_evento", {
    title: "Corregir un registro",
    description: "Cambia horas, detalles o notas de un registro. Usa la versión que devolvió la última lectura (version_esperada) para no pisar cambios de otra persona; si cambió, responde CONFLICTO con la versión actual.",
    inputSchema: z.object({
      event_id: z.string().uuid(),
      version_esperada: z.number().int().positive().optional(),
      hora: z.string().optional().describe("Nueva hora de inicio"),
      fin: z.string().optional().describe("Nueva hora de fin"),
      detalles: z.record(z.string(), z.unknown()).optional().describe("Solo los campos que cambian"),
      notas: z.string().max(1000).optional(),
    }),
  }, conCtx("corregir_evento", async (ctx, a: { event_id: string; version_esperada?: number; hora?: string; fin?: string; detalles?: Record<string, unknown>; notas?: string }) => {
    const { data: e } = await ctx.db.from("events").select(COLS).eq("id", a.event_id).maybeSingle();
    if (!e) throw new ErrorMcp("NO_ENCONTRADO", "No encontré ese registro (o tu rol no lo ve).");
    const ev0 = e as Evento;
    if (a.version_esperada && a.version_esperada !== ev0.version) {
      return { ...ok(`CONFLICTO: alguien más cambió este registro (va en la versión ${ev0.version}). Este es el registro actual; confirma con la persona antes de repetir el cambio.`, { codigo: "CONFLICTO", actual: eventoOut(ctx, ev0) }), isError: true };
    }
    const cambios: { started_at?: string; ended_at?: string | null; payload?: unknown; notas?: string | null } = {};
    const notas: string[] = [];
    if (a.hora) { const h = hora(ctx, a.hora); cambios.started_at = new Date(h.ms).toISOString(); if (h.nota) notas.push(h.nota); }
    if (a.fin) { const f = hora(ctx, a.fin); cambios.ended_at = new Date(f.ms).toISOString(); if (f.nota) notas.push(f.nota); }
    if (a.notas !== undefined) cambios.notas = a.notas;
    if (a.detalles) {
      const base = ev0.payload as Record<string, unknown>;
      const nuevos = normalizarPayload(ctx, ev0.tipo, { ...base, ...(ev0.tipo === "toma_biberon" && base.volumen_ml != null && a.detalles.volumen == null ? { volumen_ml: base.volumen_ml } : {}), ...(ev0.tipo === "toma_biberon" && base.sobrante_ml != null && a.detalles.sobrante == null ? { sobrante_ml: base.sobrante_ml } : {}), ...a.detalles }) as Record<string, unknown>;
      cambios.payload = { ...base, ...nuevos };
    }
    const ev = await actualizar(ctx, ev0, cambios, ev0.version);
    return ok(`Corregí el registro: ${eventoOut(ctx, ev).resumen_texto}, ${fHora(ms(ev.started_at), ctx.ajustes.tz)}. (event_id ${ev.id}, versión ${ev.version})${notas.length ? `\n${notas.join("\n")}` : ""}`, { evento: eventoOut(ctx, ev) });
  }));

  server.registerTool("eliminar_evento", {
    title: "Eliminar un registro",
    description: "Borrado lógico de un registro. Se puede revertir con deshacer_eliminacion.",
    inputSchema: z.object({ event_id: z.string().uuid() }),
    annotations: { destructiveHint: true },
  }, conCtx("eliminar_evento", async (ctx, a: { event_id: string }) => {
    const { data: e } = await ctx.db.from("events").select(COLS).eq("id", a.event_id).is("eliminado_en", null).maybeSingle();
    if (!e) throw new ErrorMcp("NO_ENCONTRADO", "No encontré ese registro (o ya estaba eliminado).");
    const ev = await actualizar(ctx, e as Evento, { eliminado_en: new Date(ctx.ahora).toISOString() });
    return ok(`Eliminé: ${eventoOut(ctx, ev).resumen_texto}, ${fHora(ms(ev.started_at), ctx.ajustes.tz)}. Si fue un error, puedo deshacerlo con deshacer_eliminacion.`, { event_id: ev.id, eliminado_en: ev.eliminado_en, como_revertir: "deshacer_eliminacion" });
  }));

  server.registerTool("deshacer_eliminacion", {
    title: "Deshacer una eliminación",
    description: "Restaura un registro eliminado con eliminar_evento.",
    inputSchema: z.object({ event_id: z.string().uuid() }),
  }, conCtx("deshacer_eliminacion", async (ctx, a: { event_id: string }) => {
    const { data: e } = await ctx.db.from("events").select(COLS).eq("id", a.event_id).maybeSingle();
    if (!e) throw new ErrorMcp("NO_ENCONTRADO", "No encontré ese registro.");
    if (!e.eliminado_en) return ok("Ese registro no estaba eliminado.", { evento: eventoOut(ctx, e as Evento) });
    const ev = await actualizar(ctx, e as Evento, { eliminado_en: null });
    return ok(`Restauré: ${eventoOut(ctx, ev).resumen_texto}, ${fHora(ms(ev.started_at), ctx.ajustes.tz)}.`, { evento: eventoOut(ctx, ev) });
  }));
}
