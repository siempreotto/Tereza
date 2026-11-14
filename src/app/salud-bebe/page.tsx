import Link from "next/link";
import type { Metadata } from "next";
import { CategoryIcon, Icon } from "@/components/tz";
import { Pantalla } from "@/components/hoy/Pantalla";
import { ahoraMs, paginaConBebe } from "@/lib/datos/hoy";
import { datosSalud } from "@/lib/datos/salud";
import { edadDias, percentil, textoPercentil } from "@/lib/core/crecimiento";
import { fFecha, fHace, fHora } from "@/lib/core/tiempo";
import { fPeso, fPesoAlt } from "@/lib/core/unidades";

export const metadata: Metadata = { title: "Salud · Tereza" };
export const dynamic = "force-dynamic";

export default async function Salud() {
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const d = await datosSalud(bebe.id);
  const ahora = ahoraMs();
  const conPeso = d.medidas.filter((m) => m.peso_g).at(-1);
  const pct = conPeso ? textoPercentil(percentil("peso", bebe.sexo as "M" | "F", edadDias(bebe.fecha_nacimiento, new Date(conPeso.medido_en).getTime(), bebe.semanas_gestacion), conPeso.peso_g! / 1000)) : null;
  const activos = d.tratamientos.filter((t) => t.activo);
  const pendientes = d.dudas.filter((q) => !q.resuelta_en_visita_id);
  const fila = (href: string, cat: "growth" | "meds" | "doctor", titulo: string, detalle: string) => (
    <Link className="tz-row" href={href}><CategoryIcon category={cat} /><span className="grow"><span className="text-body-strong">{titulo}</span><span className="text-body-sm tz-muted">{detalle}</span></span><Icon name="chevron-right" className="chev" /></Link>
  );
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <div className="tz-pagehead"><h1 className="text-title-lg">Salud</h1><p className="text-body-sm tz-muted">Crecimiento, medicamentos y pediatra de {bebe.nombre}.</p></div>
        <div className="tz-cols">
          <div className="tz-stack s16">
            <section className="tz-hero tz-glass" aria-label="Último peso">
              <div className="tz-hero-state">
                <span className="tz-kicker text-label c-growth">Último peso</span>
                {conPeso ? <>
                  <p className="text-display tz-num">{fPeso(conPeso.peso_g!, a.unidadPeso)}</p>
                  <p className="text-body tz-muted">{fPesoAlt(conPeso.peso_g!, a.unidadPeso)} · {pct} · {fFecha(new Date(conPeso.medido_en).getTime(), a.tz)} ({conPeso.origen})</p>
                </> : <p className="text-body">Aún no hay medidas. Registra el peso de la próxima consulta o el de casa.</p>}
              </div>
            </section>
            {d.cita ? (
              <div className="tz-alert info" role="note"><div className="tz-stack s4"><p className="text-body-strong tz-alert-title">Próxima cita: {d.cita.titulo ?? "Consulta"}</p><p className="text-body-sm">{fFecha(new Date(d.cita.fecha).getTime(), a.tz)}, {fHora(new Date(d.cita.fecha).getTime(), a.tz)}{d.cita.pediatra ? ` · ${d.cita.pediatra}` : ""}</p></div></div>
            ) : null}
            <Link className="tz-btn tz-btn-primary tz-btn-lg tz-btn-block text-button" href="/salud-bebe/resumen">Resumen para el pediatra</Link>
          </div>
          <nav className="tz-list tz-glass" aria-label="Secciones de salud">
            {fila("/salud-bebe/crecimiento", "growth", "Crecimiento", `${d.medidas.length} ${d.medidas.length === 1 ? "medida" : "medidas"} · curvas de la OMS`)}
            {fila("/salud-bebe/medicamentos", "meds", "Medicamentos", activos.length ? `${activos.length} activo${activos.length === 1 ? "" : "s"}: ${activos.map((t) => t.nombre).join(", ")}` : "Sin tratamientos activos")}
            {fila("/salud-bebe/pediatra", "doctor", "Pediatra y visitas", d.visitas[0] ? `Última: ${d.visitas[0].motivo ?? "consulta"}, ${fHace(new Date(d.visitas[0].fecha).getTime(), ahora)}` : "Sin visitas registradas")}
            {fila("/salud-bebe/dudas", "doctor", "Dudas para la consulta", pendientes.length ? `${pendientes.length} pendiente${pendientes.length === 1 ? "" : "s"}` : "Sin dudas pendientes")}
          </nav>
        </div>
      </main>
    </Pantalla>
  );
}
