import type { Metadata } from "next";
import { ahoraMs, eventosRango, nombresMiembros, paginaConBebe, tratamientosActivos } from "@/lib/datos/hoy";
import { Pantalla } from "@/components/hoy/Pantalla";
import { Diario } from "@/components/diario/Diario";
import { desdeLocal, inicioDia, sumarDias } from "@/lib/core/tiempo";

export const metadata: Metadata = { title: "Diario · Tereza" };
export const dynamic = "force-dynamic";

export default async function PaginaDiario({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const { c, bebe, ajustes } = await paginaConBebe({ soloSalud: true });
  const tz = ajustes.tz;
  const ahora = ahoraMs();
  const hoy = inicioDia(ahora, tz);
  let D = hoy;
  if (dia && /^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    const [y, m, d] = dia.split("-").map(Number);
    D = Math.min(desdeLocal(tz, y, m, d), hoy);
  }
  // La semana visible (lunes a domingo) para la tira de días y sus marcas.
  const dow = (new Date(D).getUTCDay() + 6) % 7;
  const lunes = sumarDias(D, -dow, tz);
  const [eventos, nombres, tratamientos] = await Promise.all([
    eventosRango(bebe.id, lunes, sumarDias(lunes, 7, tz)),
    nombresMiembros(c.hogar.id),
    tratamientosActivos(bebe.id),
  ]);
  return (
    <Pantalla ajustes={ajustes} activa="diario" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <Diario dia={D} lunes={lunes} ahora={ahora} eventos={eventos} ajustes={ajustes} nombres={nombres} tratamientos={tratamientos} bebe={bebe} />
    </Pantalla>
  );
}
