import "server-only";
import * as z from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { bebeDe, ErrorMcp, type Ctx } from "../contexto";
import { COLS, dia, eventoOut, eventosDesde, nombresMedicamentos, nombresMiembros, ok, type Respuesta } from "../util";
import { ms, TIPOS, TIPOS_LIMITADO, type Evento, type Tipo } from "@/lib/core/eventos";
import { edadMeses, estadisticasPeriodo, referenciaSueno, suenoDelDia, ventanaVigilia, esNoche, type Estadisticas } from "@/lib/core/sueno";
import { aprenderPatrones, cuentaRegresiva, minutosAHora, nombreBloque, planDelDia, type Bloque, type PlanDia } from "@/lib/core/planDia";
import { DIA, fDuracion, fechaISO, fFecha, fHora, inicioDia, MIN, partes, sumarDias } from "@/lib/core/tiempo";
import { fVolumen } from "@/lib/core/unidades";

type ConCtx = <A>(nombre: string, fn: (ctx: Ctx, args: A) => Promise<Respuesta>) => (args: A, extra: unknown) => Promise<Respuesta>;
const babyId = z.string().optional().describe("ID o nombre del bebé. Si el hogar tiene un solo bebé, se infiere.");

const FUENTE_TXT: Record<Bloque["fuente"], string> = { registro: "registrado", registros: "según sus registros", edad: "referencia por edad", horario: "horario fijo del hogar" };

/** Plan del día para Claude: bloques con horas legibles, siguiente bloque y texto. */
export function planOut(ctx: Ctx, nombre: string, p: PlanDia) {
  const tz = ctx.ajustes.tz;
  if (p.estado !== "ok") return { estado: p.estado, razon: p.razon, texto: p.razon };
  const bloque = (b: Bloque) => ({
    tipo: b.tipo, n: b.n ?? null, nombre: nombreBloque(b, p.siestas), estado: b.estado, fuente: b.fuente,
    desde: new Date(b.desde).toISOString(), hasta: new Date(b.hasta).toISOString(),
    hora_texto: b.estado === "estimado" ? (b.tipo === "despertar" ? `cerca de las ${fHora(b.hora, tz)}` : `entre ${fHora(b.desde, tz)} y ${fHora(b.hasta, tz)}`) : fHora(b.hora, tz),
    fin_texto: b.fin ? fHora(b.fin, tz) : null, duracion_min: b.duracionMin ?? null, por_que: b.porQue,
  });
  const cr = cuentaRegresiva(p, ctx.ahora, tz);
  const lineas = p.bloques.map((b) => {
    const x = bloque(b);
    const dur = b.tipo === "siesta" && b.duracionMin ? ` (${b.estado === "hecho" ? "" : "≈ "}${fDuracion(b.duracionMin)})` : "";
    return `• ${x.nombre}: ${b.estado === "hecho" ? (b.tipo === "siesta" && b.fin ? `${fHora(b.desde, tz)} a ${fHora(b.fin, tz)}` : x.hora_texto) + " ✓" : b.estado === "en_curso" ? `en curso desde ${fHora(b.desde, tz)}` : x.hora_texto}${dur} — ${FUENTE_TXT[b.fuente]}`;
  });
  const texto = [
    `Plan de hoy para ${nombre} (estimación, confianza ${p.confianza}):`,
    ...lineas,
    cr ? `Siguiente: ${cr.titulo}${cr.detalle ? `, ${cr.detalle}` : ""}`.replace(/\.?$/, ".") : null,
    p.fuenteSiestas === "edad" ? `${p.referencia.texto}.` : p.fuenteSiestas === "horario" ? "Sigue el horario fijo que configuró el hogar." : `En sus últimos días hizo ${p.siestas} siesta${p.siestas === 1 ? "" : "s"}.`,
    ...p.avisos,
    p.nota,
  ].filter(Boolean).join("\n");
  return {
    estado: "ok", confianza: p.confianza, siestas: p.siestas, fuente_siestas: p.fuenteSiestas, referencia: p.referencia.texto,
    bloques: p.bloques.map(bloque), siguiente: p.siguiente ? bloque(p.siguiente) : null, cuenta_regresiva: cr, avisos: p.avisos, nota: p.nota, texto,
  };
}

