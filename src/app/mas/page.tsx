import Link from "next/link";
import { requiereHogar } from "@/lib/auth/session";
import { ajustesDelHogar } from "@/lib/datos/hoy";
import { Tema } from "@/components/hoy/Tema";
import { Barra } from "@/components/hoy/Barra";
import { Icon } from "@/components/tz";

export const dynamic = "force-dynamic";

export default async function Mas() {
  const c = await requiereHogar();
  const a = await ajustesDelHogar(c.hogar.id);
  const b = c.bebes[0];
  const admin = c.miembro.rol === "admin";
  return (
    <Tema modo={a.nocheUiModo} desde={a.nocheUiDesde} hasta={a.nocheUiHasta} tz={a.tz}>
      <div className="tz-app">
        {b ? <Barra activa="mas" rol={c.miembro.rol} bebe={b} yo={c.miembro.nombre} /> : null}
        <main className="tz-main">
          <h1 className="text-title-lg">Más</h1>
          <nav className="tz-list tz-glass" aria-label="Opciones">
            {admin ? <Link className="tz-row" href="/mas/cuidadores"><span className="grow"><span className="text-body-strong">Cuidadores y roles</span><span className="text-body-sm tz-muted">Invita a quien cuida y elige qué ve</span></span><Icon name="chevron-right" /></Link> : null}
            <Link className="tz-row" href="/salud"><span className="grow"><span className="text-body-strong">Estado técnico</span><span className="text-body-sm tz-muted">Versión y conexión</span></span><Icon name="chevron-right" /></Link>
          </nav>
          <p className="text-body-sm tz-muted">Patrones, resumen, ajustes de unidades y la conexión con Claude llegan en los próximos hitos.</p>
          <form action="/salir" method="post"><button className="tz-btn tz-btn-ghost text-button" type="submit">Salir</button></form>
        </main>
      </div>
    </Tema>
  );
}
