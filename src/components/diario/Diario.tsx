"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryIcon, DayStrip, Icon, LogCard, type Category } from "@/components/tz";
import { Hojas, type HojaAbierta } from "@/components/hoy/Hojas";
import { useAviso } from "@/components/hoy/Aviso";
import { eliminarEvento, restaurarEvento } from "@/lib/acciones/eventos";
import { describir, ms, TIPOS_TOMA, type Evento } from "@/lib/core/eventos";
import { edadMeses, esNoche, referenciaSueno, segmentosDelDia, suenoDelDia } from "@/lib/core/sueno";
import { DIAS_CORTOS, fDuracion, fechaISO, fFecha, fHora, partes, sumarDias } from "@/lib/core/tiempo";
import type { Ajustes } from "@/lib/datos/hoy";
import type { Bebe } from "@/components/hoy/Hoy";

const PX = 32; // px por hora
const y = (min: number) => `${(min / 60) * PX}px`;
const ETIQUETA: Record<number, string> = { 0: "12 a.m.", 3: "3 a.m.", 6: "6 a.m.", 9: "9 a.m.", 12: "12 p.m.", 15: "3 p.m.", 18: "6 p.m.", 21: "9 p.m.", 24: "12 a.m." };
const CAT: Record<string, Category> = { sleep: "sleep", feed: "feed", diaper: "diaper", meds: "meds" };