export async function calcularPlan(ctx: Ctx, b: { id: string; nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null }) {
  const tz = ctx.ajustes.tz;
  const evs = await eventosDesde(ctx, b.id, sumarDias(inicioDia(ctx.ahora, tz), -16, tz));
  return planDelDia(evs, { fechaNacimiento: b.fecha_nacimiento, semanasGestacion: b.semanas_gestacion, nombre: b.nombre }, ctx.ahora, ctx.ajustes);
}

/** Rango [desde, hasta) en ms según el período pedido, en la zona del hogar. */
function rango(ctx: Ctx, periodo: string, desde?: string, hasta?: string): { desde: number; hasta: number; etiqueta: string } {
  const tz = ctx.ajustes.tz;
  const hoy = inicioDia(ctx.ahora, tz);
  const manana = sumarDias(hoy, 1, tz);
  switch (periodo) {
    case "hoy": return { desde: hoy, hasta: manana, etiqueta: "hoy" };
    case "ayer": return { desde: sumarDias(hoy, -1, tz), hasta: hoy, etiqueta: "ayer" };
    case "7d": return { desde: sumarDias(hoy, -7, tz), hasta: hoy, etiqueta: "los últimos 7 días completos" };
    case "30d": return { desde: sumarDias(hoy, -30, tz), hasta: hoy, etiqueta: "los últimos 30 días completos" };
    case "semana": { const dow = (partes(ctx.ahora, tz).diaSemana + 6) % 7; const ini = sumarDias(hoy, -dow, tz); return { desde: ini, hasta: manana, etiqueta: "esta semana (desde el lunes)" }; }
    case "mes": { const p = partes(ctx.ahora, tz); const ini = sumarDias(hoy, -(p.dia - 1), tz); return { desde: ini, hasta: manana, etiqueta: "este mes" }; }
    default: {
      if (!desde) throw new ErrorMcp("VALIDACION", "Para un rango indica desde (y opcionalmente hasta) como AAAA-MM-DD.");
      const d = dia(ctx, desde, hoy);
      const h = hasta ? sumarDias(dia(ctx, hasta, hoy), 1, tz) : manana;
      if (h <= d) throw new ErrorMcp("VALIDACION", "El final del rango quedó antes del inicio.");
      if (h - d > 400 * DIA) throw new ErrorMcp("VALIDACION", "El rango máximo es de 400 días.");
      return { desde: d, hasta: h, etiqueta: `del ${fFecha(d, tz).toLowerCase()} al ${fFecha(h - 1, tz).toLowerCase()}` };
    }
  }
}

function resumenOut(ctx: Ctx, st: Estadisticas, evs: Evento[], desde: number, hasta: number, meses: number, meds: Record<string, string>) {
  const ref = referenciaSueno(meses);
  const en = evs.filter((e) => ms(e.started_at) >= desde && ms(e.started_at) < hasta);
  const medic = new Map<string, number>();
  for (const e of en.filter((x) => x.tipo === "medicamento")) {
    const n = meds[String((e.payload as { medication_id?: string }).medication_id)] ?? "Medicamento";
    medic.set(n, (medic.get(n) ?? 0) + 1);
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    dias_con_registros: st.dias,
    sueno: { total_prom_min: Math.round(st.suenoMin), noche_prom_min: Math.round(st.nocheMin), siestas_prom_min: Math.round(st.siestasMin), n_siestas_prom: r1(st.siestas), despertares_noche_prom: r1(st.despertaresNoche), referencia: { min_h: ref.minH, max_h: ref.maxH, texto: `Referencia por edad: ${ref.texto}` } },
    tomas: {
      por_dia: r1(st.tomas),
      pecho: { por_dia: r1(st.pecho), min_prom: Math.round(st.pechoMin), min_izq_prom: Math.round(st.pechoIzqMin), min_der_prom: Math.round(st.pechoDerMin) },
      biberon: { por_dia: r1(st.biberon), volumen_prom_ml: Math.round(st.biberonMl), volumen_total_ml: Math.round(st.biberonMlTotal), volumen_prom_texto: fVolumen(st.biberonMl, ctx.ajustes.unidadVolumen) },
      solidos: { por_dia: r1(st.solidos) },
    },
    panales: { mojados_por_dia: r1(st.mojados), sucios_por_dia: r1(st.sucios) },
    ...(ctx.rol === "limitado" ? {} : {
      medicamentos: [...medic].map(([nombre, n]) => ({ nombre, n })),
      temperaturas: en.filter((e) => e.tipo === "temperatura").map((e) => ({ valor_c: (e.payload as { valor_c: number }).valor_c, at: e.started_at })),
    }),
  };
}

