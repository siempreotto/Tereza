import type { Metadata } from "next";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Encabezado } from "@/components/salud/Encabezado";
import { Crecimiento } from "@/components/salud/Crecimiento";
import { paginaConBebe } from "@/lib/datos/hoy";
import { datosSalud } from "@/lib/datos/salud";

export const metadata: Metadata = { title: "Crecimiento · Tereza" };
export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const d = await datosSalud(bebe.id);
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Encabezado titulo="Crecimiento" sub={`Curvas de la OMS por edad${bebe.semanas_gestacion && bebe.semanas_gestacion < 37 ? " corregida" : ""}. Es una comparación, no un diagnóstico.`} />
        <Crecimiento bebe={bebe} medidas={d.medidas} unidades={{ peso: a.unidadPeso, longitud: a.unidadLongitud }} tz={a.tz} />
      </main>
    </Pantalla>
  );
}
