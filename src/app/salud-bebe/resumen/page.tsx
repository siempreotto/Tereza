import type { Metadata } from "next";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Encabezado } from "@/components/salud/Encabezado";
import { Copiar } from "@/components/salud/Copiar";
import { ahoraMs, eventosRango, paginaConBebe } from "@/lib/datos/hoy";
import { datosSalud } from "@/lib/datos/salud";
import { resumenPediatra } from "@/lib/core/resumenPediatra";
import { desdeLocal, fechaISO, inicioDia, sumarDias } from "@/lib/core/tiempo";
import { edadTexto } from "@/lib/core/edad";

export const metadata: Metadata = { title: "Resumen para el pediatra · Tereza", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Pagina({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  const { desde: desdeParam } = await searchParams;
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const d = await datosSalud(bebe.id);
  const ahora = ahoraMs(), tz = a.tz;
  const ultima = d.visitas[0] ?? null;
  let desde = ultima ? inicioDia(new Date(ultima.fecha).getTime(), tz) : sumarDias(inicioDia(ahora, tz), -30, tz);
  if (desdeParam && /^\d{4}-\d{2}-\d{2}$/.test(desdeParam)) { const [y, m, dd] = desdeParam.split("-").map(Number); desde = desdeLocal(tz, y, m, dd); }
  const hasta = sumarDias(inicioDia(ahora, tz), 1, tz);
  const eventos = await eventosRango(bebe.id, desde, hasta);
  const r = resumenPediatra({ bebe, hogar: a, desde, hasta, ahora, eventos, medidas: d.medidas, tratamientos: d.tratamientos, dudas: d.dudas, ultimaVisita: desdeParam ? null : ultima });
  const dl = (pares: [string, string | number | null | undefined][]) => <dl className="tz-dl">{pares.filter(([, v]) => v != null && v !== "").map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Encabezado titulo="Resumen para el pediatra" sub={`${bebe.nombre} · ${edadTexto(bebe.fecha_nacimiento, new Date(ahora), bebe.semanas_gestacion)} · del ${r.periodo.desde.toLowerCase()} al ${r.periodo.hasta.toLowerCase()}`} />
        <form className="tz-h s8 wrap" method="get" aria-label="Elegir desde cuándo">
          <label className="tz-lbl" htmlFor="r-d">Desde</label>
          <input id="r-d" name="desde" type="date" className="tz-input" style={{ maxWidth: 200 }} defaultValue={fechaISO(desde, tz)} max={fechaISO(ahora, tz)} />
          <button className="tz-btn tz-btn-glass text-button" type="submit">Actualizar</button>
          <Copiar texto={r.texto} />
        </form>
        <article className="tz-doc">
          {r.periodo.desdeUltimaVisita ? <p className="text-body-sm tz-muted">Desde la última visita: {r.periodo.desdeUltimaVisita}. Días con registros: {r.periodo.diasConRegistros}.</p> : null}
          <section><h3>Crecimiento</h3>{r.crecimiento.length ? <table className="tz-table"><thead><tr><th>Fecha</th><th>Peso</th><th>Longitud</th><th>Cabeza</th></tr></thead><tbody>{r.crecimiento.map((m, i) => <tr key={i}><td>{m.fecha}</td><td>{m.peso ?? "—"}</td><td>{m.longitud ?? "—"}</td><td>{m.perimetro ?? "—"}</td></tr>)}</tbody></table> : <p className="text-body tz-muted">Sin medidas.</p>}</section>
          <section><h3>Sueño (promedio por día)</h3>{r.sueno ? dl([["Total en 24 h", r.sueno.totalPromedio], ["Noche", r.sueno.noche], ["Siestas", r.sueno.siestas], ["Despertares por noche", r.sueno.despertares]]) : <p className="text-body tz-muted">Faltan registros.</p>}</section>
          <section><h3>Tomas y pañales (promedio por día)</h3>{r.tomas ? dl([["Tomas", r.tomas.porDia], ["Pecho", r.tomas.pecho], ["Biberón", r.tomas.biberon], ["Sólidos", r.tomas.solidos || null], ["Pañales mojados", r.panales?.mojados], ["Pañales sucios", r.panales?.sucios]]) : <p className="text-body tz-muted">Faltan registros.</p>}</section>
          <section><h3>Medicamentos</h3>
            {r.medicamentos.activos.length ? dl(r.medicamentos.activos.map((t) => [t.nombre, `«${t.indicacion}»`])) : <p className="text-body tz-muted">Sin tratamientos activos.</p>}
            {r.medicamentos.administrados.length ? <p className="text-body-sm">Administrados en el período: {r.medicamentos.administrados.map((m) => `${m.nombre} (${m.veces} ${m.veces === 1 ? "vez" : "veces"})`).join(", ")}.</p> : null}
          </section>
          <section><h3>Síntomas y temperaturas</h3>{r.sintomas.length ? <ul className="text-body" style={{ margin: 0, paddingLeft: 20 }}>{r.sintomas.map((s, i) => <li key={i}>{s.cuando}: {s.que}{s.notas ? ` (${s.notas})` : ""}</li>)}</ul> : <p className="text-body tz-muted">Sin registros.</p>}</section>
          <section><h3>Dudas para la consulta</h3>{r.dudas.length ? <ol className="text-body" style={{ margin: 0, paddingLeft: 20 }}>{r.dudas.map((q, i) => <li key={i}>{q}</li>)}</ol> : <p className="text-body tz-muted">Sin dudas pendientes.</p>}</section>
          <p className="text-body-sm tz-muted">Registros de la familia y promedios por día. Referencia, no diagnóstico.</p>
        </article>
      </main>
    </Pantalla>
  );
}