function textoResumen(ctx: Ctx, nombre: string, etiqueta: string, r: ReturnType<typeof resumenOut>) {
  if (!r.dias_con_registros) return `No hay registros de ${nombre} para ${etiqueta}.`;
  const l = [
    `${nombre}, ${etiqueta} (${r.dias_con_registros} ${r.dias_con_registros === 1 ? "día" : "días"} con registros; promedios por día):`,
    `Sueño: ${fDuracion(r.sueno.total_prom_min)} (noche ${fDuracion(r.sueno.noche_prom_min)}, siestas ${fDuracion(r.sueno.siestas_prom_min)} en ${r.sueno.n_siestas_prom}). ${r.sueno.referencia.texto}.`,
    `Tomas: ${r.tomas.por_dia} al día${r.tomas.pecho.por_dia ? `; pecho ${r.tomas.pecho.por_dia} (izq. ${r.tomas.pecho.min_izq_prom} min, der. ${r.tomas.pecho.min_der_prom} min)` : ""}${r.tomas.biberon.por_dia ? `; biberón ${r.tomas.biberon.por_dia} de ${r.tomas.biberon.volumen_prom_texto}` : ""}${r.tomas.solidos.por_dia ? `; sólidos ${r.tomas.solidos.por_dia}` : ""}.`,
    `Pañales: ${r.panales.mojados_por_dia} mojados y ${r.panales.sucios_por_dia} sucios.`,
    r.medicamentos?.length ? `Medicamentos: ${r.medicamentos.map((m) => `${m.nombre} (${m.n})`).join(", ")}.` : null,
    r.temperaturas?.length ? `Temperaturas: ${r.temperaturas.map((t) => `${t.valor_c} °C (${fHora(ms(t.at), ctx.ajustes.tz)})`).join(", ")}.` : null,
  ];
  return l.filter(Boolean).join("\n");
}

function limitarLimitado(ctx: Ctx, desde: number) {
  if (ctx.rol === "limitado" && desde < inicioDia(ctx.ahora, ctx.ajustes.tz)) throw new ErrorMcp("PERMISO", "Tu rol (limitado) ve solo lo de hoy. Para días anteriores, pídeselo a un cuidador o a quien administra el hogar.");
}

function patronesOut(p: ReturnType<typeof aprenderPatrones>) {
  const hh = (m: number | null) => (m == null ? null : minutosAHora(m));
  return {
    dias_con_datos: p.diasConDatos, despertar_habitual: hh(p.despertarMin), dormir_habitual: hh(p.dormirMin), siestas_por_dia: p.siestasPorDia,
    siestas: p.porPosicion.map((x, i) => ({ n: i + 1, inicio_habitual: hh(x.inicioMin), duracion_min: x.duracionMin, despierta_antes_min: x.ventanaPreviaMin, dias: x.dias })),
    franjas_con_mas_sueno: p.franjas.map((f, i) => ({ desde: minutosAHora(i * 30), fraccion: Math.round(f * 100) / 100 })).filter((x) => x.fraccion >= 0.6).map((x) => x.desde),
  };
}

const mediana = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const minDelDia = (t: number, tz: string) => { const p = partes(t, tz); return p.hora * 60 + p.minuto; };
const hhmm = (min: number) => { const h = Math.floor(min / 60) % 24, m = Math.round(min % 60); const d = new Date(Date.UTC(2000, 0, 1, h, m)); return fHora(d.getTime(), "UTC"); };

