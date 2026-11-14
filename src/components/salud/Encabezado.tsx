import Link from "next/link";
import { Icon } from "@/components/tz";

export function Encabezado({ titulo, sub, volver = "/salud-bebe", volverTexto = "Salud" }: { titulo: string; sub?: string; volver?: string; volverTexto?: string }) {
  return (
    <div className="tz-pagehead">
      <Link className="tz-back" href={volver}><Icon name="chevron-left" />{volverTexto}</Link>
      <h1 className="text-title-lg">{titulo}</h1>
      {sub ? <p className="text-body-sm tz-muted">{sub}</p> : null}
    </div>
  );
}
