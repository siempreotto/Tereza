import type { Metadata } from "next";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Encabezado } from "@/components/salud/Encabezado";
import { Dudas } from "@/components/salud/Dudas";
import { nombresMiembros, paginaConBebe } from "@/lib/datos/hoy";
import { datosSalud } from "@/lib/datos/salud";

export const metadata: Metadata = { title: "Dudas para la consulta · Tereza" };
export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const [d, nombres] = await Promise.all([datosSalud(bebe.id), nombresMiembros(c.hogar.id)]);
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Encabezado titulo="Dudas para la consulta" sub="Anótalas cuando surjan; aparecen en el resumen para el pediatra." />
        <Dudas babyId={bebe.id} dudas={d.dudas} visitas={d.visitas.map((v) => ({ id: v.id, motivo: v.motivo, fecha: v.fecha }))} nombres={nombres} tz={a.tz} />
      </main>
    </Pantalla>
  );
}
