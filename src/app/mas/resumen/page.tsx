import Link from "next/link";
import type { Metadata } from "next";
import { CategoryIcon, Icon, StatCard } from "@/components/tz";
import { Pantalla } from "@/components/hoy/Pantalla";
import { ahoraMs, eventosRango, paginaConBebe } from "@/lib/datos/hoy";
import { edadMeses, estadisticasPeriodo, referenciaSueno } from "@/lib/core/sueno";
import { fDuracion, fFecha, inicioDia, sumarDias } from "@/lib/core/tiempo";
import { fVolumen } from "@/lib/core/unidades";

export const metadata: Metadata = { title: "Resumen · Tereza" };
export const dynamic = "force-dynamic";

const n1 = (v: number) => (Math.round(v * 10) / 10).toString();

export default async function Resumen({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const p = (await searchParams).p === "hoy" ? "hoy" : (await searchParams).p === "30" ? "30" : "7";
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const tz = a.tz, ahora = ahoraMs(), hoy = inicioDia(ahora, tz);
  const desde = p === "hoy" ? hoy : sumarDias(hoy, -Number(p), tz);
  const hasta = p === "hoy" ? sumarDias(hoy, 1, tz) : hoy;
  const st = estadisticasPeriodo(await eventosRango(bebe.id, desde, hasta), desde, hasta, ahora, a);
  const ref = referenciaSueno(edadMeses(bebe.fecha_nacimiento, ahora, bebe.semanas_gestacion));
  const enRef = p !== "hoy" && st.dias > 0 && st.suenoMin / 60 >= ref.minH && st.suenoMin / 60 <= ref.maxH;
  const al = p === "hoy" ? "" : " al día";
  const fila = (l: string, v: string) => <div className="tz-row"><span className="grow"><span className="text-body">{l}</span></span><span className="text-body-strong tz-num">{v}</span></div>;
  const tab = (k: string, l: string) => <Link key={k} href={k === "7" ? "/mas/resumen" : `/mas/resumen?p=${k}`} className={p === k ? "on" : ""} aria-current={p === k ? "page" : undefined} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 999, textDecoration: "none", font: "700 15px/20px var(--font-sans)", color: p === k ? "var(--ink)" : "var(--ink-muted)", background: p === k ? "var(--surface)" : "transparent" }}>{l}</Link>;
  return (
    <Pantalla ajustes={a} activa="mas" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <div className="tz-pagehead">
          <Link className="tz-back" href="/mas"><Icon name="chevron-left" />Más</Link>
          <h1 className="text-title-lg">Resumen</h1>
          <p className="text-body-sm tz-muted">{p === "hoy" ? "Hoy hasta ahora" : `Promedios del ${fFecha(desde, tz).toLowerCase()} al ${fFecha(sumarDias(hasta, -1, tz), tz).toLowerCase()}`}</p>
        </div>
        <nav className="tz-seg" aria-label="Período" style={{ maxWidth: 420 }}>{tab("hoy", "Hoy")}{tab("7", "7 días")}{tab("30", "30 días")}</nav>
        {st.dias === 0 ? <p className="text-body tz-muted">Faltan registros en este período para resumir.</p> : (
          <div className="tz-cols even">
            <section className="tz-stack" aria-label="Sueño">
              <StatCard label={p === "hoy" ? "Sueño hoy" : "Sueño en 24 h"} value={fDuracion(st.suenoMin)} category="sleep" caption={ref.texto} badge={enRef ? "En la referencia" : null} />
              <div className="tz-list tz-glass">{fila("Noche", fDuracion(st.nocheMin))}{fila("Siestas", `${n1(st.siestas)}${al} · ${fDuracion(st.siestasMin)}`)}{fila("Despertares de noche", `${n1(st.despertaresNoche)}${p === "hoy" ? "" : " por noche"}`)}</div>
            </section>
            <div className="tz-stack s24">
              <section className="tz-stack" aria-label="Tomas">
                <div className="tz-sec"><h2 className="text-title tz-h s8"><CategoryIcon category="feed" size="sm" />Tomas</h2><span className="text-body-strong tz-num">{n1(st.tomas)}{al}</span></div>
                <div className="tz-list tz-glass">
                  {fila("Pecho", `${n1(st.pecho)}${al} · ${Math.round(st.pechoMin)} min (izq. ${Math.round(st.pechoIzqMin)} · der. ${Math.round(st.pechoDerMin)})`)}
                  {fila("Biberón", `${n1(st.biberon)}${al} · ${fVolumen(st.biberonMl, a.unidadVolumen)}`)}
                  {st.solidos ? fila("Sólidos", `${n1(st.solidos)}${al}`) : null}
                </div>
              </section>
              <section className="tz-stack" aria-label="Pañales">
                <div className="tz-sec"><h2 className="text-title tz-h s8"><CategoryIcon category="diaper" size="sm" />Pañales</h2><span className="text-body-strong tz-num">{n1(st.mojados + st.sucios)}{al}</span></div>
                <div className="tz-list tz-glass">{fila("Mojados", `${n1(st.mojados)}${al}`)}{fila("Sucios", `${n1(st.sucios)}${al}`)}</div>
              </section>
            </div>
          </div>
        )}
        <p className="text-body-sm tz-muted">Promedios de los días con registros. Es una referencia por edad, no un diagnóstico.</p>
      </main>
    </Pantalla>
  );
}
