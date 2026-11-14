// Señales de alarma. Umbrales PENDIENTES DE VALIDAR con un pediatra; van detrás de household_settings.alarmas_activas.
import { DIA, partes } from "./tiempo";
import { ms, type Evento } from "./eventos";

export type Alarma = { titulo: string; texto: string; accion: string };

export function alarmaTemperatura(valorC: number, edadMeses: number, evs: Evento[], ahora: number, excluirId?: string): Alarma | null {
  if (valorC < 38) return null;
  if (edadMeses < 3) return { titulo: "Fiebre en menor de 3 meses", texto: "Con 38 °C o más a esta edad, llama a tu pediatra o busca atención médica ahora.", accion: "Llamar al pediatra ahora" };
  const previas = evs.filter((e) => !e.eliminado_en && e.id !== excluirId && e.tipo === "temperatura" && Number((e.payload as { valor_c?: number })?.valor_c) >= 38 && ahora - ms(e.started_at) < DIA);
  if (previas.length) return { titulo: "Es otra temperatura alta en 24 horas", texto: "Si sigue alta, si la notas muy decaída o le cuesta respirar, llama a tu pediatra o busca atención médica.", accion: "Llamar al pediatra" };
  return { titulo: "Temperatura de 38 °C o más", texto: "Vuelve a tomarla más tarde. Si se mantiene, si la notas decaída o le cuesta respirar, llama a tu pediatra.", accion: "Volver a tomarla en un rato" };
}

/** Después de las 6 p.m. con menos de 4 pañales mojados en el día. */
export function alarmaPocosPanales(evs: Evento[], inicioHoy: number, ahora: number, tz: string): Alarma | null {
  if (partes(ahora, tz).hora < 18) return null;
  const mojados = evs.filter((e) => !e.eliminado_en && e.tipo === "panal" && (e.payload as { mojado?: boolean })?.mojado && ms(e.started_at) >= inicioHoy).length;
  if (mojados >= 4) return null;
  return { titulo: `Pocos pañales mojados hoy (${mojados})`, texto: "Si sigue así, si rechaza las tomas o la notas decaída, llama a tu pediatra.", accion: "Ofrecer una toma y revisar en un rato" };
}

export const AVISO_SINTOMAS = "Si le cuesta respirar, está muy somnolienta o no logras despertarla, busca atención médica de inmediato.";
