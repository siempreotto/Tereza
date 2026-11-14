import type { Metadata } from "next";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Encabezado } from "@/components/salud/Encabezado";
import { Medicamentos } from "@/components/salud/Medicamentos";
import { nombresMiembros, paginaConBebe } from "@/lib/datos/hoy";
import { administraciones, datosSalud } from "@/lib/datos/salud";

export const metadata: Metadata = { title: "Medicamentos · Tereza" };
export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const [d, adm, nombres] = await Promise.all([datosSalud(bebe.id), administraciones(bebe.id), nombresMiembros(c.hogar.id)]);
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Encabezado titulo="Medicamentos" sub="Tereza solo registra lo que se le dio. No calcula ni sugiere dosis, intervalos ni combinaciones." />
        <Medicamentos babyId={bebe.id} tratamientos={d.tratamientos} administraciones={adm} nombres={nombres} tz={a.tz} />
      </main>
    </Pantalla>
  );
}
