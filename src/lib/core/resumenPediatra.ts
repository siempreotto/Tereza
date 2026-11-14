// Resumen para el pediatra (web e MCP): crecimiento, sueño, tomas, medicamentos, síntomas y dudas. Nunca diagnostica.
import { edadDias, percentil, textoPercentil } from "./crecimiento";
import { describir, ms, type Evento } from "./eventos";
import { estadisticasPeriodo, type Hogar } from "./sueno";
import { fDuracion, fFecha, fHora } from "./tiempo";
import { fLongitud, fPeso, fTemperatura, fVolumen, type UnidadLongitud, type UnidadPeso, type UnidadVolumen } from "./unidades";

export type EntradaResumen = {
  bebe: { nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null; sexo: string };
  hogar: Hogar & { unidadVolumen: UnidadVolumen; unidadPeso: UnidadPeso; unidadLongitud: UnidadLongitud };
  desde: number; hasta: number; ahora: number;
  eventos: Evento[];
  medidas: { medido_en: string; peso_g: number | null; longitud_mm: number | null; perimetro_cefalico_mm: number | null; origen: string }[];
  tratamientos: { id: string; nombre: string; indicacion_textual: string; activo: boolean }[];
  dudas: { texto: string; resuelta_en_visita_id: string | null }[];
  ultimaVisita: { fecha: string; motivo: string | null } | null;
};

export function resumenPediatra(e: EntradaResumen) {
  const { hogar: h, bebe } = e;
  const sexo = bebe.sexo as "M" | "F";
  const st = estadisticasPeriodo(e.eventos, e.desde, e.hasta, e.ahora, h);
  const crecimiento = e.medidas
    .filter((m) => ms(m.medido_en) >= e.desde - 400 * 86_400_000)
    .map((m) => {
      const dias = edadDias(bebe.fecha_nacimiento, ms(m.medido_en), bebe.semanas_gestacion);
      return {
        fecha: fFecha(ms(m.medido_en), h.tz), origen: m.origen,
        peso: m.peso_g ? `${fPeso(m.peso_g, h.unidadPeso)} · ${textoPercentil(percentil("peso", sexo, dias, m.peso_g / 1000))}` : null,
        longitud: m.longitud_mm ? `${fLongitud(m.longitud_mm, h.unidadLongitud)} · ${textoPercentil(percentil("longitud", sexo, dias, m.longitud_mm / 10))}` : null,
        perimetro: m.perimetro_cefalico_mm ? `${fLongitud(m.perimetro_cefalico_mm, h.unidadLongitud)} · ${textoPercentil(percentil("perimetro", sexo, dias, m.perimetro_cefalico_mm / 10))}` : null,
      };
    });
  const enRango = e.eventos.filter((x) => !x.eliminado_en && ms(x.started_at) >= e.desde && ms(x.started_at) < e.hasta);
  const nombreMed = (id: string) => e.tratamientos.find((t) => t.id === id)?.nombre ?? "Medicamento";
  const meds = new Map<string, number>();
  for (const x of enRango.filter((x) => x.tipo === "medicamento")) {
    const n = nombreMed(String((x.payload as { medication_id?: string }).medication_id));
    meds.set(n, (meds.get(n) ?? 0) + 1);
  }
  const opts = { tz: h.tz, unidadVolumen: h.unidadVolumen, ahora: e.ahora, nombreMedicamento: nombreMed };
  const sintomas = enRango.filter((x) => x.tipo === "temperatura" || x.tipo === "sintoma").sort((a, b) => ms(a.started_at) - ms(b.started_at))
    .map((x) => ({ cuando: `${fFecha(ms(x.started_at), h.tz)}, ${fHora(ms(x.started_at), h.tz)}`, que: x.tipo === "temperatura" ? `Temperatura ${fTemperatura(Number((x.payload as { valor_c: number }).valor_c))}` : describir(x, opts).detalle, notas: x.notas }));
  const pendientes = e.dudas.filter((q) => !q.resuelta_en_visita_id).map((q) => q.texto);
  const activos = e.tratamientos.filter((t) => t.activo).map((t) => ({ nombre: t.nombre, indicacion: t.indicacion_textual }));
  const r = {
    periodo: { desde: fFecha(e.desde, h.tz), hasta: fFecha(e.hasta - 1, h.tz), diasConRegistros: st.dias, desdeUltimaVisita: e.ultimaVisita ? `${e.ultimaVisita.motivo ?? "Consulta"} (${fFecha(ms(e.ultimaVisita.fecha), h.tz)})` : null },
    crecimiento,
    sueno: st.dias ? { totalPromedio: fDuracion(st.suenoMin), noche: fDuracion(st.nocheMin), siestas: `${Math.round(st.siestas * 10) / 10} al día · ${fDuracion(st.siestasMin)}`, despertares: Math.round(st.despertaresNoche * 10) / 10 } : null,
    tomas: st.dias ? { porDia: Math.round(st.tomas * 10) / 10, pecho: `${Math.round(st.pecho * 10) / 10} al día · ${Math.round(st.pechoMin)} min`, biberon: `${Math.round(st.biberon * 10) / 10} al día · ${fVolumen(st.biberonMl, h.unidadVolumen)} promedio`, solidos: Math.round(st.solidos * 10) / 10 } : null,
    panales: st.dias ? { mojados: Math.round(st.mojados * 10) / 10, sucios: Math.round(st.sucios * 10) / 10 } : null,
    medicamentos: { activos, administrados: [...meds].map(([nombre, veces]) => ({ nombre, veces })) },
    sintomas,
    dudas: pendientes,
  };
  const lineas = [
    `Resumen de ${bebe.nombre} del ${r.periodo.desde.toLowerCase()} al ${r.periodo.hasta.toLowerCase()}${r.periodo.desdeUltimaVisita ? `, desde ${r.periodo.desdeUltimaVisita}` : ""}.`,
    crecimiento.length ? `Crecimiento: ${crecimiento.slice(-3).map((c) => `${c.fecha}: ${[c.peso, c.longitud, c.perimetro].filter(Boolean).join("; ")}`).join(" | ")}.` : "Sin medidas registradas.",
    r.sueno ? `Sueño promedio: ${r.sueno.totalPromedio} (noche ${r.sueno.noche}; siestas ${r.sueno.siestas}).` : "Faltan registros de sueño en el período.",
    r.tomas ? `Tomas: ${r.tomas.porDia} al día (pecho ${r.tomas.pecho}; biberón ${r.tomas.biberon}).` : "",
    r.panales ? `Pañales: ${r.panales.mojados} mojados y ${r.panales.sucios} sucios al día.` : "",
    r.medicamentos.administrados.length ? `Medicamentos administrados: ${r.medicamentos.administrados.map((m) => `${m.nombre} (${m.veces})`).join(", ")}.` : "Sin medicamentos registrados en el período.",
    sintomas.length ? `Síntomas y temperaturas: ${sintomas.map((s) => `${s.cuando}: ${s.que}`).join("; ")}.` : "Sin síntomas ni temperaturas registradas.",
    pendientes.length ? `Dudas pendientes: ${pendientes.join(" / ")}` : "Sin dudas pendientes.",
    "Son registros de la familia y promedios por día; no es un diagnóstico.",
  ].filter(Boolean);
  return { ...r, texto: lineas.join("\n") };
}
export type ResumenPediatra = ReturnType<typeof resumenPediatra>;
