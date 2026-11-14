import { createMcpHandler, getPublicOrigin, withMcpAuth } from "mcp-handler";
import { verificarToken } from "@/lib/mcp/auth";
import { fijarOrigen, INSTRUCCIONES, registrarHerramientas } from "@/lib/mcp/servidor";

// Conector MCP de Tereza (Streamable HTTP). Solo valida tokens del servidor OAuth de Supabase; nunca los emite.
export const maxDuration = 60;

const handler = createMcpHandler(registrarHerramientas, {
  serverInfo: { name: "Tereza", version: "1.0.0" },
  instructions: INSTRUCCIONES,
});

const conAuth = withMcpAuth(handler, verificarToken, { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource" });

const limitado = async (req: Request) => {
  if (Number(req.headers.get("content-length") ?? 0) > 64 * 1024) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
  fijarOrigen(getPublicOrigin(req));
  return conAuth(req);
};

export { limitado as GET, limitado as POST, limitado as DELETE };
