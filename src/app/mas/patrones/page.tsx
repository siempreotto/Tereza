import Link from "next/link";
import type { Metadata } from "next";
import { StatCard, Icon } from "@/components/tz";
import { Pantalla } from "@/components/hoy/Pantalla";
import { ahoraMs, eventosRango, paginaConBebe } from "@/lib/datos/hoy";
import { edadMeses, estadisticasPeriodo, referenciaSueno, segmentosDelDia, suenoDelDia } from "@/lib/core/sueno";
import { DIAS, DIAS_CORTOS, fDuracion, fFecha, inicioDia, partes, sumarDias } from "@/lib/core/tiempo";

export const metadata: Metadata = { title: "Patrones de sueño · Tereza" };
export const dynamic = "force-dynamic";

const pct = (m: number) => `${((m / 1440) * 100).toFixed(2)}%`;

export default async function Patrones({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const w = Math.min(0, Math.max(-52, Number((await searchParams).w ?? 0) || 0));
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const tz = a.tz;
  const ahora = ahoraMs();
  const fin = sumarDias(inicioDia(ahora, tz), 1 + w * 7, tz), inicio = sumarDias(fin, -7, tz);
  const evs = await eventosRango(bebe.id, inicio, fin);
  const ref = referenciaSueno(edadMeses(bebe.fecha_nacimiento, ahora, bebe.semanas_gestacion));
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i, tz));
  const filas = dias.map((D) => ({ D, segs: segmentosDelDia(evs, D, ahora, a), h: suenoDelDia(evs, D, ahora, a).totalMin / 60, parcial: D === inicioDia(ahora, tz) }));
  const st = estadisticasPeriodo(evs, inicio, Math.min(fin, inicioDia(ahora, tz)), ahora, a);
  const enRef = st.dias > 0 && st.suenoMin / 60 >= ref.minH && st.suenoMin / 60 <= ref.maxH;
  const lo = 9, hi = 18, H = 168, yb = (v: number) => ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * H;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <Pantalla ajustes={a} activa="mas" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <div className="tz-pagehead">
          <Link className="tz-back" href="/mas"><Icon name="chevron-left" />Más</Link>
          <div className="tz-h between">
            <h1 className="text-title-lg">Patrones de sueño</h1>
            <div className="tz-h s8">
              <Link className="tz-iconbtn plain" aria-label="Semana anterior" href={`/mas/patrones?w=${w - 1}`}><Icon name="chevron-left" /></Link>
              {w < 0 ? <Link className="tz-iconbtn plain" aria-label="Semana siguiente" href={w + 1 === 0 ? "/mas/patrones" : `/mas/patrones?w=${w + 1}`}><Icon name="chevron-right" /></Link> : <span className="tz-iconbtn plain" aria-hidden style={{ opacity: 0.45 }}><Icon name="chevron-right" /></span>}
            </div>
          </div>
          <p className="text-body-sm tz-muted">{fFecha(inicio, tz)} al {fFecha(sumarDias(fin, -1, tz), tz).toLowerCase()}</p>
        </div>
        <div className="tz-grid2">
          <StatCard label="Promedio diario" value={st.dias ? fDuracion(st.suenoMin) : "—"} category="sleep" badge={enRef ? "En la referencia" : null} caption={enRef ? null : ref.texto} />
          <StatCard label="Siestas al día" value={st.dias ? (Math.round(st.siestas * 10) / 10).toString() : "—"} unit={st.dias ? `· ${fDuracion(st.siestasMin)}` : undefined} caption={st.dias ? `Noche: ${fDuracion(st.nocheMin)}` : "Faltan registros de esta semana"} />
        </div>
        <div className="tz-cols even">
          <section className="tz-card lg tz-glass tz-stack s16" aria-label="Bandas de sueño por día">
            <h2 className="text-title">Cuándo durmió</h2>
            <div className="tz-bands">
              {filas.map((f) => (
                <div key={f.D} className="tz-band-row">
                  <span className="text-label tz-muted">{cap(DIAS[partes(f.D, tz).diaSemana]).slice(0, 3)}</span>
                  <div className="tz-band" role="img" aria-label={`${fFecha(f.D, tz)}: ${fDuracion(f.h * 60)} de sueño`}>
                    {f.segs.map((g, i) => <i key={i} className={g.noche ? "n" : "d"} style={{ left: pct(g.desdeMin), width: pct(g.minutos) }} />)}
                  </div>
                </div>
              ))}
            </div>
            <div className="tz-axis"><span>12 a.m.</span><span>6 a.m.</span><span>12 p.m.</span><span>6 p.m.</span><span>12 a.m.</span></div>
            <div className="tz-legend"><span><i className="tz-sw n" />Noche</span><span><i className="tz-sw d" />Siesta</span></div>
          </section>
          <section className="tz-card lg tz-glass tz-stack s16" aria-label="Horas de sueño por día">
            <h2 className="text-title">Horas en 24 h</h2>
            <div style={{ position: "relative", height: H, marginTop: 20 }}>
              <div className="tz-chart-ref" style={{ bottom: yb(ref.minH), height: yb(ref.maxH) - yb(ref.minH) }} />
              <span className="text-caption tz-muted" style={{ position: "absolute", right: 0, bottom: yb(ref.maxH) + 2 }}>{ref.maxH} h</span>
              <span className="text-caption tz-muted" style={{ position: "absolute", right: 0, bottom: yb(ref.minH) - 18 }}>{ref.minH} h</span>
              <div style={{ position: "absolute", inset: "0 36px 0 0", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
                {filas.map((f) => (
                  <div key={f.D} style={{ position: "relative" }}>
                    {f.h > 0 ? <>
                      <span aria-hidden style={{ position: "absolute", left: "50%", bottom: yb(f.h), width: 14, height: 14, margin: "0 0 -7px -7px", borderRadius: 999, background: f.parcial ? "var(--surface)" : "var(--cat-sleep)", boxShadow: f.parcial ? "inset 0 0 0 2px var(--cat-sleep)" : "0 0 0 3px var(--surface)" }} />
                      <span className="text-label tz-num" style={{ position: "absolute", left: 0, right: 0, textAlign: "center", bottom: yb(f.h) + 12, color: "var(--ink)" }}>{(Math.round(f.h * 10) / 10).toString()}</span>
                    </> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="tz-chart-x" style={{ paddingRight: 36 }}>{filas.map((f) => <span key={f.D}>{DIAS_CORTOS[partes(f.D, tz).diaSemana]}</span>)}</div>
            <div className="tz-legend"><span><i className="tz-sw ref" />{ref.texto}</span>{w === 0 ? <span>Hoy aún no termina (punto hueco)</span> : null}</div>
          </section>
        </div>
      </main>
    </Pantalla>
  );
}
