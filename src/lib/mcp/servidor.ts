import "server-only";
import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { crearContexto, ErrorMcp, type Ctx } from "./contexto";
import { fallo, type Respuesta } from "./util";
import { registrarHerramientasRegistro } from "./tools/registro";
import { registrarHerramientasConsulta } from "./tools/consultas";
import { registrarHerramientasSalud } from "./tools/salud";
import { registrarHerramientasConfig } from "./tools/config";

let origen = process.env.NEXT_PUBLIC_APP_URL ?? "";
export const fijarOrigen = (o: string) => { if (o) origen = o; };

/** Envuelve cada herramienta: contexto con el token del usuario (RLS) + auditoría sin argumentos ni datos de salud. */
function conCtx<A>(nombre: string, fn: (ctx: Ctx, args: A) => Promise<Respuesta>) {
  return async (args: A, extra: unknown): Promise<Respuesta> => {
    const auth = (extra as ServerContext).http?.authInfo;
    let ctx: Ctx | null = null;
    let resultado: "ok" | "error" | "denegado" = "ok";
    let codigo: string | null = null;
    try {
      ctx = await crearContexto(auth);
      const r = await fn(ctx, args);
      if (r.isError) { resultado = "error"; codigo = String((r.structuredContent as { codigo?: string })?.codigo ?? "ERROR"); }
      return r;
    } catch (e) {
      if (e instanceof ErrorMcp) {
        resultado = e.codigo === "PERMISO" || e.codigo === "REVOCADO" ? "denegado" : "error";
        codigo = e.codigo;
        return fallo(e.codigo, e.message);
      }
      resultado = "error"; codigo = "ERROR";
      console.error("[mcp] fallo inesperado en", nombre);
      return fallo("ERROR", "Algo falló de nuestro lado. Vuelve a intentarlo en un momento.");
    } finally {
      if (ctx && auth) {
        await ctx.db.from("mcp_audit").insert({ household_id: ctx.hogarId, user_id: ctx.userId, client_id: auth.clientId.slice(0, 200), herramienta: nombre, resultado, codigo_error: codigo }).then(() => undefined, () => undefined);
      }
    }
  };
}

export function registrarHerramientas(server: McpServer) {
  registrarHerramientasRegistro(server, conCtx);
  registrarHerramientasConsulta(server, conCtx);
  registrarHerramientasSalud(server, conCtx);
  registrarHerramientasConfig(server, conCtx, () => origen || "https://tereza.vercel.app");
}

export const INSTRUCCIONES = [
  "Tereza registra el día de un bebé (sueño, tomas, pañales, salud) para su familia.",
  "Usa estado_actual antes de responder «¿cómo va?». Para algo en curso usa iniciar_timer/terminar_timer; para algo que ya pasó, registrar_evento.",
  "Las horas se interpretan en la zona del hogar; si la herramienta avisa que interpretó una hora ambigua, cuéntaselo a la persona.",
  "Medicamentos: solo se registran. Nunca sugieras, calcules ni valides dosis, intervalos o combinaciones; remite al pediatra o farmacéutico y a la etiqueta.",
  "No presentes resúmenes ni estimaciones como diagnóstico. Si aparece una alarma, transmítela tal cual.",
].join(" ");
