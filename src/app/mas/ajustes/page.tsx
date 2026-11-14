import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/tz";
import { Pantalla } from "@/components/hoy/Pantalla";
import { paginaConBebe } from "@/lib/datos/hoy";
import { edadMeses, referenciaDia } from "@/lib/core/sueno";
import { ahoraMs } from "@/lib/datos/hoy";
import { FormAjustes } from "./FormAjustes";

export const metadata: Metadata = { title: "Ajustes · Tereza" };
export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const { c, bebe, ajustes: a } = await paginaConBebe();
  const ref = referenciaDia(edadMeses(bebe.fecha_nacimiento, ahoraMs(), bebe.semanas_gestacion));
  return (
    <Pantalla ajustes={a} activa="mas" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <div className="tz-pagehead">
          <Link className="tz-back" href="/mas"><Icon name="chevron-left" />Más</Link>
          <h1 className="text-title-lg">Ajustes</h1>
          {c.miembro.rol !== "admin" ? <p className="text-body-sm tz-muted">Solo quien administra el hogar puede cambiarlos.</p> : null}
        </div>
        <FormAjustes ajustes={a} admin={c.miembro.rol === "admin"} nombre={bebe.nombre} referencia={ref ? { texto: ref.texto, siestas: ref.siestas, ventana: ref.ventanas[0] } : null} />
      </main>
    </Pantalla>
  );
}
