import type { ReactNode } from "react";
import { Tema } from "./Tema";
import { Avisos } from "./Aviso";
import { Barra } from "./Barra";
import type { Ajustes } from "@/lib/datos/hoy";

/** Marco común: tema (día/noche), avisos con deshacer y barra de navegación. */
export function Pantalla({ ajustes, activa, rol, bebe, yo, children }: { ajustes: Ajustes; activa: string; rol: "admin" | "cuidador" | "limitado"; bebe: { nombre: string; fecha_nacimiento: string; semanas_gestacion: number | null }; yo: string; children: ReactNode }) {
  return (
    <Tema modo={ajustes.nocheUiModo} desde={ajustes.nocheUiDesde} hasta={ajustes.nocheUiHasta} tz={ajustes.tz}>
      <Avisos>
        <div className="tz-app">
          <Barra activa={activa} rol={rol} bebe={bebe} yo={yo} />
          {children}
        </div>
      </Avisos>
    </Tema>
  );
}
