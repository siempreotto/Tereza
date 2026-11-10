import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { contexto } from "@/lib/auth/session";
import { destinoSeguro } from "@/lib/auth/next";
import { EntrarForm } from "./EntrarForm";

export const metadata: Metadata = { title: "Entrar · Tereza" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = destinoSeguro(sp.next);
  if (await contexto()) redirect(next);
  return (
    <div className="tz-screen" data-theme="light">
      <div className="tz-app solo">
        <main className="tz-main solo" style={{ gap: 20, minHeight: "100dvh" }}>
          <EntrarForm next={next} errorEnlace={sp.error === "enlace"} />
        </main>
      </div>
    </div>
  );
}
