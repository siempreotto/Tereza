import type { Metadata } from "next";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Encabezado } from "@/components/salud/Encabezado";
import { Pediatra } from "@/components/salud/Pediatra";
import { paginaConBebe } from "@/lib/datos/hoy";
import { datosSalud } from "@/lib/datos/salud";

export const metadata: Metadata = { title: "Pediatra · Tereza" };
export const dynamic = "force-dynamic";

export default async function Pagina() {
  const { c, bebe, ajustes: a } = await paginaConBebe({ soloSalud: true });
  const d = await datosSalud(bebe.id);
  return (
    <Pantalla ajustes={a} activa="salud" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Encabezado titulo="Pediatra y visitas" sub="Notas de cada consulta, vacunas, adjuntos y la próxima cita." />
        <Pediatra babyId={bebe.id} hogarId={c.hogar.id} visitas={d.visitas} cita={d.cita} dudas={d.dudas.filter((q) => !q.resuelta_en_visita_id)} tz={a.tz} />
      </main>
    </Pantalla>
  );
}
