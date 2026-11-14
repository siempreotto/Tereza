import Link from "next/link";
import { requiereHogar } from "@/lib/auth/session";
import { ajustesDelHogar } from "@/lib/datos/hoy";
import { Pantalla } from "@/components/hoy/Pantalla";
import { EliminarCuenta } from "./EliminarCuenta";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Datos() {
  const c = await requiereHogar();
  const a = await ajustesDelHogar(c.hogar.id);
  const bebe = c.bebes[0];
  if (!bebe) redirect("/");
  return (
    <Pantalla ajustes={a} activa="mas" rol={c.miembro.rol} bebe={bebe} yo={c.miembro.nombre}>
      <main className="tz-main">
        <Link href="/mas" className="text-body-sm tz-muted">‹ Más</Link>
        <h1 className="text-title-lg">Tus datos</h1>
        <section className="tz-card tz-glass tz-stack" style={{ gap: 10 }} aria-labelledby="d-exp">
          <h2 id="d-exp" className="text-title-sm">Exportar</h2>
          <p className="text-body">Descarga los registros que puedes ver. El CSV abre en Excel o Google Sheets; el JSON trae todo, incluida la salud.</p>
          <div className="tz-h s8 wrap">
            <a className="tz-btn tz-btn-glass text-button" href="/api/exportar?formato=csv" download>Descargar CSV</a>
            <a className="tz-btn tz-btn-glass text-button" href="/api/exportar?formato=json" download>Descargar JSON</a>
          </div>
        </section>
        <section className="tz-card tz-glass tz-stack" style={{ gap: 10 }} aria-labelledby="d-del">
          <h2 id="d-del" className="text-title-sm">Eliminar tu cuenta</h2>
          <p className="text-body">Se borra tu cuenta para siempre. Si eres la única persona del hogar, también se borran el hogar, los bebés, los registros, la salud y los adjuntos. Si compartes el hogar, tus registros se quedan para la familia.</p>
          <p className="text-body-sm tz-muted">Antes de hacerlo, descarga tus datos.</p>
          <EliminarCuenta />
        </section>
      </main>
    </Pantalla>
  );
}
