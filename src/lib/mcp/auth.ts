import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { SUPABASE_URL } from "@/lib/env";

// Tokens del servidor OAuth 2.1 de Supabase: JWT firmados con la llave asimétrica del proyecto (ES256).
// El MCP solo los valida; nunca los emite. Sin service role: cada herramienta usa el token del usuario y RLS aplica.
const ISSUER = `${SUPABASE_URL}/auth/v1`;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const llaves = () => (jwks ??= createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`), { cacheMaxAge: 10 * 60_000 }));

export async function verificarToken(_req: Request, bearer?: string): Promise<AuthInfo | undefined> {
  if (!bearer) return undefined;
  try {
    const { payload } = await jwtVerify(bearer, llaves(), { issuer: ISSUER, audience: "authenticated" });
    // Solo tokens emitidos a un cliente OAuth (traen client_id): una sesión del navegador no sirve aquí.
    if (typeof payload.client_id !== "string" || !payload.client_id || typeof payload.sub !== "string") return undefined;
    return {
      token: bearer,
      clientId: payload.client_id,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ").filter(Boolean) : [],
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      extra: { userId: payload.sub, email: typeof payload.email === "string" ? payload.email : "" },
    };
  } catch {
    return undefined;
  }
}
