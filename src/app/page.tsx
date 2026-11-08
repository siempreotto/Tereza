import { CategoryIcon, Icon } from "@/components/tz";
import { revisarSalud } from "@/lib/health";

export const dynamic = "force-dynamic";

// Hito 0: página de salud. Se reemplaza por «Hoy» en el Hito 3.
export default async function Home() {
  const salud = await revisarSalud();
  const conectado = salud.supabase === "conectado";
  return (
    <div className="tz-screen" data-theme="light">
      <main className="tz-main solo">
        <div className="tz-stack s24">
          <div className="tz-stack s8">
            <p className="tz-logo" style={{ padding: 0 }}>Tereza</p>
            <h1 className="text-title-lg">El día de tu bebé, registrado en un toque.</h1>
            <p className="text-body tz-muted">Estamos construyendo la app. Esta página muestra si la infraestructura responde.</p>
          </div>
          <section className="tz-list tz-glass" aria-label="Estado técnico">
            <div className="tz-row">
              <CategoryIcon category="doctor" />
              <span className="grow">
                <span className="text-body-strong">Supabase</span>
                <span className="text-body-sm tz-muted">Base de datos y acceso</span>
              </span>
              <span className={`tz-tag ${conectado ? "success" : "warning"}`}>
                {conectado ? <Icon name="check" size={14} /> : null}
                {salud.supabase === "conectado" ? "Conectado" : salud.supabase === "sin configurar" ? "Sin configurar" : "Sin respuesta"}
              </span>
            </div>
            <div className="tz-row">
              <CategoryIcon category="growth" />
              <span className="grow">
                <span className="text-body-strong">Versión</span>
                <span className="text-body-sm tz-muted">Entorno: {salud.entorno}</span>
              </span>
              <span className="text-body-strong tz-num">{salud.version}</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
