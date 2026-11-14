import { requiereHogar } from "@/lib/auth/session";
import { ajustesDelHogar, eventosRecientes, nombresMiembros, tratamientosActivos } from "@/lib/datos/hoy";
import { Hoy } from "@/components/hoy/Hoy";
import { Tema } from "@/components/hoy/Tema";
import { Avisos } from "@/components/hoy/Aviso";
import { Barra } from "@/components/hoy/Barra";
import type { HojaAbierta } from "@/components/hoy/Hojas";

export const dynamic = "force-dynamic";

const HOJAS = ["sueno", "toma", "panal", "medicamento", "temperatura", "nota"] as const;

export default async function Inicio({ searchParams }: { searchParams: Promise<{ registrar?: string }> }) {
  const { registrar } = await searchParams;
  const c = await requiereHogar();
  const bebe = c.bebes[0];
  const ajustes = await ajustesDelHogar(c.hogar.id);
  if (!bebe) {
    return (
      <Tema modo={ajustes.nocheUiModo} desde={ajustes.nocheUiDesde} hasta={ajustes.nocheUiHasta} tz={ajustes.tz}>
        <main className="tz-main solo"><p className="text-body">Aún no hay un bebé en este hogar. Pídele a quien administra que lo agregue.</p></main>
      </Tema>
    );
  }
  const [eventos, nombres, tratamientos] = await Promise.all([
    eventosRecientes(bebe.id, ajustes.tz),
    nombresMiembros(c.hogar.id),
    c.miembro.rol === "limitado" ? Promise.resolve([]) : tratamientosActivos(bebe.id),
  ]);
  return (
    <Tema modo={ajustes.nocheUiModo} desde={ajustes.nocheUiDesde} hasta={ajustes.nocheUiHasta} tz={ajustes.tz}>
      <Avisos alto>
        <div className="tz-app">
          <Barra activa="hoy" rol={c.miembro.rol} bebe={{ nombre: bebe.nombre, fecha_nacimiento: bebe.fecha_nacimiento, semanas_gestacion: bebe.semanas_gestacion }} yo={c.miembro.nombre} />
          <Hoy bebe={bebe} ajustes={ajustes} eventos={eventos} nombres={nombres} tratamientos={tratamientos} rol={c.miembro.rol} yo={{ id: c.userId, nombre: c.miembro.nombre }} hojaInicial={HOJAS.includes(registrar as (typeof HOJAS)[number]) ? ({ tipo: registrar } as HojaAbierta) : null} />
        </div>
      </Avisos>
    </Tema>
  );
}
