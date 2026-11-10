import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { contexto } from "@/lib/auth/session";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Bienvenida · Tereza" };

export default async function Bienvenida() {
  const c = await contexto();
  if (!c) redirect("/entrar?next=/bienvenida");
  // Con hogar y bebé ya creados, el alta terminó (se puede volver a invitar desde Más › Cuidadores).
  const listo = Boolean(c.hogar && c.bebes.length);
  if (listo && c.miembro?.rol !== "admin") redirect("/");
  return (
    <div className="tz-screen" data-theme="light">
      <div className="tz-app solo">
        <main className="tz-main solo" style={{ gap: 20, minHeight: "100dvh" }}>
          <Onboarding pasoInicial={listo ? 3 : 1} />
        </main>
      </div>
    </div>
  );
}
