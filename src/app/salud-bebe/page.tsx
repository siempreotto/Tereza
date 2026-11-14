import { requiereHogar } from "@/lib/auth/session";
import { ajustesDelHogar } from "@/lib/datos/hoy";
import { Tema } from "@/components/hoy/Tema";
import { Barra } from "@/components/hoy/Barra";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const c = await requiereHogar();
  if (c.miembro.rol === "limitado") redirect("/");
  const a = await ajustesDelHogar(c.hogar.id);
  const b = c.bebes[0];
  return (
    <Tema modo={a.nocheUiModo} desde={a.nocheUiDesde} hasta={a.nocheUiHasta} tz={a.tz}>
      <div className="tz-app">
        {b ? <Barra activa="salud" rol={c.miembro.rol} bebe={b} yo={c.miembro.nombre} /> : null}
        <main className="tz-main"><h1 className="text-title-lg">Salud</h1><p className="text-body tz-muted">Crecimiento, medicamentos y pediatra llegan en el Hito 5.</p></main>
      </div>
    </Tema>
  );
}