export function registrarHerramientasConsulta(server: McpServer, conCtx: ConCtx) {
  server.registerTool("consultar_eventos", {
    title: "Consultar registros",
    description: "Lista registros con filtros (tipos, rango de fechas, quién registró, origen web o Claude). Máximo 200; si hay más, truncado=true.",
    inputSchema: z.object({
      baby_id: babyId,
      tipos: z.array(z.enum(TIPOS)).optional(),
      desde: z.string().optional().describe("Fecha AAAA-MM-DD, «hoy», «ayer» o una hora natural"),
      hasta: z.string().optional().describe("Fecha AAAA-MM-DD (incluida)"),
      logged_by: z.string().optional().describe("Nombre de quien registró"),
      source: z.enum(["web", "mcp"]).optional(),
      limite: z.number().int().min(1).max(200).optional(),
    }),
    annotations: { readOnlyHint: true },
  }, conCtx("consultar_eventos", async (ctx, a: { baby_id?: string; tipos?: Tipo[]; desde?: string; hasta?: string; logged_by?: string; source?: "web" | "mcp"; limite?: number }) => {
    const b = bebeDe(ctx, a.baby_id);
    const tz = ctx.ajustes.tz;
    const desde = dia(ctx, a.desde, sumarDias(inicioDia(ctx.ahora, tz), -1, tz));
    const hasta = a.hasta ? sumarDias(dia(ctx, a.hasta, ctx.ahora), 1, tz) : ctx.ahora + DIA;
    limitarLimitado(ctx, desde);
    const limite = a.limite ?? 50;
    const nombres = await nombresMiembros(ctx);
    let q = ctx.db.from("events").select(COLS).eq("baby_id", b.id).is("eliminado_en", null).gte("started_at", new Date(desde).toISOString()).lt("started_at", new Date(hasta).toISOString());
    const tipos = a.tipos?.length ? a.tipos : null;
    if (tipos) q = q.in("tipo", ctx.rol === "limitado" ? tipos.filter((t) => TIPOS_LIMITADO.includes(t)) : tipos);
    if (a.source) q = q.eq("source", a.source);
    if (a.logged_by) {
      const ids = Object.entries(nombres).filter(([, n]) => n.toLowerCase().includes(a.logged_by!.toLowerCase())).map(([id]) => id);
      if (!ids.length) return ok(`No hay nadie llamado «${a.logged_by}» en el hogar.`, { eventos: [], truncado: false });
      q = q.in("logged_by", ids);
    }
    const { data, error } = await q.order("started_at", { ascending: false }).limit(limite + 1);
    if (error) throw new ErrorMcp("ERROR", "No pudimos leer los registros.");
    const meds = await nombresMedicamentos(ctx, b.id);
    const evs = (data ?? []) as Evento[];
    const truncado = evs.length > limite;
    const out = evs.slice(0, limite).map((e) => eventoOut(ctx, e, nombres, meds));
    const txt = out.length
      ? out.map((e) => `• ${fFecha(ms(e.started_at), tz)}, ${fHora(ms(e.started_at), tz)}: ${e.resumen_texto}${e.logged_by_nombre ? ` (${e.logged_by_nombre}${e.source === "mcp" ? ", desde Claude" : ""})` : ""}`).join("\n")
      : "No hay registros con esos filtros.";
    return ok(`${txt}${truncado ? `\n(Hay más; muestro los ${limite} más recientes.)` : ""}`, { eventos: out, truncado });
  }));

  server.registerTool("resumen", {
    title: "Resumen de un período",
    description: "Promedios por día de sueño (noche y siestas, con la referencia por edad), tomas, pañales, medicamentos y temperaturas. Periodos: hoy, ayer, 7d, 30d, semana, mes o rango (con desde/hasta).",
    inputSchema: z.object({
      baby_id: babyId,
      periodo: z.enum(["hoy", "ayer", "7d", "30d", "semana", "mes", "rango"]),
      desde: z.string().optional(), hasta: z.string().optional(),
    }),
    annotations: { readOnlyHint: true },
  }, conCtx("resumen", async (ctx, a: { baby_id?: string; periodo: string; desde?: string; hasta?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    const r = rango(ctx, a.periodo, a.desde, a.hasta);
    limitarLimitado(ctx, r.desde);
    const [evs, meds] = await Promise.all([eventosDesde(ctx, b.id, sumarDias(r.desde, -1, ctx.ajustes.tz), r.hasta), nombresMedicamentos(ctx, b.id)]);
    const st = estadisticasPeriodo(evs, r.desde, r.hasta, ctx.ahora, ctx.ajustes);
    const out = resumenOut(ctx, st, evs, r.desde, r.hasta, edadMeses(b.fecha_nacimiento, ctx.ahora, b.semanas_gestacion), meds);
    return ok(textoResumen(ctx, b.nombre, r.etiqueta, out), { rango: { desde: fechaISO(r.desde, ctx.ajustes.tz), hasta: fechaISO(r.hasta - 1, ctx.ajustes.tz) }, ...out });
  }));

  server.registerTool("analizar_periodo", {
    title: "Analizar un período",
    description: "Compara un período con el anterior de la misma duración: diferencias, sueño por día, horarios medianos de dormir y despertar, ventanas de vigilia, días atípicos y días sin registros. Describe patrones; no diagnostica.",
    inputSchema: z.object({
      baby_id: babyId,
      periodo: z.enum(["semana", "mes", "7d", "30d", "rango"]),
      desde: z.string().optional(), hasta: z.string().optional(),
    }),
    annotations: { readOnlyHint: true },
  }, conCtx("analizar_periodo", async (ctx, a: { baby_id?: string; periodo: string; desde?: string; hasta?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    if (ctx.rol === "limitado") throw new ErrorMcp("PERMISO", "Tu rol (limitado) ve solo lo de hoy. El análisis de períodos lo ven cuidadores y quien administra.");
    const tz = ctx.ajustes.tz;
    const r = rango(ctx, a.periodo, a.desde, a.hasta);
    const hastaReal = Math.min(r.hasta, sumarDias(inicioDia(ctx.ahora, tz), 1, tz));
    const nDias = Math.max(1, Math.round((r.hasta - r.desde) / DIA));
    const antDesde = sumarDias(r.desde, -nDias, tz);
    const [evs, meds] = await Promise.all([eventosDesde(ctx, b.id, sumarDias(antDesde, -1, tz), hastaReal), nombresMedicamentos(ctx, b.id)]);
    const meses = edadMeses(b.fecha_nacimiento, ctx.ahora, b.semanas_gestacion);
    const stA = estadisticasPeriodo(evs, r.desde, hastaReal, ctx.ahora, ctx.ajustes);
    const stB = estadisticasPeriodo(evs, antDesde, r.desde, ctx.ahora, ctx.ajustes);
    const actual = resumenOut(ctx, stA, evs, r.desde, hastaReal, meses, meds);
    const anterior = resumenOut(ctx, stB, evs, antDesde, r.desde, meses, meds);
    const dif = (x: number, y: number) => ({ abs: Math.round((x - y) * 10) / 10, pct: y ? Math.round(((x - y) / y) * 100) : null });
    const diferencias = {
      sueno_total_min: dif(stA.suenoMin, stB.suenoMin), noche_min: dif(stA.nocheMin, stB.nocheMin), siestas_min: dif(stA.siestasMin, stB.siestasMin),
      tomas_por_dia: dif(stA.tomas, stB.tomas), mojados_por_dia: dif(stA.mojados, stB.mojados),
    };
    const noche = esNoche(ctx.ajustes);
    const vivos = evs.filter((e) => !e.eliminado_en);
    const porDia: { fecha: string; sueno_min: number; siestas: number; tomas: number; mojados: number; con_registros: boolean }[] = [];
    const dormir: number[] = [], despertar: number[] = [];
    for (let d = r.desde; d < hastaReal; d = sumarDias(d, 1, tz)) {
      const d2 = sumarDias(d, 1, tz);
      const delDia = vivos.filter((e) => ms(e.started_at) >= d && ms(e.started_at) < d2);
      const s = suenoDelDia(vivos, d, ctx.ahora, ctx.ajustes);
      porDia.push({
        fecha: fechaISO(d, tz), sueno_min: Math.round(s.totalMin), siestas: s.siestas,
        tomas: delDia.filter((e) => ["toma_pecho", "toma_biberon", "toma_solidos"].includes(e.tipo)).length,
        mojados: delDia.filter((e) => e.tipo === "panal" && (e.payload as { mojado?: boolean }).mojado).length,
        con_registros: delDia.length > 0,
      });
      const nocturno = delDia.filter((e) => e.tipo === "sueno" && noche(ms(e.started_at)) && ms(e.started_at) >= d + 15 * 3_600_000).sort((x, y) => ms(x.started_at) - ms(y.started_at))[0];
      if (nocturno) dormir.push(minDelDia(ms(nocturno.started_at), tz));
      const desp = vivos.filter((e) => e.tipo === "sueno" && e.ended_at && noche(ms(e.started_at)) && ms(e.ended_at) >= d && ms(e.ended_at) < d + 11 * 3_600_000).sort((x, y) => ms(y.ended_at!) - ms(x.ended_at!))[0];
      if (desp) despertar.push(minDelDia(ms(desp.ended_at!), tz));
    }
    // Ventanas de vigilia diurnas: del fin de un sueño al inicio del siguiente, en el período.
    const suenos = vivos.filter((e) => e.tipo === "sueno" && e.ended_at && ms(e.started_at) >= r.desde && ms(e.started_at) < hastaReal).sort((x, y) => ms(x.started_at) - ms(y.started_at));
    const ventanas: number[] = [];
    for (let i = 1; i < suenos.length; i++) {
      const w = (ms(suenos[i].started_at) - ms(suenos[i - 1].ended_at!)) / MIN;
      if (w > 15 && w < 8 * 60 && !noche(ms(suenos[i - 1].ended_at!))) ventanas.push(w);
    }
    const medV = mediana(ventanas);
    const dispersion = ventanas.length > 3 ? Math.round([...ventanas].sort((x, y) => x - y)[Math.floor(ventanas.length * 0.75)] - [...ventanas].sort((x, y) => x - y)[Math.floor(ventanas.length * 0.25)]) : null;
    const con = porDia.filter((d) => d.con_registros);
    const promS = con.reduce((t, d) => t + d.sueno_min, 0) / Math.max(1, con.length);
    const dias_atipicos = con.filter((d) => Math.abs(d.sueno_min - promS) > 120).map((d) => ({ fecha: d.fecha, motivo: d.sueno_min > promS ? `Durmió ${fDuracion(d.sueno_min - promS)} más que el promedio del período` : `Durmió ${fDuracion(promS - d.sueno_min)} menos que el promedio del período` }));
    for (const e of vivos.filter((x) => (x.tipo === "temperatura" && Number((x.payload as { valor_c?: number }).valor_c) >= 38) || x.tipo === "sintoma")) {
      const f = fechaISO(ms(e.started_at), tz);
      if (ms(e.started_at) >= r.desde && !dias_atipicos.some((d) => d.fecha === f)) dias_atipicos.push({ fecha: f, motivo: e.tipo === "sintoma" ? "Hay síntomas registrados" : "Hay una temperatura de 38 °C o más" });
    }
    const datos_faltantes = porDia.filter((d) => !d.con_registros).map((d) => d.fecha);
    const ref = referenciaSueno(meses);
    const rv = ventanaVigilia(meses);
    const fuera = stA.dias && (stA.suenoMin / 60 < ref.minH - 1 || stA.suenoMin / 60 > ref.maxH + 1);
    const aviso_pediatra = fuera || dias_atipicos.some((d) => d.motivo.includes("38")) ? "Si notas algo que te preocupa, coméntalo con su pediatra; estos datos son registros de la familia, no un diagnóstico." : null;
    const signo = (n: number) => (n >= 0 ? `+${fDuracion(n)}` : `−${fDuracion(-n)}`);
    const texto = [
      textoResumen(ctx, b.nombre, r.etiqueta, actual),
      stB.dias ? `Frente al período anterior: sueño total ${signo(stA.suenoMin - stB.suenoMin)}, noche ${signo(stA.nocheMin - stB.nocheMin)}, siestas ${signo(stA.siestasMin - stB.siestasMin)}; tomas ${diferencias.tomas_por_dia.abs >= 0 ? "+" : ""}${diferencias.tomas_por_dia.abs} al día.` : "No hay registros del período anterior para comparar.",
      dormir.length ? `Hora mediana de dormir: ${hhmm(mediana(dormir)!)}; ${despertar.length ? `de despertar: ${hhmm(mediana(despertar)!)}.` : ""}` : null,
      medV ? `Ventana de vigilia mediana: ${fDuracion(medV)}${dispersion != null ? ` (dispersión ${fDuracion(dispersion)})` : ""}${rv ? `; referencia por edad: ${rv[0]}–${rv[1]} min` : ""}.` : null,
      dias_atipicos.length ? `Días distintos: ${dias_atipicos.map((d) => `${d.fecha}: ${d.motivo}`).join("; ")}.` : null,
      datos_faltantes.length ? `Días sin registros: ${datos_faltantes.join(", ")}.` : null,
      aviso_pediatra,
    ].filter(Boolean).join("\n");
    return ok(texto, {
      rango: { desde: fechaISO(r.desde, tz), hasta: fechaISO(hastaReal - 1, tz) }, actual, anterior, diferencias, por_dia: porDia,
      horarios: { dormir_mediana: dormir.length ? hhmm(mediana(dormir)!) : null, despertar_mediana: despertar.length ? hhmm(mediana(despertar)!) : null },
      ventanas_vigilia: { mediana_min: medV != null ? Math.round(medV) : null, dispersion_min: dispersion, referencia_edad_min: rv },
      dias_atipicos, datos_faltantes, aviso_pediatra,
      patrones_aprendidos: patronesOut(aprenderPatrones(evs, ctx.ahora, ctx.ajustes)),
    });
  }));

  server.registerTool("predecir_proximo_sueno", {
    title: "Estimar el próximo sueño",
    description: "Siguiente bloque del plan del día (siesta u hora de dormir): franja estimada, cuánto falta, en qué se basa y avisos. Es una estimación por edad y registros recientes, no una indicación.",
    inputSchema: z.object({ baby_id: babyId }),
    annotations: { readOnlyHint: true },
  }, conCtx("predecir_proximo_sueno", async (ctx, a: { baby_id?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    if (ctx.rol === "limitado") throw new ErrorMcp("PERMISO", "Tu rol (limitado) no incluye estimaciones. Puedes ver el estado actual.");
    const out = planOut(ctx, b.nombre, await calcularPlan(ctx, b));
    if (out.estado !== "ok" || !("siguiente" in out)) return ok(out.texto, out);
    const s = out.siguiente;
    const txt = s
      ? `${`${out.cuenta_regresiva?.titulo ?? s.nombre}${out.cuenta_regresiva?.detalle ? `, ${out.cuenta_regresiva.detalle}` : ""}`.replace(/\.?$/, ".")} ${s.nombre}: ${s.hora_texto}${s.duracion_min ? `, ≈ ${fDuracion(s.duracion_min)}` : ""} (confianza ${out.confianza}). ${s.por_que}${out.avisos.length ? ` ${out.avisos.join(" ")}` : ""}\n${out.nota}`
      : `El plan de hoy ya está completo.\n${out.nota}`;
    return ok(txt, { siguiente: s, cuenta_regresiva: out.cuenta_regresiva, confianza: out.confianza, avisos: out.avisos, nota: out.nota });
  }));

  server.registerTool("plan_del_dia", {
    title: "Plan del día de sueño",
    description: "Cómo se estima el día: hora de despertar, cada siesta (franja y duración) y hora de dormir, marcando lo ya registrado. Usa los registros del bebé, la referencia por edad o el horario fijo del hogar. Es una estimación, no una indicación.",
    inputSchema: z.object({ baby_id: babyId }),
    annotations: { readOnlyHint: true },
  }, conCtx("plan_del_dia", async (ctx, a: { baby_id?: string }) => {
    const b = bebeDe(ctx, a.baby_id);
    if (ctx.rol === "limitado") throw new ErrorMcp("PERMISO", "Tu rol (limitado) no incluye el plan del día. Puedes ver el estado actual.");
    const out = planOut(ctx, b.nombre, await calcularPlan(ctx, b));
    return ok(out.texto, out);
  }));

}