export function Diario({ dia, lunes, ahora, eventos, ajustes: a, nombres, tratamientos, bebe }: { dia: number; lunes: number; ahora: number; eventos: Evento[]; ajustes: Ajustes; nombres: Record<string, string>; tratamientos: { id: string; nombre: string; indicacion: string }[]; bebe: Bebe }) {
  const router = useRouter();
  const { avisar } = useAviso();
  const [hoja, setHoja] = useState<HojaAbierta | null>(null);
  const tz = a.tz;
  const D2 = sumarDias(dia, 1, tz);
  const hoy = fechaISO(ahora, tz) === fechaISO(dia, tz);
  const opts = { tz, unidadVolumen: a.unidadVolumen, ahora, esNoche: esNoche(a), nombreMedicamento: (id: string) => tratamientos.find((t) => t.id === id)?.nombre };
  const delDia = eventos.filter((e) => ms(e.started_at) >= dia && ms(e.started_at) < D2).sort((x, z) => ms(x.started_at) - ms(z.started_at));
  const puntuales = delDia.filter((e) => e.tipo !== "sueno");
  const bloques = segmentosDelDia(eventos, dia, ahora, a);
  const sd = suenoDelDia(eventos, dia, ahora, a);
  const tomas = puntuales.filter((e) => TIPOS_TOMA.includes(e.tipo)).length;
  const panales = puntuales.filter((e) => e.tipo === "panal").length;
  // Agrupar eventos cercanos (menos de 45 min) para que no se encimen en la línea.
  const grupos: { inicio: number; items: Evento[] }[] = [];
  for (const e of puntuales) {
    const g = grupos.at(-1);
    if (g && ms(e.started_at) - g.inicio < 45 * 60_000) g.items.push(e);
    else grupos.push({ inicio: ms(e.started_at), items: [e] });
  }
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = sumarDias(lunes, i, tz), d2 = sumarDias(d, 1, tz);
    const de = eventos.filter((e) => ms(e.started_at) >= d && ms(e.started_at) < d2);
    const marcas: Category[] = [];
    if (de.some((e) => e.tipo === "sueno")) marcas.push("sleep");
    if (de.some((e) => TIPOS_TOMA.includes(e.tipo))) marcas.push("feed");
    if (de.some((e) => e.tipo === "panal")) marcas.push("diaper");
    return { weekday: DIAS_CORTOS[partes(d, tz).diaSemana], date: String(partes(d, tz).dia), marks: marcas, today: fechaISO(d, tz) === fechaISO(ahora, tz), ariaLabel: fFecha(d, tz), d };
  });
  const ir = (d: number) => router.push(fechaISO(d, tz) === fechaISO(ahora, tz) ? "/diario" : `/diario?dia=${fechaISO(d, tz)}`);
  const lineaAhora = hoy ? (ahora - dia) / 60_000 : null;
  const ref = referenciaSueno(edadMeses(bebe.fecha_nacimiento, dia, bebe.semanas_gestacion));

  const eliminar = async (ev: Evento) => {
    const r = await eliminarEvento(ev.id);
    if (!r.ok) return avisar(r.error);
    avisar("Eliminé el registro", async () => { const u = await restaurarEvento(ev.id); if (!u.ok) avisar(u.error); router.refresh(); });
    router.refresh();
  };

  return (
    <main className="tz-main">
      <div className="tz-top">
        <div className="tz-stack" style={{ gap: 0 }}><h1 className="text-title-lg">Diario</h1><p className="text-body-sm tz-muted">{fFecha(dia, tz)}</p></div>
        <div className="tz-top-actions">
          <button className="tz-iconbtn" type="button" aria-label="Día anterior" onClick={() => ir(sumarDias(dia, -1, tz))}><Icon name="chevron-left" /></button>
          <button className="tz-iconbtn" type="button" aria-label="Día siguiente" disabled={hoy} style={{ opacity: hoy ? 0.45 : 1 }} onClick={() => !hoy && ir(sumarDias(dia, 1, tz))}><Icon name="chevron-right" /></button>
        </div>
      </div>
      <DayStrip days={dias} selected={dias.findIndex((d) => fechaISO(d.d, tz) === fechaISO(dia, tz))} label="Semana" onSelect={(i) => { if (dias[i].d <= ahora) ir(dias[i].d); }} />
      <div className="tz-cols">
        <section className="tz-stack s16" aria-label="Línea de tiempo de 24 horas">
          <div className="tz-h wrap s8">
            <span className="tz-tag sleep"><Icon name="moon" size={14} />Sueño {fDuracion(sd.totalMin)}</span>
            <span className="tz-tag">{tomas} {tomas === 1 ? "toma" : "tomas"}</span>
            <span className="tz-tag">{panales} {panales === 1 ? "pañal" : "pañales"}</span>
          </div>
          <div className="tz-legend"><span><i className="tz-sw n" />Noche</span><span><i className="tz-sw d" style={{ background: "repeating-linear-gradient(135deg, var(--cat-sleep-soft) 0 6px, transparent 6px 10px)" }} />Siesta</span></div>
          <div className="tz-tl" style={{ height: 24 * PX + 8 }}>
            {Array.from({ length: 25 }, (_, i) => <div key={`h${i}`} className="tz-tl-hour" style={{ top: y(i * 60) }}><span>{ETIQUETA[i] ?? ""}</span></div>)}
            {bloques.map((b) => {
              const e = eventos.find((x) => x.id === b.id)!;
              return <button key={b.id} type="button" className={`tz-tl-sleep${b.noche ? "" : " nap"}`} aria-label={`${b.noche ? "Noche" : "Siesta"} de ${fDuracion(b.minutos)}`} style={{ top: y(b.desdeMin), height: y(Math.max(b.minutos, 12)), cursor: "pointer", padding: 0 }} onClick={() => setHoja({ tipo: "detalle", evento: e })} />;
            })}
            {lineaAhora != null ? <div aria-hidden style={{ position: "absolute", left: 56, right: 0, top: y(lineaAhora), borderTop: "2px solid var(--primary)" }} /> : null}
            {grupos.map((g) => {
              const d0 = describir(g.items[0], opts);
              return (
                <button key={g.items[0].id} type="button" className="tz-tl-ev" style={{ top: y((g.inicio - dia) / 60_000), background: "none", border: 0, cursor: "pointer", textAlign: "left", padding: 0 }} onClick={() => setHoja({ tipo: "detalle", evento: g.items[0] })}>
                  <span className="t">{fHora(g.inicio, tz)}</span>
                  {CAT[d0.cat] ? <CategoryIcon category={CAT[d0.cat]} size="sm" /> : <span className="tz-icchip sm" aria-hidden>{d0.cat === "temp" ? "🌡" : "✎"}</span>}
                  <span className="text-body-sm" style={{ color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.items.map((e) => describir(e, opts).titulo).join(" · ")}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="tz-stack" aria-label="Todos los registros del día">
          <h2 className="text-title">Registros del día</h2>
          {delDia.length ? (
            <div className="tz-list tz-glass">
              {[...delDia].reverse().map((e) => {
                const d = describir(e, opts);
                const detalle = d.detalle + (e.source === "mcp" ? ` · ${nombres[e.logged_by ?? ""] ?? ""} desde Claude` : "");
                return CAT[d.cat]
                  ? <LogCard key={e.id} category={CAT[d.cat]} title={d.titulo} detail={detalle} time={fHora(ms(e.started_at), tz)} running={d.enCurso} onClick={() => setHoja({ tipo: "detalle", evento: e })} />
                  : <button key={e.id} type="button" className="tz-logcard tz-glass is-action" onClick={() => setHoja({ tipo: "detalle", evento: e })}><span className="tz-icchip" aria-hidden>{d.cat === "temp" ? "🌡" : "✎"}</span><span className="tz-logcard-main"><span className="text-body-strong tz-ink">{d.titulo}</span><span className="text-body-sm tz-muted">{detalle}</span></span><span className="tz-logcard-meta"><span className="text-body-strong tz-ink tz-num">{fHora(ms(e.started_at), tz)}</span></span></button>;
              })}
            </div>
          ) : <p className="text-body tz-muted">No hay registros este día.</p>}
          <p className="text-body-sm tz-muted">{ref.texto} de sueño en 24 h.</p>
          <Link className="tz-link" href="/mas/patrones">Ver patrones de la semana</Link>
        </section>
      </div>
      <Hojas hoja={hoja} cerrar={() => setHoja(null)} registrar={async () => null} eliminar={eliminar} alCorregir={() => router.refresh()} ajustes={a} ahora={ahora} eventos={eventos} bebe={bebe} tratamientos={tratamientos} limitado={false} nombres={nombres} />
    </main>
  );
}
