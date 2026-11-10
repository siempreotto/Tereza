import Link from "next/link";
import { CategoryIcon } from "@/components/tz";
import { requiereHogar } from "@/lib/auth/session";
import { edadTexto } from "@/lib/core/edad";

export const dynamic = "force-dynamic";

// Hito 2: portada provisional con el hogar y el bebé. «Hoy» (estado, timers y registro) llega en el Hito 3.
export default async function Inicio() {
  const c = await requiereHogar();
  const bebe = c.bebes[0];
  return (
    <div className="tz-screen" data-theme="light">
      <main className="tz-main">
        <div className="tz-top">
          {bebe ? (
            <span className="tz-baby">
              <span className="tz-avatar">{bebe.nombre.charAt(0)}</span>
              <span className="text-body-strong">{bebe.nombre}</span>
              <span className="text-body-sm tz-muted">{edadTexto(bebe.fecha_nacimiento, new Date(), bebe.semanas_gestacion)}</span>
            </span>
          ) : <span className="tz-logo">Tereza</span>}
        </div>
        <section className="tz-hero tz-glass" aria-label="Tu hogar">
          <div className="tz-hero-state">
            <span className="text-label tz-muted">{c.hogar.nombre}</span>
            <p className="text-title-lg">Hola, {c.miembro.nombre}</p>
            <p className="text-body tz-muted">Ya está listo tu hogar. El registro del día (sueño, tomas y pañales con un toque) llega en la próxima versión.</p>
          </div>
        </section>
        <nav className="tz-list tz-glass" aria-label="Opciones">
          {c.miembro.rol === "admin" ? (
            <Link className="tz-row" href="/mas/cuidadores">
              <CategoryIcon category="doctor" />
              <span className="grow"><span className="text-body-strong">Cuidadores y roles</span><span className="text-body-sm tz-muted">Invita a quien cuida y elige qué ve</span></span>
            </Link>
          ) : null}
          <Link className="tz-row" href="/salud">
            <CategoryIcon category="growth" />
            <span className="grow"><span className="text-body-strong">Estado técnico</span><span className="text-body-sm tz-muted">Versión y conexión</span></span>
          </Link>
        </nav>
        <form action="/salir" method="post">
          <button className="tz-btn tz-btn-ghost text-button" type="submit">Salir</button>
        </form>
      </main>
    </div>
  );
}
